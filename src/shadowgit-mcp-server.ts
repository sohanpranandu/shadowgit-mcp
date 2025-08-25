#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================================================
// Constants
// ============================================================================

const SHADOWGIT_DIR = '.shadowgit.git';
const TIMEOUT_MS = 10000; // 10 seconds
const MAX_BUFFER_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// Type Definitions
// ============================================================================

interface Repository {
  name: string;
  path: string;
}

interface GitCommandArgs {
  repo: string;
  command: string;
}

// The actual response format expected by MCP
type MCPToolResponse = {
  content: Array<{
    type: string;
    text: string;
  }>;
};

// ============================================================================
// Logging
// ============================================================================

const log = (message: string): void => {
  process.stderr.write(`[shadowgit-mcp] ${message}\n`);
};

// ============================================================================
// Utility Functions
// ============================================================================

function getStorageLocation(): string {
  const platform = process.platform;
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'darwin':
      return path.join(homeDir, '.shadowgit');
    case 'win32':
      return path.join(
        process.env.LOCALAPPDATA || path.join(homeDir, 'AppData', 'Local'),
        'shadowgit'
      );
    default:
      return path.join(
        process.env.XDG_DATA_HOME || path.join(homeDir, '.local', 'share'),
        'shadowgit'
      );
  }
}

function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    log(`Error reading JSON file ${filePath}: ${error}`);
    return defaultValue;
  }
}

function getShadowgitPath(repoPath: string): string {
  return path.join(repoPath, SHADOWGIT_DIR);
}

function getGitEnvironment(repoPath: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GIT_DIR: getShadowgitPath(repoPath),
    GIT_WORK_TREE: repoPath,
  };
}

// ============================================================================
// MCP Server Class
// ============================================================================

class ShadowGitMCPServer {
  private server: Server;
  private repos: Map<string, string> = new Map(); // name -> path mapping
  
  // Whitelist of safe read-only git commands
  private readonly SAFE_COMMANDS = new Set([
    'log', 'diff', 'show', 'blame', 'grep', 'status',
    'rev-parse', 'rev-list', 'ls-files', 'cat-file',
    'diff-tree', 'shortlog', 'reflog', 'describe',
    'branch', 'tag', 'for-each-ref', 'ls-tree',
    'merge-base', 'cherry', 'count-objects'
  ]);
  
  // Dangerous arguments to block
  private readonly BLOCKED_ARGS = [
    '--exec', '--upload-pack', '--receive-pack',
    '-c', '--config', '--work-tree', '--git-dir',
    'push', 'pull', 'fetch', 'commit', 'merge',
    'rebase', 'reset', 'clean', 'checkout', 'add',
    'rm', 'mv', 'restore', 'stash'
  ];

  constructor() {
    this.server = new Server(
      {
        name: 'shadowgit-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );
    
    this.loadRepositories();
    this.setupHandlers();
  }

  private loadRepositories(): void {
    const reposPath = path.join(getStorageLocation(), 'repos.json');
    const repos: Repository[] = readJsonFile(reposPath, []);
    
    // Create name -> path mapping (avoid duplicate path entries)
    repos.forEach((repo: Repository) => {
      this.repos.set(repo.name, repo.path);
    });
    
    log(`Loaded ${repos.length} repositories from ${reposPath}`);
  }

  private isGitCommandArgs(args: unknown): args is GitCommandArgs {
    return (
      typeof args === 'object' &&
      args !== null &&
      'repo' in args &&
      'command' in args &&
      typeof (args as GitCommandArgs).repo === 'string' &&
      typeof (args as GitCommandArgs).command === 'string'
    );
  }

  private setupHandlers(): void {
    // Register available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'git',
          description: `Execute read-only git commands on a specific ShadowGit repository.
          
IMPORTANT: You MUST specify which repository to query.
Use list_repos() first to see available repositories.

Example usage:
- git({repo: "shadowgit-app", command: "log --oneline -5"})
- git({repo: "/Users/alex/project", command: "diff HEAD~1 HEAD"})`,
          
          inputSchema: {
            type: 'object',
            properties: {
              repo: {
                type: 'string',
                description: 'Repository name (from list_repos) or full path - REQUIRED'
              },
              command: {
                type: 'string',
                description: 'Git command to execute (read-only commands only) - REQUIRED'
              }
            },
            required: ['repo', 'command']  // Both parameters are required
          }
        },
        {
          name: 'list_repos',
          description: 'List all available ShadowGit repositories. Call this first to discover available repositories.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'git':
          return await this.handleGit(args);
        case 'list_repos':
          return await this.handleListRepos();
        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${name}`
              }
            ]
          };
      }
    });
  }

  private async handleGit(args: unknown): Promise<MCPToolResponse> {
    // Type guard for arguments
    if (!this.isGitCommandArgs(args)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Both 'repo' and 'command' parameters are required.

Example usage:
  git({repo: "my-project", command: "log --oneline -5"})

Use list_repos() to see available repositories.`
          }
        ]
      };
    }
    
    // Now args is properly typed as GitCommandArgs
    const repoPath = this.resolveRepoPath(args.repo);
    
    if (!repoPath) {
      const availableRepos = Array.from(this.repos.keys())
        .filter(key => !key.startsWith('/')) // Only show names, not full paths
        .join(', ');
      
      return {
        content: [
          {
            type: 'text',
            text: `Error: Repository '${args.repo}' not found.

Available repositories: ${availableRepos || '(none)'}

Use list_repos() for full details, or provide the full path to the repository.`
          }
        ]
      };
    }
    
    // Use existing getShadowgitPath utility instead of hardcoding
    const shadowGitDir = getShadowgitPath(repoPath);
    if (!fileExists(shadowGitDir)) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: No ShadowGit repository found at ${repoPath}

The directory exists but doesn't have a ${SHADOWGIT_DIR} folder.
This repository may not be tracked by ShadowGit yet.`
          }
        ]
      };
    }
    
    // Execute git command
    const result = await this.executeGit(args.command, repoPath);
    
    return {
      content: [
        {
          type: 'text',
          text: result
        }
      ]
    };
  }

  private async handleListRepos(): Promise<MCPToolResponse> {
    if (this.repos.size === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No repositories found. Add repositories through the ShadowGit application.'
          }
        ]
      };
    }
    
    // Format repository list (simple and clean)
    const repoList = Array.from(this.repos.entries())
      .map(([name, path]) => `• ${name}\n  Path: ${path}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Available ShadowGit repositories:\n\n${repoList.join('\n\n')}`
        }
      ]
    };
  }

  private resolveRepoPath(repoNameOrPath: string): string | null {
    // First check if it's a known repo name or path
    const mappedPath = this.repos.get(repoNameOrPath);
    if (mappedPath) return mappedPath;
    
    // Check if it's a valid path that exists
    if (repoNameOrPath.startsWith('/') || repoNameOrPath.startsWith('~')) {
      const resolvedPath = repoNameOrPath.replace('~', os.homedir());
      if (fileExists(resolvedPath)) {
        return resolvedPath;
      }
    }
    
    return null;
  }

  private async executeGit(command: string, repoPath: string): Promise<string> {
    // Safety check 1: Extract and validate command
    const parts = command.trim().split(/\s+/);
    const gitCommand = parts[0];
    
    if (!this.SAFE_COMMANDS.has(gitCommand)) {
      return `Error: Command '${gitCommand}' is not allowed. Only read-only commands are permitted.

Allowed commands: ${Array.from(this.SAFE_COMMANDS).join(', ')}`;
    }
    
    // Safety check 2: Block dangerous arguments
    for (const blocked of this.BLOCKED_ARGS) {
      if (command.includes(blocked)) {
        return `Error: Argument '${blocked}' is not allowed for safety reasons.`;
      }
    }
    
    // Execute git command with proper environment
    try {
      const output = execSync(`git ${command}`, {
        cwd: repoPath,
        env: getGitEnvironment(repoPath),
        encoding: 'utf8',
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_SIZE
      });
      
      return output || '(empty output)';
      
    } catch (error: any) {
      // Handle specific error cases
      if (error.code === 'ENOENT') {
        return 'Error: Git is not installed or not in PATH.';
      }
      if (error.signal === 'SIGTERM') {
        return 'Error: Command timed out (10 second limit).';
      }
      if (error.status === 128) {
        return `Git error: ${error.stderr || error.message}`;
      }
      
      // Generic error
      return `Error executing git command: ${error.message}`;
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log(`Server started with ${this.repos.size} repositories`);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main(): Promise<void> {
  const server = new ShadowGitMCPServer();
  await server.start();
}

// Run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  });
}

export { ShadowGitMCPServer };
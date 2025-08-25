import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ShadowGitMCPServer } from '../src/shadowgit-mcp-server';

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn()
}));

// Mock os
jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/testuser')
}));

describe('ShadowGitMCPServer', () => {
  let server: ShadowGitMCPServer;
  let mockExecSync: jest.Mock;
  let mockExistsSync: jest.Mock;
  let mockReadFileSync: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get mock references
    const childProcess = require('child_process');
    const fs = require('fs');
    mockExecSync = childProcess.execSync as jest.Mock;
    mockExistsSync = fs.existsSync as jest.Mock;
    mockReadFileSync = fs.readFileSync as jest.Mock;
    
    // Setup default mock behaviors
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify([
      { name: 'test-repo', path: '/test/repo' },
      { name: 'another-repo', path: '/another/repo' }
    ]));
    
    // Create server instance
    server = new ShadowGitMCPServer();
  });

  describe('Security Tests', () => {
    it('should block write commands', async () => {
      const dangerousCommands = [
        'commit', 'push', 'pull', 'merge', 'rebase',
        'reset', 'clean', 'checkout', 'add', 'rm', 'mv'
      ];
      
      for (const cmd of dangerousCommands) {
        // @ts-ignore - accessing private method for testing
        const result = await server.executeGit(cmd, '/test/repo');
        expect(result).toContain('not allowed');
        expect(mockExecSync).not.toHaveBeenCalled();
      }
    });

    it('should block dangerous arguments', async () => {
      const dangerousArgs = [
        'log --exec=rm -rf /',
        'log -c core.editor=vim',
        'log --work-tree=/other/path',
        'log --git-dir=/other/git'
      ];
      
      for (const args of dangerousArgs) {
        // @ts-ignore - accessing private method for testing
        const result = await server.executeGit(args, '/test/repo');
        expect(result).toContain('not allowed');
        expect(mockExecSync).not.toHaveBeenCalled();
      }
    });

    it('should allow safe read-only commands', async () => {
      const safeCommands = [
        'log --oneline -5',
        'diff HEAD~1 HEAD',
        'show abc123',
        'blame file.txt',
        'grep pattern',
        'status',
        'branch --list',
        'tag --list'
      ];
      
      mockExecSync.mockReturnValue('mock output');
      
      for (const cmd of safeCommands) {
        // @ts-ignore - accessing private method for testing
        const result = await server.executeGit(cmd, '/test/repo');
        expect(result).not.toContain('not allowed');
        expect(result).not.toContain('Error');
      }
    });
  });

  describe('Repository Management', () => {
    it('should load repositories from config', async () => {
      // @ts-ignore - accessing private method for testing
      const repos = await server.handleListRepos();
      expect(repos.content[0].text).toContain('test-repo');
      expect(repos.content[0].text).toContain('another-repo');
    });

    it('should resolve repository by name', () => {
      // @ts-ignore - accessing private method for testing
      const path = server.resolveRepoPath('test-repo');
      expect(path).toBe('/test/repo');
    });

    it('should resolve repository by path', () => {
      mockExistsSync.mockReturnValue(true);
      // @ts-ignore - accessing private method for testing
      const path = server.resolveRepoPath('/test/repo');
      expect(path).toBe('/test/repo');
    });

    it('should return null for non-existent repository', () => {
      // @ts-ignore - accessing private method for testing
      const path = server.resolveRepoPath('non-existent');
      expect(path).toBeNull();
    });
  });

  describe('Git Command Execution', () => {
    it('should require repo parameter', async () => {
      // @ts-ignore - accessing private method for testing
      const result = await server.handleGit({ command: 'log' });
      expect(result.content[0].text).toContain('required');
    });

    it('should require command parameter', async () => {
      // @ts-ignore - accessing private method for testing
      const result = await server.handleGit({ repo: 'test-repo' });
      expect(result.content[0].text).toContain('required');
    });

    it('should check for .shadowgit.git directory', async () => {
      mockExistsSync.mockImplementation((path: unknown) => {
        if (typeof path === 'string' && path.includes('.shadowgit.git')) return false;
        return true;
      });
      
      // @ts-ignore - accessing private method for testing
      const result = await server.handleGit({ 
        repo: 'test-repo', 
        command: 'log' 
      });
      expect(result.content[0].text).toContain('No ShadowGit repository found');
    });

    it('should execute valid git commands', async () => {
      mockExecSync.mockReturnValue('commit abc123\ncommit def456');
      mockExistsSync.mockReturnValue(true);
      
      // @ts-ignore - accessing private method for testing
      const result = await server.handleGit({ 
        repo: 'test-repo', 
        command: 'log --oneline' 
      });
      expect(result.content[0].text).toContain('abc123');
      expect(mockExecSync).toHaveBeenCalledWith(
        'git log --oneline',
        expect.objectContaining({
          cwd: '/test/repo',
          encoding: 'utf8'
        })
      );
    });

    it('should handle git command errors gracefully', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Git error');
        error.status = 128;
        error.stderr = 'fatal: bad revision';
        throw error;
      });
      
      // @ts-ignore - accessing private method for testing
      const result = await server.executeGit('log', '/test/repo');
      expect(result).toContain('Git error');
      expect(result).not.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockExecSync.mockImplementation(() => {
        const error: any = new Error('Timeout');
        error.signal = 'SIGTERM';
        throw error;
      });
      
      // @ts-ignore - accessing private method for testing
      const result = await server.executeGit('log', '/test/repo');
      expect(result).toContain('timed out');
    });
  });

  describe('Environment Setup', () => {
    it('should set correct git environment variables', async () => {
      mockExecSync.mockReturnValue('output');
      mockExistsSync.mockReturnValue(true);
      
      // @ts-ignore - accessing private method for testing
      await server.handleGit({ 
        repo: 'test-repo', 
        command: 'log' 
      });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          env: expect.objectContaining({
            GIT_DIR: '/test/repo/.shadowgit.git',
            GIT_WORK_TREE: '/test/repo'
          })
        })
      );
    });

    it('should enforce 10 second timeout', async () => {
      mockExecSync.mockReturnValue('output');
      mockExistsSync.mockReturnValue(true);
      
      // @ts-ignore - accessing private method for testing
      await server.handleGit({ 
        repo: 'test-repo', 
        command: 'log' 
      });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10000
        })
      );
    });

    it('should limit output to 10MB', async () => {
      mockExecSync.mockReturnValue('output');
      mockExistsSync.mockReturnValue(true);
      
      // @ts-ignore - accessing private method for testing
      await server.handleGit({ 
        repo: 'test-repo', 
        command: 'log' 
      });
      
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxBuffer: 10 * 1024 * 1024
        })
      );
    });
  });
});
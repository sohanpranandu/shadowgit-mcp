# ShadowGit MCP Server

[![npm version](https://badge.fury.io/js/shadowgit-mcp-server.svg)](https://badge.fury.io/js/shadowgit-mcp-server)

A Model Context Protocol (MCP) server that provides AI assistants with secure, read-only access to your ShadowGit repositories. This enables powerful debugging and code analysis capabilities by giving AI access to your project's fine-grained git history.

## What is ShadowGit?

[ShadowGit](https://shadowgit.com) automatically captures every save as a git commit, creating a detailed history of your development process. The MCP server makes this history available to AI assistants for analysis.

## Installation

```bash
npm install -g shadowgit-mcp-server
```

## Setup with Claude Code

```bash
# Add to Claude Code
claude mcp add shadowgit -- shadowgit-mcp-server

# Restart Claude Code to load the server
```

## Setup with Claude Desktop

Add to your Claude Desktop MCP configuration:

**macOS/Linux:** `~/.config/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shadowgit": {
      "command": "shadowgit-mcp-server"
    }
  }
}
```

## Requirements

- **Node.js 18+**
- **ShadowGit app** installed and running with tracked repositories
- **Git** available in PATH

## Available Commands

### `list_repos()`
Lists all ShadowGit-tracked repositories.

```javascript
await shadowgit.list_repos()
```

### `git({repo, command})`
Executes read-only git commands on a specific repository.

```javascript
// View recent commits
await shadowgit.git({
  repo: "my-project",
  command: "log --oneline -10"
})

// Check what changed recently
await shadowgit.git({
  repo: "my-project", 
  command: "diff HEAD~5 HEAD --stat"
})

// Find who changed a specific line
await shadowgit.git({
  repo: "my-project",
  command: "blame src/auth.ts"
})
```

## Security

- **Read-only access**: Only safe git commands are allowed
- **No write operations**: Commands like `commit`, `push`, `merge` are blocked
- **Repository validation**: Only ShadowGit repositories can be accessed
- **Command filtering**: Dangerous arguments are blocked

## Example Use Cases

### Debug Recent Changes
```javascript
// Find what broke in the last hour
await shadowgit.git({
  repo: "my-app",
  command: "log --since='1 hour ago' --oneline"
})
```

### Trace Code Evolution
```javascript
// See how a function evolved
await shadowgit.git({
  repo: "my-app", 
  command: "log -L :functionName:src/file.ts"
})
```

### Cross-Repository Analysis
```javascript
// Compare activity across projects
const repos = await shadowgit.list_repos()
for (const repo of repos) {
  await shadowgit.git({
    repo: repo.name,
    command: "log --since='1 day ago' --oneline"
  })
}
```

## Troubleshooting

### No repositories found
- Ensure ShadowGit app is installed and has tracked repositories
- Check that `~/.shadowgit/repos.json` exists

### Repository not found
- Use `list_repos()` to see exact repository names
- Ensure the repository has a `.shadowgit.git` directory

### Git commands fail
- Verify git is installed: `git --version`
- Only read-only commands are allowed
- Use absolute paths or repository names from `list_repos()`

## Development

```bash
# Clone and setup
git clone https://github.com/yourusername/shadowgit-mcp-server.git
cd shadowgit-mcp-server
npm install

# Build
npm run build

# Test
npm test

# Run locally
npm run dev
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [ShadowGit](https://shadowgit.com) - Automatic code snapshot tool
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol TypeScript SDK

---

Transform your development history into a powerful AI debugging assistant! 🚀
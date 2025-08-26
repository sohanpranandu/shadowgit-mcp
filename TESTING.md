# Testing Guide for ShadowGit MCP Server

This guide walks you through testing the ShadowGit MCP server with Claude Code and Claude Desktop after installing from npm.

## Prerequisites

Before testing, ensure you have:

1. **ShadowGit app** installed and running with at least one repository tracked
2. **shadowgit-mcp-server** installed globally from npm
3. **Claude Code CLI** or **Claude Desktop** installed
4. **Git** available in your PATH

## Installation

```bash
# Install the MCP server globally from npm
npm install -g shadowgit-mcp-server

# Verify installation
shadowgit-mcp-server --version
# or test it starts correctly (Ctrl+C to exit)
shadowgit-mcp-server
```

## Testing with Claude Code

### 1. Configure MCP Server

```bash
# Add the ShadowGit MCP server to Claude Code
claude mcp add shadowgit -- shadowgit-mcp-server

# Verify configuration
claude mcp list
# Should show: shadowgit

# Get details
claude mcp get shadowgit
```

### 2. Restart Claude Code

```bash
# Exit current session
exit

# Start new session
claude
```

### 3. Test Basic Commands

In Claude Code, try these commands:

```
"Can you list my ShadowGit repositories?"
```

Expected: Claude uses `shadowgit.list_repos()` and shows your repositories.

```
"Show me the last 5 commits in [your-repo-name]"
```

Expected: Claude uses `shadowgit.git({repo: "your-repo", command: "log --oneline -5"})`.

## Testing with Claude Desktop

### 1. Configure MCP Server

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "shadowgit": {
      "command": "shadowgit-mcp-server"
    }
  }
}
```

### 2. Restart Claude Desktop

Completely quit and restart Claude Desktop to load the MCP server.

### 3. Test in Claude Desktop

Ask Claude questions like:
- "What ShadowGit repositories do I have?"
- "Show me recent commits in my project"
- "What changed in the last hour?"

## Test Scenarios

### Basic Discovery
```
User: "List my ShadowGit repositories"
```
Expected: Claude shows all your tracked repositories.

### Recent Changes
```
User: "What changed in [repo-name] today?"
```
Expected: Claude queries commits from today.

### Debugging Help
```
User: "Something broke in the last hour, can you help?"
```
Expected: Claude examines recent commits to identify potential issues.

### Code Evolution
```
User: "How has [filename] evolved over time?"
```
Expected: Claude traces the file's history.

## Expected MCP Commands

During testing, you should see Claude using:

```javascript
// List repositories
shadowgit.list_repos()

// Query git history
shadowgit.git({
  repo: "repository-name",
  command: "log --oneline -10"
})

// Check status
shadowgit.git({
  repo: "repository-name",
  command: "status"
})

// View diffs
shadowgit.git({
  repo: "repository-name",
  command: "diff HEAD~1 HEAD"
})
```

## Troubleshooting

### MCP Server Not Found

**Problem:** Claude says it doesn't have access to shadowgit commands.

**Solutions:**
1. Verify global installation: `which shadowgit-mcp-server`
2. Check MCP configuration: `claude mcp list`
3. Restart Claude Code/Desktop completely
4. Try removing and re-adding: 
   ```bash
   claude mcp remove shadowgit
   claude mcp add shadowgit -- shadowgit-mcp-server
   ```

### No Repositories Found

**Problem:** `list_repos()` returns empty.

**Solutions:**
1. Check ShadowGit app has repositories tracked
2. Verify `~/.shadowgit/repos.json` exists and has content
3. Test MCP server manually: `shadowgit-mcp-server` (should show loading message)

### Command Not Allowed

**Problem:** Git commands return "not allowed" error.

**Solutions:**
1. Only read-only commands are permitted
2. Check the command doesn't contain blocked arguments
3. See README for list of allowed commands

### Permission Errors

**Problem:** "EACCES" or permission denied errors.

**Solutions:**
1. Check npm global installation permissions
2. Verify `~/.shadowgit/` directory is readable
3. Try reinstalling with proper permissions:
   ```bash
   npm uninstall -g shadowgit-mcp-server
   sudo npm install -g shadowgit-mcp-server
   ```

## Verifying Success

Your setup is working correctly when:

✅ Claude can list your ShadowGit repositories  
✅ Claude can execute git commands on your repos  
✅ Claude blocks write operations appropriately  
✅ Claude can query multiple repositories  
✅ Error messages are clear and helpful  

## Advanced Testing

### Performance Testing
```
User: "Show me all commits from the last week with statistics"
```
Should complete within 10 seconds.

### Multi-Repository Testing
```
User: "Compare activity across all my projects today"
```
Should query each repository efficiently.

### Security Testing
```
User: "Can you commit these changes?"
```
Should be rejected with explanation about read-only access.

## Getting Help

If you encounter issues:

1. Check the npm package version: `npm list -g shadowgit-mcp-server`
2. Update to latest: `npm update -g shadowgit-mcp-server`
3. Review server output when running manually
4. Check Claude Code MCP documentation
5. File issues on the GitHub repository

## Summary

The ShadowGit MCP server transforms your development history into a powerful debugging tool. Once properly configured, it provides seamless integration between your ShadowGit repositories and AI assistants, enabling advanced code analysis and debugging workflows.
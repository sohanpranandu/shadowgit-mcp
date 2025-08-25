# Deployment Guide for shadowgit-mcp-server

## Package Structure

```
shadowgit-mcp-server/
├── src/
│   └── shadowgit-mcp-server.ts    # Main MCP server source
├── tests/
│   └── shadowgit-mcp-server.test.ts # Test suite
├── dist/
│   ├── shadowgit-mcp-server.js    # Built executable
│   └── shadowgit-mcp-server.d.ts  # TypeScript declarations
├── package.json                   # Package configuration
├── tsconfig.json                 # TypeScript config
├── jest.config.js               # Test configuration
├── README.md                    # Documentation
├── LICENSE                      # MIT license
├── .npmignore                   # Files to exclude from npm
├── .gitignore                   # Git ignore rules
└── test-package.js             # Package validation script

Generated:
├── node_modules/               # Dependencies
├── shadowgit-mcp-server-1.0.0.tgz # Package tarball
└── coverage/                   # Test coverage (if tests run)
```

## User Installation Process

Once published, users can install with:

```bash
# Global installation
npm install -g shadowgit-mcp-server

# Configure Claude Code  
claude mcp add shadowgit -- shadowgit-mcp-server

# Configure Claude Desktop (add to claude_desktop_config.json)
{
  "mcpServers": {
    "shadowgit": {
      "command": "shadowgit-mcp-server"
    }
  }
}
```

## Version Management

### Updating the Package
```bash
# Bump version (patch/minor/major)
npm version patch

# Publish new version
npm publish
```

### Version History
- `1.0.0` - Initial release with core MCP functionality

## Maintenance

### Dependencies to Monitor
- `@modelcontextprotocol/sdk` - Core MCP functionality
- `@types/node` - Node.js type definitions  

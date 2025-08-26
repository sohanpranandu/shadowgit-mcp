# Deployment Guide for shadowgit-mcp-server

## 📦 Publication Status

✅ **Package Published to npm** (Public Registry)
- Package name: `shadowgit-mcp-server`
- Current version: 1.0.0
- Registry: https://www.npmjs.com/package/shadowgit-mcp-server
- GitHub repository: Private (https://github.com/shadowgit/shadowgit-mcp-server)

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

Users can now install the published package:

```bash
# Global installation from public npm registry
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

### Publishing Updates
```bash
# 1. Update version
npm version patch  # for bug fixes (1.0.0 -> 1.0.1)
npm version minor  # for new features (1.0.0 -> 1.1.0)
npm version major  # for breaking changes (1.0.0 -> 2.0.0)

# 2. Build and test
npm run build
npm test

# 3. Publish to npm
npm publish

# 4. Verify on npm
open https://www.npmjs.com/package/shadowgit-mcp-server
```

### Version History
- `1.0.0` - Initial public release
  - Read-only git access to ShadowGit repositories
  - Security hardening and input validation
  - Enhanced error handling and logging
  - Cross-platform support
  - Production-ready TypeScript implementation

## Maintenance

### Dependencies to Monitor
- `@modelcontextprotocol/sdk` - Core MCP functionality
- `@types/node` - Node.js type definitions

### Regular Tasks
- Check for security updates: `npm audit`
- Update dependencies: `npm update`
- Monitor GitHub issues and npm feedback
- Test with new Claude/Cursor releases
- Review download statistics on npm

## Distribution Benefits (Achieved)

✅ **Public npm Package Advantages:**
- Simple one-line installation: `npm install -g shadowgit-mcp-server`
- No authentication required for installation
- Automatic dependency management
- Version updates via `npm update -g`
- Discoverable on npmjs.com
- Clean global command available
- Independent from ShadowGit app updates  

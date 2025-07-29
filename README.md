# MCP OAuth Framework

**The "Rails for MCP OAuth"** - Build OAuth-enabled MCP servers in minutes, not hours.

[![npm version](https://badge.fury.io/js/@sg20%2Fmcp-oauth-framework.svg)](https://www.npmjs.com/package/@sg20/mcp-oauth-framework)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Transform 200+ lines of OAuth boilerplate into 20 lines of clean, production-ready code.

## ⚡ Quick Start (2 Minutes)

```bash
npm install @sg20/mcp-oauth-framework
```

**Create a GitHub MCP Server:**

```typescript
import { BaseMCPServer } from '@sg20/mcp-oauth-framework/base';

class GitHubServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'github-server',
      version: '1.0.0',
      providers: [{
        name: 'github',
        clientId: process.env.GITHUB_CLIENT_ID!,
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scope: ['repo', 'user:email']
      }]
    });
  }

  async initialize() {
    this.addTool({
      name: 'list-repos',
      description: 'List user repositories',
      auth: { required: true, provider: 'github' },
      handler: async () => {
        const response = await this.makeAuthenticatedRequest(
          'github', 
          'https://api.github.com/user/repos'
        );
        return response.json();
      }
    });
  }
}

new GitHubServer().start();
```

**That's it!** You now have a fully functional OAuth-enabled MCP server with:
- ✅ Secure PKCE OAuth 2.0 flow
- ✅ Automatic token management  
- ✅ Browser-based authentication
- ✅ Production-ready error handling

## 🎯 Why This Framework?

### ❌ **Without Framework** (The Hard Way)
```typescript
// 200+ lines of OAuth boilerplate:
// - PKCE implementation
// - Token storage & encryption  
// - Browser flow management
// - Token refresh logic
// - Error handling
// - Security validation
// - MCP integration
// ... and much more
```

### ✅ **With Framework** (The Easy Way)
```typescript
// 20 lines of clean code:
class MyServer extends BaseMCPServer {
  constructor() {
    super({ providers: [oauthProvider] });
  }
  async initialize() {
    this.addTool(/* your tool */);
  }
}
```

**Result: 90% less code, 100% more reliability**

## 🚀 Complete Example: GitHub MCP Server

See our [complete GitHub server example](./examples/github-server/) that demonstrates:

- **15 GitHub API tools** - repos, issues, PRs, files, search
- **Production-ready** - full error handling, validation, logging
- **2-minute setup** - simple `.env` configuration
- **Real OAuth flow** - works with Claude Desktop out of the box

### Live Example Usage

**User:** "List my GitHub repositories"

**What happens:**
1. 🌐 Browser opens to GitHub OAuth page
2. ✅ User clicks "Authorize"
3. 🔄 Tokens stored securely locally
4. 📋 Repository list appears in Claude
5. 🚀 **Next time: instant results** (no browser needed)

## 🏗️ Framework Architecture

### Core Modules

```
@sg20/mcp-oauth-framework/
├── base              # MCP server foundation
│   ├── BaseMCPServer # Abstract base class
│   └── ToolRegistry  # Tool management with auth
├── auth              # OAuth implementation  
│   ├── AuthManager   # Authentication orchestrator
│   ├── OAuthFlow     # PKCE browser flow
│   └── TokenStore    # Secure token storage
└── shared            # Common utilities
    ├── types         # TypeScript interfaces
    └── utils         # OAuth helpers & validation
```

### Security Features

- **🔐 PKCE Flow** - Proof Key for Code Exchange prevents code interception
- **🔒 Encrypted Storage** - Tokens encrypted with machine-specific keys
- **🔄 Auto Refresh** - Expired tokens refreshed automatically
- **✅ Scope Validation** - Tools validate required OAuth permissions
- **🛡️ Secure Defaults** - Minimal permissions, safe storage locations

## 📚 Framework API

### BaseMCPServer

The foundation for all OAuth-enabled MCP servers:

```typescript
class MyServer extends BaseMCPServer {
  constructor(options: BaseMCPServerOptions) {
    super(options);
  }

  // Required: Implement your server initialization
  async initialize(): Promise<void> {
    this.addTool({
      name: 'my-tool',
      description: 'My awesome tool',
      auth: { required: true, provider: 'github', scopes: ['repo'] },
      handler: async (params, context) => {
        // context.auth contains authenticated user info
        return await this.makeAuthenticatedRequest('github', '/api/endpoint');
      }
    });
  }

  // Required: Cleanup on shutdown
  async cleanup(): Promise<void> {
    // Your cleanup logic
  }
}
```

### Available Methods

```typescript
// Tool registration
protected addTool(definition: ToolDefinition): void

// Authenticated API requests
protected makeAuthenticatedRequest(
  provider: string, 
  url: string, 
  options?: RequestInit,
  requiredScopes?: string[]
): Promise<Response>

// Manual authentication
protected requireAuth(provider: string, scopes?: string[]): Promise<AuthenticatedRequest>

// Logging
protected log(message: string, level?: 'info' | 'warn' | 'error'): void
```

### OAuth Provider Configuration

```typescript
interface OAuthProvider {
  name: string;                    // Unique identifier (e.g., 'github')
  clientId: string;               // OAuth client ID
  clientSecret?: string;          // OAuth client secret (optional with PKCE)
  authorizationUrl: string;       // Authorization endpoint
  tokenUrl: string;              // Token exchange endpoint  
  scope: string[];               // Required OAuth scopes
  additionalParams?: Record<string, string>; // Extra parameters
}
```

### Tool Definition

```typescript
interface ToolDefinition {
  name: string;                   // Tool name (kebab-case)
  description: string;           // Tool description for users
  auth?: {                       // Authentication requirements
    required: boolean;
    provider?: string;           // OAuth provider name
    scopes?: string[];          // Required scopes
    message?: string;           // Custom auth prompt
  };
  handler: (params: any, context: RequestContext) => Promise<any>;
}
```

## 🛠️ Supported OAuth Providers

### Built-in Support

- **GitHub** - Repositories, issues, pull requests, files
- **Google** - Drive, Gmail, Calendar APIs
- **Microsoft** - Office 365, OneDrive, Teams  
- **Custom** - Easy to add any OAuth 2.0 provider

### Adding Custom Providers

```typescript
const customProvider: OAuthProvider = {
  name: 'my-service',
  clientId: process.env.MY_SERVICE_CLIENT_ID!,
  authorizationUrl: 'https://myservice.com/oauth/authorize',
  tokenUrl: 'https://myservice.com/oauth/token',
  scope: ['read', 'write'],
  additionalParams: {
    audience: 'https://myservice.com/api'
  }
};
```

## 🎮 Usage with Claude Desktop

### Simple Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/your/server/dist/index.js"]
    }
  }
}
```

**That's it!** The server automatically:
- ✅ Reads configuration from `.env` file
- ✅ Validates OAuth credentials
- ✅ Provides helpful error messages
- ✅ Handles authentication flow

### Environment Configuration

Create `.env` in your server directory:

```bash
# Required
GITHUB_CLIENT_ID=your_github_client_id

# Optional but recommended  
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: Enable debug logging
DEBUG=false
```

## 🏃‍♂️ Getting Started

### 1. Try the Example

The fastest way to understand the framework:

```bash
git clone https://github.com/swayamg20/mcp-framework.git
cd mcp-framework/examples/github-server

# Follow the 2-minute setup guide
cat SIMPLE-SETUP.md
```

### 2. Build Your Own Server

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @sg20/mcp-oauth-framework dotenv

# Create your server (see API examples above)
# Add to Claude Desktop config
# Start building amazing OAuth tools!
```

### 3. Join the Community

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Share your servers and get help
- **Examples** - Browse community-built servers
- **Contributing** - Help improve the framework

## 🔧 Advanced Usage

### Multi-Provider Servers

```typescript
class MultiServiceServer extends BaseMCPServer {
  constructor() {
    super({
      name: 'multi-service-server',
      version: '1.0.0',
      providers: [
        githubProvider,
        googleProvider,
        slackProvider
      ]
    });
  }
}
```

### Custom Tool Middleware

```typescript
this.addTool({
  name: 'advanced-tool',
  description: 'Tool with custom logic',
  auth: { required: true, provider: 'github', scopes: ['repo'] },
  handler: async (params, context) => {
    // Access authenticated user info
    const { tokens, user } = context.auth!;
    
    // Custom validation
    if (!user.email?.endsWith('@company.com')) {
      throw new Error('Only company users allowed');
    }
    
    // Make multiple authenticated requests
    const [repos, issues] = await Promise.all([
      this.makeAuthenticatedRequest('github', '/user/repos'),
      this.makeAuthenticatedRequest('github', '/issues')
    ]);
    
    return { repos: await repos.json(), issues: await issues.json() };
  }
});
```

### Error Handling

```typescript
try {
  const result = await this.makeAuthenticatedRequest('github', '/user/repos');
  return result.json();
} catch (error) {
  if (error.code === 'AUTHENTICATION_REQUIRED') {
    // User needs to re-authenticate
    throw new Error('Please re-authenticate with GitHub');
  }
  if (error.code === 'INSUFFICIENT_SCOPE') {
    // User needs more permissions
    throw new Error('Additional GitHub permissions required');
  }
  // Handle other errors
  throw error;
}
```

## 🚀 Production Deployment

### Environment Variables

```bash
# Required
GITHUB_CLIENT_ID=your_production_client_id

# Recommended for production
GITHUB_CLIENT_SECRET=your_production_client_secret

# Optional configuration
DEBUG=false
OAUTH_PORT=8080
OAUTH_HOST=localhost
OAUTH_CALLBACK_PATH=/oauth/callback
```

### Security Best Practices

- ✅ **Use HTTPS in production** - Configure proper callback URLs
- ✅ **Validate all inputs** - Framework provides validation helpers
- ✅ **Monitor token usage** - Implement logging and monitoring
- ✅ **Regular security updates** - Keep dependencies updated
- ✅ **Never commit secrets** - Always use environment variables

### Performance Tips

- 🚀 **Token reuse** - Framework automatically caches valid tokens
- 🚀 **Concurrent requests** - Use `Promise.all()` for parallel API calls
- 🚀 **Scope optimization** - Request only necessary permissions
- 🚀 **Error recovery** - Implement retry logic for transient failures

## 📖 Documentation

- **[GitHub Server Example](./examples/github-server/)** - Production-ready implementation
- **[Simple Setup Guide](./examples/github-server/SIMPLE-SETUP.md)** - 2-minute setup
- **[Usage Guide](./USAGE_GUIDE.md)** - Comprehensive tutorial

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with tests and documentation
4. **Submit a pull request**

### Development Setup

```bash
git clone https://github.com/swayamg20/mcp-framework.git
cd mcp-framework
npm install
npm run build
npm test
```

### Adding New OAuth Providers

1. Add provider configuration to types
2. Implement user info normalization  
3. Add example usage
4. Update documentation
5. Submit PR with tests

## 📊 Framework Stats

- **🏗️ Architecture**: Modular, extensible, type-safe
- **🔒 Security**: PKCE, encrypted storage, scope validation
- **📝 Code Reduction**: 90% less OAuth boilerplate
- **⚡ Performance**: Automatic token caching and refresh
- **🧪 Testing**: Comprehensive test suite
- **📚 Documentation**: Complete API reference and examples


## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support & Community

- **🐛 Bug Reports**: [GitHub Issues](https://github.com/swayamg20/mcp-framework/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/swayamg20/mcp-framework/discussions) 
- **📚 Documentation**: Complete guides and API reference included
- **💡 Feature Requests**: Submit ideas via GitHub Issues

---

**Ready to build OAuth-enabled MCP servers in minutes instead of hours?**

🚀 **[Try the GitHub Example](./examples/github-server/)** 

---

*Made with ❤️ for the MCP community. Empowering developers to build amazing AI integrations.*
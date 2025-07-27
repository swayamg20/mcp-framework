# MCP OAuth Framework Usage Guide

## Overview

The MCP OAuth Framework enables developers to build OAuth-enabled MCP (Model Context Protocol) servers with minimal boilerplate. Instead of writing 200+ lines of OAuth code, developers can focus on their API tools and let the framework handle authentication.

## Target Audience

- **Third-party developers** building MCP servers that need OAuth authentication
- **End users** who want to use OAuth-enabled MCP servers with their favorite AI tools

## Core Concepts

### 1. OAuth Providers
Configure OAuth providers (GitHub, Google, etc.) with minimal setup:

```typescript
import { OAuthProvider } from '@mcp-oauth/framework';

const githubProvider: OAuthProvider = {
  name: 'github',
  clientId: 'your-github-client-id',
  clientSecret: 'your-github-client-secret', // Optional for public clients
  authorizationUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scope: ['repo', 'user:email'],
  additionalParams: {
    allow_signup: 'false'
  }
};
```

### 2. Authentication Flow
The framework handles the complete OAuth 2.0 flow with PKCE security:

1. **User initiates**: MCP server starts OAuth flow
2. **Browser opens**: Authorization URL opens automatically
3. **User authorizes**: Grants permissions on provider's site
4. **Callback handled**: Framework receives authorization code
5. **Tokens exchanged**: Access tokens stored securely
6. **Tools available**: Authenticated API calls can proceed

### 3. Tool-Level Authentication
Control which tools require authentication:

```typescript
import { ToolAuthRequirement } from '@mcp-oauth/framework';

const authRequirement: ToolAuthRequirement = {
  required: true,
  scopes: ['repo'],
  provider: 'github',
  message: 'This tool requires GitHub access to manage repositories'
};
```

## Developer Workflow

### Step 1: Install the Framework

```bash
npm install @mcp-oauth/framework
```

### Step 2: Create Your MCP Server

```typescript
import { BaseMCPServer, OAuthProvider } from '@mcp-oauth/framework/base';

class GitHubServer extends BaseMCPServer {
  constructor() {
    const githubProvider: OAuthProvider = {
      name: 'github',
      clientId: process.env.GITHUB_CLIENT_ID!,
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: ['repo', 'user:email']
    };

    super({
      providers: [githubProvider],
      port: 8080
    });

    this.registerTools();
  }

  private registerTools() {
    // Register your GitHub API tools here
    this.addTool({
      name: 'list-repos',
      description: 'List user repositories',
      auth: { required: true, scopes: ['repo'] },
      handler: this.listRepositories.bind(this)
    });
  }

  private async listRepositories(params: any, context: RequestContext) {
    const { auth } = context;
    if (!auth) throw new Error('Authentication required');

    // Make authenticated GitHub API call
    const response = await fetch('https://api.github.com/user/repos', {
      headers: {
        'Authorization': `Bearer ${auth.tokens.accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return await response.json();
  }
}

// Start the server
const server = new GitHubServer();
server.start();
```

### Step 3: Configure OAuth Application

1. **GitHub**: Go to Settings → Developer settings → OAuth Apps
2. **Create new app** with these settings:
   - Application name: "Your MCP Server"
   - Homepage URL: "http://localhost:8080"
   - Authorization callback URL: "http://localhost:8080/oauth/callback"
3. **Copy credentials** to your environment variables

### Step 4: Run Your Server

```bash
GITHUB_CLIENT_ID=your_client_id node dist/server.js
```

## End User Experience

### Installing an OAuth-Enabled MCP Server

```bash
# Install a community GitHub server
npm install -g @community/github-mcp-server

# Run it (OAuth flow starts automatically)
github-mcp-server
```

### Authentication Flow

1. **Server starts**: `github-mcp-server` command launches
2. **Browser opens**: GitHub authorization page appears
3. **User authorizes**: Click "Authorize application"
4. **Success**: Browser shows "Authentication successful, you can close this window"
5. **Server ready**: MCP server is now authenticated and ready for tool calls

### Using Authenticated Tools

Once authenticated, all tools work seamlessly:

```typescript
// In your AI application (Claude, etc.)
// Call the list-repos tool - authentication is handled automatically
const repos = await mcpClient.callTool('list-repos', {});
```

## Security Features

### PKCE (Proof Key for Code Exchange)
- **Code verifier**: Random string generated for each flow
- **Code challenge**: SHA256 hash sent with authorization request
- **Verification**: Prevents authorization code interception attacks

### Secure Token Storage
- **Local encryption**: Tokens encrypted before filesystem storage
- **OS keychain**: Integration with system keychain when available
- **Automatic cleanup**: Expired tokens removed automatically

### Scope Validation
- **Tool-level scopes**: Each tool declares required OAuth scopes
- **Runtime checking**: Framework validates user has required permissions
- **Clear errors**: Helpful messages when scope requirements not met

## Configuration Options

### Server Configuration

```typescript
interface ServerConfig {
  providers: OAuthProvider[];        // OAuth providers to support
  tokenStorage?: TokenStorage;       // Custom token storage implementation
  port?: number;                     // Callback server port (default: 8080)
  host?: string;                     // Callback server host (default: localhost)
  callbackPath?: string;             // OAuth callback path (default: /oauth/callback)
  successRedirect?: string;          // Success page URL
  errorRedirect?: string;            // Error page URL
}
```

### Provider Configuration

```typescript
interface OAuthProvider {
  name: string;                      // Unique provider identifier
  clientId: string;                  // OAuth client ID
  clientSecret?: string;             // OAuth client secret (optional for PKCE)
  authorizationUrl: string;          // Provider's authorization endpoint
  tokenUrl: string;                  // Provider's token endpoint
  scope: string[];                   // Required OAuth scopes
  redirectUri?: string;              // Custom redirect URI
  additionalParams?: Record<string, string>; // Extra authorization parameters
}
```

## Common Patterns

### Multi-Provider Support

```typescript
class MultiServiceServer extends BaseMCPServer {
  constructor() {
    super({
      providers: [githubProvider, googleProvider, slackProvider]
    });
  }
}
```

### Custom Token Storage

```typescript
import { TokenStorage } from '@mcp-oauth/framework';

class DatabaseTokenStorage implements TokenStorage {
  async store(key: string, tokens: OAuthTokens): Promise<void> {
    // Store in your database
  }
  
  async retrieve(key: string): Promise<OAuthTokens | null> {
    // Retrieve from your database
  }
  
  // ... implement other methods
}

const server = new MyServer({
  providers: [provider],
  tokenStorage: new DatabaseTokenStorage()
});
```

### Error Handling

```typescript
import { BaseError, createError } from '@mcp-oauth/framework';

try {
  const result = await authenticatedApiCall();
} catch (error) {
  if (error instanceof BaseError && error.code === 'TOKEN_EXPIRED') {
    // Handle token refresh
    await this.refreshToken();
    return this.retryApiCall();
  }
  throw error;
}
```

## Troubleshooting

### Common Issues

**"OAuth callback failed"**
- Check that callback URL matches OAuth app configuration
- Ensure server is running on correct port
- Verify firewall isn't blocking the callback port

**"Insufficient scope"**
- Check that OAuth app has required permissions
- Verify user granted all requested scopes during authorization
- Review tool's scope requirements vs provider configuration

**"Token expired"**
- Framework handles refresh automatically for providers that support it
- Manually re-authenticate if refresh token is expired
- Check provider's token lifetime policies

### Debug Mode

```typescript
const server = new MyServer({
  providers: [provider],
  debug: true  // Enable detailed logging
});
```

### Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Complete API reference at docs/api
- **Examples**: See examples/ directory for complete implementations
- **Community**: Join discussions in GitHub Discussions

## Next Steps

1. **Read the API documentation** for detailed interface references
2. **Explore examples** to see complete server implementations  
3. **Join the community** to share your OAuth-enabled MCP servers
4. **Contribute** by adding support for new OAuth providers

---

*This framework aims to become the "Rails for MCP OAuth" - making OAuth authentication as simple as extending a base class and focusing on your API tools rather than authentication plumbing.*
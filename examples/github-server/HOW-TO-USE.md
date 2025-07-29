# How to Use Your GitHub MCP Server

This guide walks you through the complete process of setting up and using the GitHub MCP Server with OAuth authentication.

## 📋 Prerequisites

- Node.js 18+ installed
- GitHub account
- Claude Desktop or another MCP client

## 🚀 Step-by-Step Setup

### Step 1: Create GitHub OAuth Application

1. **Navigate to GitHub Settings**:
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Click **"OAuth Apps"** in the left sidebar
   - Click **"New OAuth App"**

2. **Fill in Application Details**:
   ```
   Application name: GitHub MCP Server
   Homepage URL: http://localhost:8080
   Application description: MCP server for GitHub integration with Claude
   Authorization callback URL: http://localhost:8080/oauth/callback
   ```

3. **Register the Application**:
   - Click **"Register application"**
   - **Copy the Client ID** - you'll need this!
   - Click **"Generate a new client secret"**
   - **Copy the Client Secret** - you'll need this too!

### Step 2: Configure the MCP Server

1. **Navigate to the Project**:
   ```bash
   cd /path/to/mcp-framework/examples/github-server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create Environment File**:
   ```bash
   cp .env.example .env
   ```

4. **Edit the `.env` File**:
   ```bash
   # Open .env in your text editor and add:
   GITHUB_CLIENT_ID=your_actual_client_id_from_step_1
   GITHUB_CLIENT_SECRET=your_actual_client_secret_from_step_1
   DEBUG=false
   ```

### Step 3: Build the Server

```bash
npm run build
```

**Expected Output**:
```
> mcp-github-server-example@1.0.0 build
> tsc

# Should complete without errors
```

### Step 4: Configure Claude Desktop

1. **Locate Claude Desktop Config**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. **Edit the Configuration File**:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "node",
         "args": ["/FULL/PATH/TO/mcp-framework/examples/github-server/dist/index.js"],
         "env": {
           "GITHUB_CLIENT_ID": "your_actual_client_id",
           "GITHUB_CLIENT_SECRET": "your_actual_client_secret"
         }
       }
     }
   }
   ```

   **⚠️ Important**: 
   - Replace `/FULL/PATH/TO/` with the actual absolute path
   - On Windows, use forward slashes: `C:/Users/YourName/path/to/project`
   - Make sure the path points to the `dist/index.js` file

### Step 5: Test the Setup

1. **Test the Server Directly** (Optional):
   ```bash
   # From the github-server directory
   DEBUG=true node dist/index.js
   ```
   
   **Expected Output**:
   ```
   [2024-01-XX] [INFO] [github-mcp-server] BaseMCPServer initialized
   [2024-01-XX] [INFO] [github-mcp-server] Initializing GitHub MCP Server...
   [2024-01-XX] [INFO] [github-mcp-server] Registered tool: get-user
   [2024-01-XX] [INFO] [github-mcp-server] Registered tool: list-repos
   # ... more tool registrations
   [2024-01-XX] [INFO] [github-mcp-server] MCP server started successfully
   ```

2. **Restart Claude Desktop**:
   - Close Claude Desktop completely
   - Reopen Claude Desktop
   - Look for the MCP server connection in the status

## 🔐 First-Time Authentication Flow

### Trigger Authentication

1. **Start a New Conversation** in Claude Desktop

2. **Ask Claude to Use GitHub**:
   ```
   Can you list my GitHub repositories?
   ```

### What Happens Next

1. **MCP Server Receives Request**:
   - Claude calls the `list-repos` tool
   - Server detects authentication is required

2. **OAuth Flow Begins**:
   - **Your browser opens automatically** to GitHub
   - You'll see GitHub's authorization page
   - The page will show: "Authorize GitHub MCP Server"

3. **Review Permissions**:
   ```
   GitHub MCP Server by [Your Name] would like permission to:
   ✓ Access your email addresses
   ✓ Access your public and private repositories
   ✓ Read your organization membership
   ```

4. **Authorize the Application**:
   - Click **"Authorize [Your App Name]"**
   - GitHub redirects to `http://localhost:8080/oauth/callback`

5. **Success Page**:
   ```
   ✅ Authentication Successful
   You can now close this window and return to your application.
   ```

6. **Back to Claude**:
   - The browser tab closes automatically after 3 seconds
   - Claude receives your repository list and displays it

### Expected Result in Claude

```
Here are your GitHub repositories:

1. **my-awesome-project** (private)
   - Description: My awesome project description
   - Language: TypeScript
   - Updated: 2 days ago

2. **public-library** (public)  
   - Description: A useful public library
   - Language: JavaScript
   - Updated: 1 week ago

[... more repositories]
```

## 🔄 Using GitHub Tools

Once authenticated, you can use any of the 15 available tools:

### Repository Management

```
"Create a new repository called 'test-repo'"
"Show me details about my 'awesome-project' repository"
"Search for Python repositories about machine learning"
```

### Issue Management

```  
"List open issues in my 'project-name' repository"
"Create an issue in 'my-repo' titled 'Bug in login' with description 'Users cannot log in'"
"Update issue #123 in 'my-repo' to mark it as closed"
```

### Pull Requests

```
"Show me open pull requests in 'my-repo'"
"Create a pull request in 'my-repo' from 'feature-branch' to 'main'"
```

### File Operations

```
"Show me the content of README.md in 'my-repo'"
"Create a new file called 'hello.py' in 'my-repo' with some Python code"
```

### User Information

```
"Show me my GitHub profile information"
"Get the public profile of GitHub user 'octocat'"
```

## 🔧 Troubleshooting

### Common Issues

#### ❌ "GITHUB_CLIENT_ID environment variable is required"

**Problem**: Environment variables not set correctly.

**Solution**:
1. Check your `.env` file exists and has the correct values
2. Restart Claude Desktop after changing configuration
3. Verify the path in `claude_desktop_config.json` is correct

#### ❌ "OAuth callback failed"

**Problem**: OAuth callback URL mismatch.

**Solution**:
1. Check your GitHub OAuth app settings
2. Ensure callback URL is exactly: `http://localhost:8080/oauth/callback`
3. Make sure no other application is using port 8080

#### ❌ Browser doesn't open for authentication

**Problem**: OAuth flow not triggering properly.

**Solution**:
1. Enable debug mode: Set `DEBUG=true` in your environment
2. Check Claude Desktop console for errors
3. Verify the MCP server is running and connected

#### ❌ "Token expired" or authentication fails

**Problem**: Stored tokens are invalid or expired.

**Solution**:
1. Clear stored tokens:
   ```bash
   rm -rf ~/.mcp-oauth/
   ```
2. Restart Claude Desktop
3. Try the authentication flow again

### Debug Mode

Enable detailed logging to troubleshoot issues:

1. **Update Claude Desktop Config**:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "node",
         "args": ["/path/to/dist/index.js"],
         "env": {
           "GITHUB_CLIENT_ID": "your_client_id",
           "GITHUB_CLIENT_SECRET": "your_client_secret",
           "DEBUG": "true"
         }
       }
     }
   }
   ```

2. **Restart Claude Desktop**

3. **Check Logs**: Look for detailed logs in Claude Desktop's developer console

### Getting Help

1. **Check the Logs**: Enable debug mode to see detailed error messages
2. **Verify Configuration**: Double-check all URLs, paths, and credentials
3. **Test OAuth App**: Use GitHub's OAuth app test feature
4. **GitHub Issues**: Report bugs at the project's GitHub repository

## 🎉 Success! What's Next?

Once everything is working, you can:

1. **Explore All Tools**: Try different GitHub operations through Claude
2. **Customize the Server**: Add your own tools or modify existing ones
3. **Build Your Own**: Use this as a template for other OAuth providers
4. **Share**: Help others by documenting your setup experience

## 📚 Advanced Usage

### Custom Tool Development

```typescript
// Add to src/github-server.ts
this.addTool({
  name: 'my-custom-tool',
  description: 'My custom GitHub tool',
  auth: { required: true, provider: 'github', scopes: ['repo'] },
  handler: async (params, context) => {
    // Your custom logic here
    const response = await this.makeAuthenticatedRequest(
      'github',
      'https://api.github.com/your/endpoint'
    );
    return response.json();
  }
});
```

### Multiple OAuth Providers

```typescript
// Add more providers in constructor
super({
  name: 'multi-provider-server',
  version: '1.0.0',
  providers: [
    githubProvider,
    googleProvider,
    microsoftProvider
  ]
});
```

### Environment-Specific Configuration

```bash
# Development
GITHUB_CLIENT_ID=dev_client_id
DEBUG=true

# Production  
GITHUB_CLIENT_ID=prod_client_id
DEBUG=false
OAUTH_PORT=443
OAUTH_HOST=myserver.com
```

Happy coding! 🚀
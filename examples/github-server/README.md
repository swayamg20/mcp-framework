# GitHub MCP Server Example

This is a complete example of an MCP (Model Context Protocol) server that provides GitHub integration using OAuth authentication. It demonstrates how to use the `@sg20/mcp-oauth-framework` to build a production-ready MCP server.

## Features

### 🔐 **OAuth Authentication**
- Secure GitHub OAuth 2.0 with PKCE
- Automatic token refresh
- Encrypted local token storage

### 👤 **User Management**
- Get authenticated user information
- Fetch public user profiles
- User email and organization access

### 📦 **Repository Operations**
- List user repositories
- Get repository details
- Create new repositories
- Repository search

### 🐛 **Issue Management**
- List repository issues
- Create new issues
- Update existing issues
- Full issue lifecycle management

### 🔄 **Pull Request Operations**
- List pull requests
- Create new pull requests
- PR management and review workflow

### 📁 **File Operations**
- Read file contents from repositories
- Create and update files
- Support for any file type
- Branch-specific operations

### 🔍 **Search Capabilities**
- Search repositories across GitHub
- Search code within repositories
- Advanced search filters

## Step-by-Step Setup Guide

### Step 1: Create GitHub OAuth App

1. **Go to GitHub Developer Settings**:
   - Visit [https://github.com/settings/developers](https://github.com/settings/developers)
   - Click **"New OAuth App"**

2. **Configure Your OAuth App**:
   ```
   Application name: GitHub MCP Server
   Homepage URL: http://localhost:8080
   Application description: MCP server for GitHub integration
   Authorization callback URL: http://localhost:8080/oauth/callback
   ```

3. **Save Your Credentials**:
   - Copy the **Client ID** (you'll need this)
   - Generate and copy the **Client Secret** (optional but recommended)

### Step 2: Install and Configure

1. **Install Dependencies**:
   ```bash
   cd examples/github-server
   npm install
   ```

2. **Set Up Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file**:
   ```bash
   # Required
   GITHUB_CLIENT_ID=your_actual_github_client_id_here
   
   # Optional but recommended
   GITHUB_CLIENT_SECRET=your_actual_github_client_secret_here
   
   # Optional: Enable detailed logging
   DEBUG=false
   ```

### Step 3: Build the Server

```bash
npm run build
```

### Step 4: Add to Claude Desktop

1. **Find your Claude config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

2. **Add the server configuration**:
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "node",
         "args": ["/absolute/path/to/examples/github-server/dist/index.js"]
       }
     }
   }
   ```

   **That's it!** No environment variables needed - the server reads from `.env` automatically.
   
   **Important**: Replace `/absolute/path/to/` with the actual full path to your project.

### Step 5: Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## How Authentication Works

### First Time Authentication Flow

1. **Start a Conversation**: Open Claude Desktop and start a new conversation

2. **Use a GitHub Tool**: Ask Claude to help with GitHub, for example:
   ```
   "Can you list my GitHub repositories?"
   ```

3. **Authentication Triggers**: 
   - Claude will call the `list-repos` tool
   - Since this requires authentication, the MCP server will start the OAuth flow

4. **Browser Opens Automatically**:
   - Your default browser will open to GitHub's authorization page
   - You'll see: "Authorize GitHub MCP Server to access your account"

5. **Grant Permissions**:
   - Review the requested permissions (repo access, user email, etc.)
   - Click **"Authorize application"**

6. **Automatic Redirect**:
   - GitHub redirects back to `http://localhost:8080/oauth/callback`
   - You'll see: "✅ Authentication Successful - You can close this window"

7. **Back to Claude**:
   - The browser tab closes automatically
   - Claude receives your repository list and displays it

### Subsequent Uses

- **No Browser Required**: Authentication tokens are stored securely locally
- **Automatic Refresh**: Expired tokens are refreshed automatically
- **All Tools Work**: Any GitHub tool will use the stored authentication

### Token Storage Location

Tokens are stored securely in:
```
~/.mcp-oauth/mcp-oauth:github.token
```
- **Encrypted**: Tokens are encrypted with a machine-specific key
- **Automatic Cleanup**: Expired tokens are removed automatically

## Testing Your Setup

### Method 1: Through Claude Desktop

After setup, ask Claude:

```
"List my GitHub repositories"
```

**Expected Result**: 
- First time: Browser opens for OAuth
- Subsequent times: Direct list of your repositories

### Method 2: Using MCP Inspector (Developer Tool)

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Test your server
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a web interface where you can:
- See all available tools
- Test tool calls manually
- View authentication status
- Debug issues

### Method 3: Direct Testing

```bash
# Run with debug logging
DEBUG=true node dist/index.js
```

Then send a test MCP request via stdin to see detailed logs.

## Available Tools

### User Tools

#### `get-user`
Get information about the authenticated user.
```json
{
  "name": "get-user"
}
```

#### `get-user-profile`
Get public profile for any GitHub user.
```json
{
  "name": "get-user-profile",
  "arguments": {
    "username": "octocat"
  }
}
```

### Repository Tools

#### `list-repos`
List repositories for the authenticated user.
```json
{
  "name": "list-repos",
  "arguments": {
    "type": "all",
    "sort": "updated",
    "per_page": 30,
    "page": 1
  }
}
```

#### `get-repo`
Get detailed information about a specific repository.
```json
{
  "name": "get-repo",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World"
  }
}
```

#### `create-repo`
Create a new repository.
```json
{
  "name": "create-repo",
  "arguments": {
    "name": "my-new-repo",
    "description": "A new repository created via MCP",
    "private": false,
    "auto_init": true
  }
}
```

### Issue Tools

#### `list-issues`
List issues for a repository.
```json
{
  "name": "list-issues",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "state": "open",
    "per_page": 30
  }
}
```

#### `create-issue`
Create a new issue.
```json
{
  "name": "create-issue",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "title": "Bug report",
    "body": "Found a bug in the application...",
    "labels": ["bug", "priority-high"]
  }
}
```

#### `update-issue`
Update an existing issue.
```json
{
  "name": "update-issue",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "issue_number": 123,
    "state": "closed",
    "labels": ["bug", "fixed"]
  }
}
```

### Pull Request Tools

#### `list-pull-requests`
List pull requests for a repository.
```json
{
  "name": "list-pull-requests",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "state": "open"
  }
}
```

#### `create-pull-request`
Create a new pull request.
```json
{
  "name": "create-pull-request",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "title": "Add new feature",
    "head": "feature-branch",
    "base": "main",
    "body": "This PR adds a new feature...",
    "draft": false
  }
}
```

### File Operations

#### `get-file-content`
Get the content of a file from a repository.
```json
{
  "name": "get-file-content",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "path": "README.md",
    "ref": "main"
  }
}
```

#### `create-or-update-file`
Create or update a file in a repository.
```json
{
  "name": "create-or-update-file",
  "arguments": {
    "owner": "octocat",
    "repo": "Hello-World",
    "path": "new-file.md",
    "message": "Add new file",
    "content": "# New File\\n\\nThis is a new file.",
    "branch": "main"
  }
}
```

### Search Tools

#### `search-repositories`
Search for repositories on GitHub.
```json
{
  "name": "search-repositories",
  "arguments": {
    "q": "javascript language:javascript",
    "sort": "stars",
    "order": "desc",
    "per_page": 10
  }
}
```

#### `search-code`
Search for code in repositories.
```json
{
  "name": "search-code",
  "arguments": {
    "q": "function addClass language:javascript",
    "sort": "indexed",
    "per_page": 10
  }
}
```

## Authentication Flow

1. **First Run**: When you call a tool that requires authentication, the server will:
   - Open your browser to GitHub's OAuth page
   - Ask you to authorize the application
   - Redirect back to capture the authorization code
   - Exchange the code for access tokens
   - Store tokens securely on your local machine

2. **Subsequent Runs**: The server will:
   - Load stored tokens automatically
   - Refresh expired tokens as needed
   - No browser interaction required

3. **Token Storage**: Tokens are stored in:
   - **Location**: `~/.mcp-oauth/` directory
   - **Security**: Encrypted with machine-specific key
   - **Cleanup**: Expired tokens automatically removed

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev  # Watch mode with auto-rebuild
```

### Debugging

Enable debug logging:

```bash
DEBUG=true npm start
```

This will show detailed logs including:
- OAuth flow steps
- API requests and responses
- Token refresh events
- Tool execution details

### Custom Configuration

You can customize the OAuth configuration by setting environment variables:

```bash
# Change OAuth callback port
export OAUTH_PORT=3000

# Change OAuth callback host  
export OAUTH_HOST=localhost

# Change OAuth callback path
export OAUTH_CALLBACK_PATH=/auth/callback
```

## Error Handling

The server includes comprehensive error handling:

- **Authentication Errors**: Clear messages when OAuth fails
- **API Errors**: GitHub API error details passed through
- **Rate Limiting**: Automatic handling of GitHub rate limits
- **Network Errors**: Retry logic for transient failures
- **Validation Errors**: Parameter validation with helpful messages

## Security Features

- **PKCE Flow**: Uses Proof Key for Code Exchange for security
- **Token Encryption**: All tokens encrypted before storage
- **Scope Validation**: Tools validate required OAuth scopes
- **Secure Defaults**: Minimal required permissions by default

## Troubleshooting

### Common Issues

**"GITHUB_CLIENT_ID environment variable is required"**
- Make sure you've copied `.env.example` to `.env`
- Add your GitHub OAuth app credentials

**"OAuth callback failed"**
- Check that your GitHub OAuth app callback URL matches the server configuration
- Default is `http://localhost:8080/oauth/callback`

**"Token expired" or authentication fails**
- Delete stored tokens: `rm -rf ~/.mcp-oauth/`
- Restart the server to trigger re-authentication

**"API rate limit exceeded"**
- GitHub has rate limits for API calls
- Wait for the limit to reset or use a GitHub token with higher limits

### Debug Mode

Run with debug logging to see detailed information:

```bash
DEBUG=true npm start
```

## License

This example is provided under the MIT License, same as the parent framework.
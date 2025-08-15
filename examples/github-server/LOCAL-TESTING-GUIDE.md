# 🧪 Local Testing Guide for GitHub MCP Server

## Prerequisites

- Node.js 18+ installed
- GitHub account
- Claude Desktop app (for full MCP testing)

## Step 1: Create GitHub OAuth App (2 minutes)

1. **Go to GitHub Developer Settings**
   ```
   https://github.com/settings/developers
   ```

2. **Click "New OAuth App"**

3. **Fill in the OAuth app details:**
   ```
   Application name: GitHub MCP Server (Local Test)
   Homepage URL: http://localhost:3000
   Authorization callback URL: http://localhost:3000/oauth/callback
   ```

4. **Save and copy credentials:**
   - Copy the **Client ID** 
   - Generate and copy the **Client Secret**

## Step 2: Configure the Server (1 minute)

1. **Navigate to the GitHub server directory:**
   ```bash
   cd examples/github-server
   ```

2. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file:**
   ```bash
   # Required
   GITHUB_CLIENT_ID=your_actual_client_id_here
   GITHUB_CLIENT_SECRET=your_actual_client_secret_here
   
   # Optional - enable for debugging
   DEBUG=true
   ```

## Step 3: Build and Test (2 minutes)

1. **Install dependencies (if not done):**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Test OAuth initialization:**
   ```bash
   node dist/index.js
   ```
   
   You should see:
   ```
   🚀 Starting GitHub MCP Server...
   📁 Loaded environment from: /path/to/.env
   MCP server started successfully
   GitHub MCP Server initialized successfully
   ```

## Step 4: Test with Claude Desktop (5 minutes)

### 4.1 Configure Claude Desktop

1. **Open Claude Desktop config:**
   ```bash
   # macOS
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   
   # Linux
   open ~/.config/Claude/claude_desktop_config.json
   ```

2. **Add the GitHub server:**
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
   
   **Important:** Replace `/absolute/path/to/` with your actual path. Find it with:
   ```bash
   pwd
   # Copy the output and use: /your/output/examples/github-server/dist/index.js
   ```

### 4.2 Test OAuth Flow

1. **Restart Claude Desktop** (important!)

2. **Test a tool that requires authentication:**
   ```
   Ask Claude: "List my GitHub repositories"
   ```

3. **Expected OAuth flow:**
   - Browser opens to GitHub authorization page
   - You see: "Authorize GitHub MCP Server (Local Test)?"
   - Click "Authorize"
   - Browser shows success page
   - Claude shows your repositories!

4. **Test that tokens are stored:**
   ```
   Ask Claude: "Show my GitHub user profile"
   ```
   - Should work immediately without browser opening
   - Tokens are stored in `~/.mcp-oauth/`

## Step 5: Debug Common Issues

### Issue: "GITHUB_CLIENT_ID not found"
```bash
# Check your .env file exists and has content
cat .env

# Make sure no extra spaces around =
GITHUB_CLIENT_ID=abc123  # ✅ Good
GITHUB_CLIENT_ID = abc123  # ❌ Bad (spaces)
```

### Issue: "OAuth callback failed"
1. **Check callback URL in GitHub app:**
   - Must be exactly: `http://localhost:3000/oauth/callback`
   - No trailing slashes or extra parameters

2. **Check port availability:**
   ```bash
   # Test if port 3000 is free
   lsof -i :3000
   ```

3. **Enable debug logging:**
   ```bash
   # In .env file
   DEBUG=true
   ```

### Issue: "Provider not found in registry"
- This was the old bug - should be fixed now!
- If you still see this, the OAuth fix didn't work properly

### Issue: "Failed to start server"
```bash
# Run with debug to see detailed errors
DEBUG=true node dist/index.js

# Check if build is up to date
npm run build
```

## Step 6: Test Individual Tools

### Test Public Tools (no auth needed):
```
Ask Claude:
- "Search for popular JavaScript repositories on GitHub"
- "Get public profile information for octocat"
```

### Test Private Tools (auth required):
```
Ask Claude:
- "List my GitHub repositories" 
- "Show my GitHub user profile"
- "List issues in my main repository"
- "Create a new repository called test-repo"
```

### Test File Operations:
```
Ask Claude:
- "Get the README.md file from my repository [repo-name]"
- "List pull requests for [repo-name]"
```

## Step 7: Verify Token Storage

1. **Check stored tokens:**
   ```bash
   ls -la ~/.mcp-oauth/
   cat ~/.mcp-oauth/mcp-oauth:github.json
   ```

2. **Test token refresh:**
   - Wait a few hours (or modify expiry time)
   - Use a GitHub tool again
   - Should automatically refresh without browser

## Step 8: Clean Up Testing

1. **Remove test OAuth app:**
   - Go to GitHub Settings > Developer settings
   - Delete the test OAuth app

2. **Clear stored tokens:**
   ```bash
   rm -rf ~/.mcp-oauth/
   ```

3. **Remove from Claude config:**
   - Edit `claude_desktop_config.json`
   - Remove the "github" entry

## 🎉 Success Criteria

If everything works, you should be able to:

✅ **OAuth Flow**: Browser opens → Authorize → Success  
✅ **Token Storage**: Subsequent calls work without browser  
✅ **API Access**: Can list repos, create issues, read files  
✅ **Error Handling**: Clear error messages when things go wrong  
✅ **Token Refresh**: Automatic token renewal when expired  

## 🐛 Still Having Issues?

1. **Check the logs:**
   ```bash
   DEBUG=true node dist/index.js
   ```

2. **Verify the OAuth fix:**
   ```bash
   # This should work without errors
   node -e "
   import('./dist/auth/auth-manager.js').then(({AuthManager}) => {
     const auth = new AuthManager({providers: [{name:'test', clientId:'test', authorizationUrl:'', tokenUrl:'', scope:[]}]});
     console.log('✅ OAuth fix working');
   })
   "
   ```

3. **Open an issue** with:
   - Your error logs
   - `.env` file (without secrets)
   - Node.js version
   - Operating system

## Next Steps

Once local testing works:
- Try deploying to a cloud server
- Test with other OAuth providers
- Build your own MCP server using this framework!

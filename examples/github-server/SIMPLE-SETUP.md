# 🚀 Super Simple Setup (2 Minutes!)

This is the **ACTUALLY SIMPLE** way to set up the GitHub MCP Server. No duplicate configuration, no absolute paths to remember.

## ⚡ Quick Setup

### 1. GitHub OAuth App (30 seconds)

1. Go to [GitHub Settings > Developer > OAuth Apps](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   ```
   Application name: GitHub MCP Server
   Homepage URL: http://localhost:8080
   Authorization callback URL: http://localhost:8080/oauth/callback
   ```
4. Copy **Client ID** and **Client Secret**

### 2. Configure Server (30 seconds)

```bash
cd examples/github-server
cp .env.example .env
```

Edit `.env`:
```bash
GITHUB_CLIENT_ID=your_copied_client_id
GITHUB_CLIENT_SECRET=your_copied_client_secret
```

### 3. Build and Run (30 seconds)

```bash
npm install
npm run build
```

### 4. Add to Claude Desktop (30 seconds)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/full/path/to/examples/github-server/dist/index.js"]
    }
  }
}
```

**That's it!** No duplicate environment variables, no complex configuration.

## ✨ What Happens

1. **MCP Server reads `.env` automatically** - No manual environment passing
2. **Server validates configuration** - Clear error messages if something's wrong  
3. **Claude Desktop launches server** - Simple command, no env vars needed
4. **OAuth flow happens seamlessly** - Browser opens, user authorizes, done!

## 🎯 The OAuth Flow Explained Simply

**Why the callback URL?**

1. **User**: "Hey Claude, list my GitHub repos"
2. **Claude**: Calls GitHub MCP server `list-repos` tool
3. **MCP Server**: "I need GitHub auth" → Opens `https://github.com/login/oauth/authorize?client_id=...`
4. **GitHub**: Shows "Authorize GitHub MCP Server?" page
5. **User**: Clicks "Authorize" 
6. **GitHub**: Redirects to `http://localhost:8080/oauth/callback?code=abc123`
7. **MCP Server**: Catches the callback, exchanges `code=abc123` for access tokens
8. **MCP Server**: Stores tokens securely, returns repo list to Claude
9. **Claude**: Shows user their repositories

**Next time**: No browser needed - tokens are stored and reused!

## 🔧 Why This Is Better

### ❌ **Old Way** (Complex):
```json
{
  "mcpServers": {
    "github": {
      "command": "node", 
      "args": ["/very/long/absolute/path/dist/index.js"],
      "env": {
        "GITHUB_CLIENT_ID": "duplicate_config_here",
        "GITHUB_CLIENT_SECRET": "duplicate_config_here", 
        "DEBUG": "false"
      }
    }
  }
}
```

### ✅ **New Way** (Simple):
```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

**Benefits**:
- ✅ **Single source of truth** - `.env` file has all config
- ✅ **No duplication** - Don't repeat client ID/secret
- ✅ **Clear error messages** - Server tells you exactly what's wrong
- ✅ **Easier sharing** - Just share the built server + .env template

## 🐛 Troubleshooting

**"GITHUB_CLIENT_ID not found in .env file"**
- Make sure `.env` file exists in the `github-server` directory
- Check that `GITHUB_CLIENT_ID=...` is actually in the file (no spaces around `=`)

**"OAuth callback failed"**  
- Make sure your GitHub OAuth app callback URL is exactly: `http://localhost:8080/oauth/callback`
- Check that port 8080 isn't being used by another application

**"Failed to start server"**
- Run `DEBUG=true node dist/index.js` to see detailed error messages
- Make sure you ran `npm run build` after making changes

## 🎉 Success!

Ask Claude: **"List my GitHub repositories"**

**First time**: Browser opens → Authorize → Success!  
**Every time after**: Instant results! 🚀
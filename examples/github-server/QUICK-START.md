# 🚀 Quick Start - GitHub MCP Server

## 30-Second Setup

```bash
# 1. Clone and setup
cd examples/github-server
cp .env.example .env

# 2. Create GitHub OAuth app at: https://github.com/settings/developers
# Use callback URL: http://localhost:3000/oauth/callback

# 3. Edit .env with your credentials
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# 4. Build and test
npm run build
npm test

# 5. Start server
npm start
```

## Test with Claude Desktop

1. **Add to Claude config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
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

2. **Restart Claude Desktop**

3. **Test OAuth flow:**
   ```
   Ask Claude: "List my GitHub repositories"
   ```
   
   → Browser opens → Authorize → Success! 🎉

## Available Scripts

- `npm start` - Run the server
- `npm run start:debug` - Run with debug logging  
- `npm test` - Test configuration and OAuth setup
- `npm run build` - Build TypeScript
- `npm run dev` - Build in watch mode

## Need Help?

- 📖 **Detailed guide**: [LOCAL-TESTING-GUIDE.md](./LOCAL-TESTING-GUIDE.md)
- 📋 **Simple setup**: [SIMPLE-SETUP.md](./SIMPLE-SETUP.md)
- 📚 **Full documentation**: [README.md](./README.md)

## Common Issues

**OAuth callback failed?**
- Check callback URL: `http://localhost:3000/oauth/callback`
- Restart Claude Desktop after config changes

**"Provider not found"?** 
- This was fixed! Update to latest version

**Missing environment variables?**
- Copy `.env.example` to `.env`
- Get credentials from [GitHub OAuth Apps](https://github.com/settings/developers)

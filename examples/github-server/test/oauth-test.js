#!/usr/bin/env node

// OAuth setup test for GitHub MCP Server
import { config } from 'dotenv';
import { AuthManager } from '@sg20/mcp-oauth-framework/auth';

// Load environment variables
config();

console.log('🧪 Testing OAuth setup...');

try {
  // Test that we have required environment variables
  if (!process.env.GITHUB_CLIENT_ID) {
    throw new Error('GITHUB_CLIENT_ID environment variable is required. Copy .env.example to .env and configure it.');
  }

  // Create GitHub provider configuration
  const githubProvider = {
    name: 'github',
    clientId: process.env.GITHUB_CLIENT_ID,
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: ['repo', 'user:email']
  };

  if (process.env.GITHUB_CLIENT_SECRET) {
    githubProvider.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    console.log('✅ Client secret configured');
  } else {
    console.log('ℹ️  Client secret not set (optional for PKCE flow)');
  }

  // Test AuthManager initialization with provider
  const authManager = new AuthManager({
    providers: [githubProvider]
  });

  console.log('✅ Environment configured');
  console.log('✅ AuthManager created successfully');
  console.log('✅ Provider registry initialized');
  
  // Test provider lookup
  const provider = authManager.getProvider('github');
  if (provider) {
    console.log('✅ Provider retrieval works:', provider.name);
    console.log('  - Client ID:', provider.clientId.substring(0, 8) + '...');
    console.log('  - Scopes:', provider.scope?.join(', '));
  } else {
    throw new Error('Provider retrieval failed');
  }

  await authManager.cleanup();
  console.log('\n🎉 OAuth setup successful! Ready for authentication flows.');
  
} catch (error) {
  console.error('❌ OAuth test failed:', error.message);
  console.error('\n📋 Setup checklist:');
  console.error('  1. Copy .env.example to .env');
  console.error('  2. Create GitHub OAuth app at: https://github.com/settings/developers');
  console.error('  3. Add your GITHUB_CLIENT_ID to .env');
  console.error('  4. Run: npm test');
  process.exit(1);
}

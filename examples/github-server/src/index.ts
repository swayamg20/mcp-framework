#!/usr/bin/env node

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GitHubMCPServer } from './github-server.js';

// Load environment variables from .env file in the same directory as this script
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

async function main() {
  // Validate required environment variables
  if (!process.env.GITHUB_CLIENT_ID) {
    console.error('❌ Error: GITHUB_CLIENT_ID not found in .env file');
    console.error('📁 Expected .env file location:', envPath);
    console.error('📝 Please create .env file with:');
    console.error('   GITHUB_CLIENT_ID=your_github_client_id');
    console.error('   GITHUB_CLIENT_SECRET=your_github_client_secret');
    process.exit(1);
  }

  console.log('🚀 Starting GitHub MCP Server...');
  console.log('📁 Loaded environment from:', envPath);
  
  const server = new GitHubMCPServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start GitHub MCP server:', error);
    process.exit(1);
  }
  
  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n⏹️  Received ${signal}. Shutting down gracefully...`);
    try {
      await server.stop();
      console.log('✅ Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
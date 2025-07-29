#!/usr/bin/env node

import { GitHubMCPServer } from './github-server.js';

async function main() {
  const server = new GitHubMCPServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start GitHub MCP server:', error);
    process.exit(1);
  }
  
  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      await server.stop();
      console.log('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
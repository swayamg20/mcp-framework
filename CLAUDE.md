# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run build` - Compile TypeScript to JavaScript in `/dist`
- `npm run dev` - Watch mode compilation for development
- `npm run clean` - Remove built files
- `npm test` - Currently placeholder, no tests implemented yet

## Architecture Overview

This is an OAuth authentication framework for MCP (Model Context Protocol) servers. The project is currently in early development with planned modular architecture:

### Core Modules

**Auth Module (`/src/auth/`)** - OAuth 2.0 authentication system
- `oauth-flow.ts` - Browser-based OAuth flow implementation
- `token-store.ts` - Token persistence and management  
- `auth-manager.ts` - Main authentication orchestrator

**Base Module (`/src/base/`)** - MCP server abstraction layer
- `base-server.ts` - Abstract base class extending MCP SDK Server
- `tool-registry.ts` - Tool management and registration system

**Shared Module (`/src/shared/`)** - Common utilities and types
- Currently contains empty interface stubs for core types

### MCP SDK Integration

Built on `@modelcontextprotocol/sdk` v0.4.0:
- Extends the official MCP Server class
- Uses JSON-RPC 2.0 protocol implementation
- Supports stdio, SSE, and WebSocket transports
- Protocol version: "2024-11-05"

### Key Dependencies

- `express` - Web framework for OAuth callback handling
- `open` - Cross-platform browser opener for OAuth flows
- `@modelcontextprotocol/sdk` - Official MCP TypeScript SDK

### Export Structure

The package exports four main entry points:
- `./` - Main framework exports
- `./auth` - Authentication module
- `./base` - Base server functionality  
- `./shared` - Shared utilities

### Current Development State

**Implemented:**
- TypeScript configuration with strict mode
- Package structure and export definitions
- Basic type stubs in `/src/shared/types.ts`

**Not Yet Implemented:**
- Core OAuth flow logic
- Base server abstraction
- Token management system
- Tool registry implementation
- Test suite (placeholder exists)
- Example implementations

### TypeScript Configuration

- Target: ES2022 with ESNext modules
- Strict mode enabled with additional safety checks
- Declaration files generated for library usage
- Module resolution: Bundler-style for modern tooling

## Development Notes

The framework is designed to enable MCP servers to authenticate with OAuth providers like GitHub, Google, etc. The architecture separates authentication concerns from server functionality, allowing for pluggable OAuth providers and reusable server abstractions.

When implementing new features, follow the modular structure and ensure compatibility with the MCP SDK's protocol requirements.
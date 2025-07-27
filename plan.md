# MCP OAuth Framework Implementation Plan

## Vision
Create the "Rails for MCP OAuth" - a comprehensive framework that enables third-party developers to build OAuth-enabled MCP servers with minimal boilerplate, focusing on their API tools rather than authentication plumbing.

## Core Value Propositions
1. **Developer Experience**: Write 20 lines instead of 200 lines of OAuth boilerplate
2. **User Experience**: Authenticate once per service, works across all MCP servers 
3. **Ecosystem**: Standardized OAuth flow across all community MCP servers

## Implementation Phases

### Phase 1: Foundation (Core Types & Shared Utilities)
**Goal**: Establish robust type system and shared utilities

**Tasks**:
1. **Define core shared types** in `/src/shared/types.ts`:
   - `OAuthProvider` - OAuth provider configuration interface
   - `AuthenticationStatus` - Auth state tracking
   - `AuthenticatedRequest` - Request with auth context
   - `ToolAuthRequirement` - Tool-level auth requirements
   - `BaseError` - Framework error types
   - Token interfaces (access, refresh, storage)
   - OAuth flow state types

2. **Implement shared utilities** in `/src/shared/utils.ts`:
   - URL validation and parsing
   - Secure random string generation
   - Base64 URL encoding/decoding
   - Error handling utilities
   - Configuration validation helpers

3. **Update main exports** in `/src/index.ts`:
   - Export key types for framework consumers
   - Export utility functions

### Phase 2: Authentication Module
**Goal**: Complete OAuth 2.0 flow implementation with browser-based authentication

**Tasks**:
1. **OAuth Flow Controller** (`/src/auth/oauth-flow.ts`):
   - PKCE (Proof Key for Code Exchange) implementation
   - Authorization URL generation
   - Browser launching and callback handling
   - Authorization code exchange for tokens
   - State parameter validation for security
   - Support for multiple OAuth providers (GitHub, Google, etc.)

2. **Token Store** (`/src/auth/token-store.ts`):
   - Secure local token persistence (filesystem-based)
   - Automatic token refresh logic
   - Token expiration handling
   - Cross-platform secure storage
   - Token revocation and cleanup

3. **Auth Manager** (`/src/auth/auth-manager.ts`):
   - Main authentication orchestrator
   - Provider-specific configuration management
   - Authentication state management
   - Integration with MCP request lifecycle
   - Error recovery and retry logic

4. **Auth Types** (`/src/auth/types.ts`):
   - Provider-specific interfaces
   - OAuth flow state types
   - Token management types
   - Authentication middleware types

5. **Auth Module Exports** (`/src/auth/index.ts`):
   - Export all auth functionality
   - Provide convenient imports for consumers

### Phase 3: Base MCP Server Module
**Goal**: Abstract MCP server class with integrated OAuth authentication

**Tasks**:
1. **Base Server Class** (`/src/base/base-server.ts`):
   - Extend MCP SDK Server class
   - Integrate authentication middleware
   - Handle authenticated vs unauthenticated requests
   - Automatic OAuth flow triggering for protected tools
   - Request context injection (user info, tokens)
   - Error handling and user feedback

2. **Tool Registry** (`/src/base/tool-registry.ts`):
   - Tool registration with authentication requirements
   - Middleware pipeline for tool execution
   - Permission checking and scope validation
   - Tool-level authentication enforcement
   - Dynamic tool availability based on auth status

3. **Base Types** (`/src/base/types.ts`):
   - Server configuration interfaces
   - Tool authentication decorators
   - Request context types
   - Server lifecycle event types

4. **Base Module Exports** (`/src/base/index.ts`):
   - Export BaseMCPServer class
   - Export tool registration utilities
   - Export authentication decorators

### Phase 4: Example Implementation
**Goal**: Demonstrate framework usage with real GitHub integration

**Tasks**:
1. **GitHub Server Example** (`/examples/github-server/`):
   - Complete GitHub OAuth implementation
   - GitHub API tools (repos, issues, PRs)
   - Proper error handling and user feedback
   - Package as standalone MCP server
   - Documentation and usage examples

### Phase 5: Developer Experience & Documentation
**Goal**: Make the framework easy to adopt and use

**Tasks**:
1. **Documentation**:
   - API documentation with TypeDoc
   - Getting started guide
   - OAuth provider setup guides
   - Example implementations
   - Migration guides for existing MCP servers

2. **Developer Tools**:
   - CLI tool for scaffolding new servers
   - OAuth provider configuration helpers
   - Development mode with enhanced debugging
   - Testing utilities for OAuth flows

3. **Testing**:
   - Unit tests for all modules
   - Integration tests for OAuth flows
   - Example server testing
   - CI/CD pipeline setup

## Technical Architecture Decisions

### OAuth Flow Design
- **Browser-based flow**: More secure than device flow, better UX
- **PKCE required**: Modern security standard for public clients
- **Local callback server**: Temporary Express server for OAuth callbacks
- **Secure token storage**: Encrypted local storage with OS keychain integration

### MCP Integration
- **Composition over inheritance**: Wrap MCP SDK Server rather than deep inheritance
- **Middleware pattern**: Clean separation of auth and business logic
- **Tool-level auth**: Granular control over which tools require authentication
- **Request context**: Inject user/token info into tool execution context

### Provider Extensibility
- **Plugin architecture**: Easy to add new OAuth providers
- **Provider abstraction**: Common interface for different OAuth implementations
- **Configuration-driven**: Providers defined by configuration objects
- **Validation**: Strong typing and runtime validation for provider configs

## Success Metrics

### Developer Adoption
- **Lines of code reduction**: Target 90% reduction in OAuth boilerplate
- **Time to first working server**: Under 30 minutes from npm install
- **Community servers**: 10+ community-built servers using the framework

### Technical Quality
- **Test coverage**: 90%+ code coverage
- **Performance**: OAuth flow completes in <10 seconds
- **Security**: Pass security audit for OAuth implementation
- **Compatibility**: Works across Windows, macOS, Linux

### Ecosystem Growth
- **Package downloads**: Target 1000+ monthly downloads
- **GitHub stars**: 100+ stars indicating developer interest
- **Documentation quality**: 95%+ documentation coverage

## Risk Mitigation

### Security Risks
- **Token security**: Use OS keychain when available, encrypted filesystem fallback
- **CSRF protection**: Implement state parameter validation
- **Token exposure**: Never log tokens, secure cleanup on errors

### Technical Risks
- **MCP SDK changes**: Pin to specific version, test upgrades carefully
- **OAuth provider changes**: Abstract provider logic, maintain compatibility layers
- **Cross-platform issues**: Test on all major platforms, handle platform-specific paths

### Adoption Risks
- **Complex API**: Prioritize simple, intuitive API design
- **Poor documentation**: Invest heavily in examples and guides
- **Lack of examples**: Build multiple real-world examples beyond GitHub

## Implementation Timeline

**Week 1-2**: Phase 1 (Foundation)
**Week 3-4**: Phase 2 (Auth Module) 
**Week 5-6**: Phase 3 (Base Server)
**Week 7**: Phase 4 (Example)
**Week 8**: Phase 5 (Documentation & Polish)

Total estimated timeline: 8 weeks for full implementation and documentation.
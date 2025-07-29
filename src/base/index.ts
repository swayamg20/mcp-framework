// Main base server components
export { BaseMCPServer, type BaseMCPServerOptions } from './base-server.js';
export { ToolRegistry, type ToolRegistryOptions, type ToolExecutionContext } from './tool-registry.js';

// Base server types
export * from './types.js';

// Re-export shared types for convenience
export type {
  ToolDefinition,
  ToolHandler,
  RequestContext,
  ToolAuthRequirement,
  ServerConfig,
  OAuthProvider,
  OAuthTokens,
  AuthenticatedRequest,
  AuthenticationStatus,
  UserInfo,
  BaseError
} from '../shared/types.js';

// Re-export auth components that base servers might need
export { AuthManager, type AuthManagerOptions } from '../auth/auth-manager.js';
export type {
  AuthenticationOptions,
  AuthenticationResult,
  ProviderConfig,
  AuthEventHandlers
} from '../auth/types.js';
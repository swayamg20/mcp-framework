// Main authentication components
export { AuthManager, type AuthManagerOptions } from './auth-manager.js';
export { OAuthFlow, type OAuthFlowOptions } from './oauth-flow.js';
export { 
  FileTokenStore, 
  MemoryTokenStore, 
  createTokenStore,
  type FileTokenStoreOptions 
} from './token-store.js';

// Authentication types
export * from './types.js';

// Re-export shared types for convenience
export type {
  OAuthProvider,
  OAuthTokens,
  TokenStorage,
  AuthenticationStatus,
  AuthenticatedRequest,
  UserInfo,
  BaseError,
  OAuthFlowState,
  ServerConfig,
  ToolDefinition,
  ToolHandler,
  RequestContext
} from '../shared/types.js';

// Re-export useful utilities
export {
  generateSecureRandom,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
  validateProvider,
  createError,
  isTokenExpired,
  createStorageKey,
  validateScopes
} from '../shared/utils.js';
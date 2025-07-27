import { OAuthProvider, OAuthTokens, TokenStorage } from '../shared/types.js';

export interface AuthenticationOptions {
  provider: string;
  scopes?: string[];
  forceReauth?: boolean;
  timeout?: number;
  port?: number;
  host?: string;
}

export interface AuthenticationResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
  provider: string;
}

export interface TokenRefreshResult {
  success: boolean;
  tokens?: OAuthTokens;
  error?: string;
}

export interface AuthMiddlewareOptions {
  required?: boolean;
  scopes?: string[];
  provider?: string;
  onAuthRequired?: (options: AuthenticationOptions) => Promise<void>;
  onAuthFailed?: (error: Error) => void;
}

export interface ProviderConfig extends OAuthProvider {
  userInfoUrl?: string;
  revokeUrl?: string;
  defaultScopes?: string[];
  scopeSeparator?: string;
  responseType?: string;
  grantType?: string;
}

export interface AuthEventHandlers {
  onTokenRefresh?: (provider: string, tokens: OAuthTokens) => void;
  onAuthenticationRequired?: (provider: string, scopes?: string[]) => void;
  onAuthenticationSuccess?: (provider: string, tokens: OAuthTokens) => void;
  onAuthenticationError?: (provider: string, error: Error) => void;
  onTokenExpired?: (provider: string) => void;
}

export interface StorageBackend extends TokenStorage {
  name: string;
  initialize?: () => Promise<void>;
  destroy?: () => Promise<void>;
  migrate?: (fromBackend: StorageBackend) => Promise<void>;
}

export interface AuthorizationServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  revocation_endpoint?: string;
  scopes_supported?: string[];
  response_types_supported: string[];
  grant_types_supported?: string[];
  code_challenge_methods_supported?: string[];
}

export interface TokenIntrospectionResult {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string | string[];
}

export interface OAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}

export type AuthState = 
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'expired'
  | 'error';

export interface AuthStateChange {
  provider: string;
  previousState: AuthState;
  currentState: AuthState;
  timestamp: number;
  error?: Error;
}

export interface AuthSessionInfo {
  provider: string;
  state: AuthState;
  user?: {
    id: string;
    username?: string;
    email?: string;
    name?: string;
  };
  scopes?: string[];
  expiresAt?: number;
  lastActivity: number;
  createdAt: number;
}

export interface AuthCacheEntry {
  tokens: OAuthTokens;
  userInfo?: any;
  lastValidated: number;
  expiresAt: number;
}

export interface AuthMetrics {
  totalAuthentications: number;
  successfulAuthentications: number;
  failedAuthentications: number;
  tokenRefreshes: number;
  avgAuthTime: number;
  lastAuthTime?: number;
  providerStats: Record<string, {
    authentications: number;
    successes: number;
    failures: number;
    lastUsed?: number;
  }>;
}

export interface SecureStorageOptions {
  encrypt: boolean;
  encryptionKey?: string;
  keyDerivation?: {
    algorithm: string;
    iterations: number;
    salt?: string;
  };
  compression?: boolean;
}

export interface AuthFlowContext {
  sessionId: string;
  provider: string;
  startTime: number;
  redirectUri: string;
  state: string;
  codeVerifier: string;
  requestedScopes: string[];
  metadata?: Record<string, any>;
}

export interface DeviceAuthorizationResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
}

export interface DeviceAuthorizationOptions {
  provider: string;
  scopes?: string[];
  pollInterval?: number;
  timeout?: number;
  onUserCodeReceived?: (userCode: string, verificationUri: string) => void;
}

export type AuthMethodType = 'authorization_code' | 'device_code' | 'client_credentials' | 'refresh_token';

export interface AuthMethodConfig {
  type: AuthMethodType;
  enabled: boolean;
  options?: Record<string, any>;
}

export interface ProviderCapabilities {
  authorizationCode: boolean;
  deviceCode: boolean;
  clientCredentials: boolean;
  refreshToken: boolean;
  tokenIntrospection: boolean;
  tokenRevocation: boolean;
  userInfo: boolean;
  pkce: boolean;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessful?: boolean;
  onLimitReached?: (provider: string) => void;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export interface AuthHealthCheck {
  provider: string;
  healthy: boolean;
  lastCheck: number;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export interface BatchAuthRequest {
  providers: string[];
  scopes?: Record<string, string[]>;
  options?: Record<string, any>;
  parallel?: boolean;
}

export interface BatchAuthResult {
  successful: string[];
  failed: Record<string, Error>;
  tokens: Record<string, OAuthTokens>;
}
export interface OAuthProvider {
  name: string;
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string[];
  redirectUri?: string;
  additionalParams?: Record<string, string>;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  scope?: string[];
}

export interface TokenStorage {
  store(key: string, tokens: OAuthTokens): Promise<void>;
  retrieve(key: string): Promise<OAuthTokens | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface AuthenticationStatus {
  isAuthenticated: boolean;
  provider?: string;
  user?: UserInfo;
  expiresAt?: number;
  lastRefresh?: number;
}

export interface UserInfo {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  [key: string]: any;
}

export interface AuthenticatedRequest {
  tokens: OAuthTokens;
  user: UserInfo;
  provider: string;
  isValid: boolean;
}

export interface ToolAuthRequirement {
  required: boolean;
  scopes?: string[];
  provider?: string;
  message?: string;
}

export interface BaseError extends Error {
  code: string;
  statusCode?: number;
  provider?: string;
  details?: Record<string, any>;
}

export interface OAuthFlowState {
  state: string;
  codeVerifier: string;
  provider: string;
  redirectUri: string;
  createdAt: number;
}

export interface ServerConfig {
  providers: OAuthProvider[];
  tokenStorage?: TokenStorage;
  port?: number;
  host?: string;
  callbackPath?: string;
  successRedirect?: string;
  errorRedirect?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  auth?: ToolAuthRequirement;
  handler: ToolHandler;
}

export type ToolHandler = (
  params: any,
  context: RequestContext
) => Promise<any>;

export interface RequestContext {
  auth?: AuthenticatedRequest;
  server: any;
  tools: Map<string, ToolDefinition>;
}
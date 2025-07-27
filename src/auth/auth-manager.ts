import {
  OAuthProvider,
  OAuthTokens,
  TokenStorage,
  AuthenticationStatus,
  AuthenticatedRequest,
  UserInfo,
  BaseError
} from '../shared/types.js';
import {
  createError,
  createStorageKey,
  validateProvider,
  isTokenExpired,
  validateScopes
} from '../shared/utils.js';
import { OAuthFlow, OAuthFlowOptions } from './oauth-flow.js';
import { FileTokenStore } from './token-store.js';

export interface AuthManagerOptions {
  providers: OAuthProvider[];
  tokenStorage?: TokenStorage;
  autoRefresh?: boolean;
  onTokenRefresh?: (provider: string, tokens: OAuthTokens) => void;
  onAuthenticationRequired?: (provider: string, scopes?: string[]) => void;
}

export class AuthManager {
  private providers: Map<string, OAuthProvider> = new Map();
  private tokenStorage: TokenStorage;
  private oauthFlow: OAuthFlow;
  private autoRefresh: boolean;
  private onTokenRefresh?: (provider: string, tokens: OAuthTokens) => void;
  private onAuthenticationRequired?: (provider: string, scopes?: string[]) => void;

  constructor(options: AuthManagerOptions) {
    this.tokenStorage = options.tokenStorage || new FileTokenStore();
    this.oauthFlow = new OAuthFlow();
    this.autoRefresh = options.autoRefresh ?? true;
    if (options.onTokenRefresh) {
      this.onTokenRefresh = options.onTokenRefresh;
    }
    if (options.onAuthenticationRequired) {
      this.onAuthenticationRequired = options.onAuthenticationRequired;
    }

    // Register providers
    for (const provider of options.providers) {
      this.addProvider(provider);
    }
  }

  addProvider(provider: OAuthProvider): void {
    validateProvider(provider);
    this.providers.set(provider.name, provider);
  }

  removeProvider(providerName: string): void {
    this.providers.delete(providerName);
  }

  getProvider(providerName: string): OAuthProvider | undefined {
    return this.providers.get(providerName);
  }

  async authenticate(
    providerName: string,
    options?: Partial<OAuthFlowOptions>
  ): Promise<OAuthTokens> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      throw createError(
        'PROVIDER_NOT_FOUND',
        `OAuth provider '${providerName}' not found`,
        { provider: providerName }
      );
    }

    try {
      const tokens = await this.oauthFlow.startFlow({
        provider,
        ...options
      });

      // Store tokens
      const storageKey = createStorageKey(providerName);
      await this.tokenStorage.store(storageKey, tokens);

      return tokens;

    } catch (error) {
      throw createError(
        'AUTHENTICATION_FAILED',
        `Authentication failed for provider '${providerName}'`,
        {
          provider: providerName,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  async getAuthenticationStatus(providerName: string): Promise<AuthenticationStatus> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return { isAuthenticated: false };
    }

    try {
      const storageKey = createStorageKey(providerName);
      const tokens = await this.tokenStorage.retrieve(storageKey);

      if (!tokens) {
        return { isAuthenticated: false };
      }

      // Check if token is expired and can't be refreshed
      if (isTokenExpired(tokens.expiresAt)) {
        if (!tokens.refreshToken || !this.autoRefresh) {
          await this.tokenStorage.remove(storageKey);
          return { isAuthenticated: false };
        }

        // Try to refresh the token
        try {
          const newTokens = await this.refreshTokens(providerName);
          if (!newTokens) {
            return { isAuthenticated: false };
          }
        } catch {
          return { isAuthenticated: false };
        }
      }

      // Get user info if available
      let user: UserInfo | undefined;
      try {
        user = await this.getUserInfo(providerName);
      } catch {
        // User info fetch failed, but we're still authenticated
      }

      const status: AuthenticationStatus = {
        isAuthenticated: true,
        provider: providerName,
        lastRefresh: Date.now()
      };
      if (user) {
        status.user = user;
      }
      if (tokens.expiresAt !== undefined) {
        status.expiresAt = tokens.expiresAt;
      }
      return status;

    } catch {
      return { isAuthenticated: false };
    }
  }

  async getAuthenticatedRequest(
    providerName: string,
    requiredScopes?: string[]
  ): Promise<AuthenticatedRequest | null> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    const storageKey = createStorageKey(providerName);
    let tokens = await this.tokenStorage.retrieve(storageKey);

    if (!tokens) {
      return null;
    }

    // Check if token is expired and refresh if possible
    if (isTokenExpired(tokens.expiresAt)) {
      if (!tokens.refreshToken || !this.autoRefresh) {
        await this.tokenStorage.remove(storageKey);
        return null;
      }

      const refreshedTokens = await this.refreshTokens(providerName);
      if (!refreshedTokens) {
        return null;
      }
      tokens = refreshedTokens;
    }

    // Validate scopes if required
    if (requiredScopes && tokens.scope) {
      if (!validateScopes(requiredScopes, tokens.scope)) {
        throw createError(
          'INSUFFICIENT_SCOPE',
          `Token does not have required scopes: ${requiredScopes.join(', ')}`,
          {
            provider: providerName,
            requiredScopes,
            availableScopes: tokens.scope
          }
        );
      }
    }

    // Get user info
    let user: UserInfo;
    try {
      user = await this.getUserInfo(providerName);
    } catch (error) {
      throw createError(
        'USER_INFO_FAILED',
        'Failed to get user information',
        {
          provider: providerName,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }

    return {
      tokens,
      user,
      provider: providerName,
      isValid: true
    };
  }

  async getUserInfo(providerName: string): Promise<UserInfo> {
    const request = await this.getAuthenticatedRequest(providerName);
    if (!request) {
      throw createError(
        'NOT_AUTHENTICATED',
        `Not authenticated with provider '${providerName}'`,
        { provider: providerName }
      );
    }

    const provider = this.getProvider(providerName)!;
    const userInfoUrl = this.getUserInfoUrl(provider);

    if (!userInfoUrl) {
      throw createError(
        'USER_INFO_NOT_SUPPORTED',
        `Provider '${providerName}' does not support user info retrieval`,
        { provider: providerName }
      );
    }

    try {
      const response = await fetch(userInfoUrl, {
        headers: {
          'Authorization': `${request.tokens.tokenType || 'Bearer'} ${request.tokens.accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'MCP-OAuth-Framework/1.0'
        }
      });

      if (!response.ok) {
        throw createError(
          'USER_INFO_REQUEST_FAILED',
          `Failed to fetch user info: ${response.status} ${response.statusText}`,
          {
            provider: providerName,
            statusCode: response.status
          }
        );
      }

      const userData = await response.json();
      return this.normalizeUserInfo(provider, userData);

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }

      throw createError(
        'USER_INFO_NETWORK_ERROR',
        'Network error while fetching user info',
        {
          provider: providerName,
          originalError: (error as Error).message
        }
      );
    }
  }

  async refreshTokens(providerName: string): Promise<OAuthTokens | null> {
    const provider = this.getProvider(providerName);
    if (!provider) {
      return null;
    }

    const storageKey = createStorageKey(providerName);
    const tokens = await this.tokenStorage.retrieve(storageKey);

    if (!tokens?.refreshToken) {
      return null;
    }

    try {
      // Use the token store's refresh method if available
      if ('refreshToken' in this.tokenStorage && typeof this.tokenStorage.refreshToken === 'function') {
        const newTokens = await (this.tokenStorage as any).refreshToken(
          storageKey,
          tokens.refreshToken,
          provider
        );

        if (newTokens && this.onTokenRefresh) {
          this.onTokenRefresh(providerName, newTokens);
        }

        return newTokens;
      }

      // Fallback to manual refresh
      const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        client_id: provider.clientId
      });

      if (provider.clientSecret) {
        refreshParams.append('client_secret', provider.clientSecret);
      }

      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: refreshParams.toString()
      });

      if (!response.ok) {
        await this.tokenStorage.remove(storageKey);
        return null;
      }

      const tokenData = await response.json();

      if (tokenData.error) {
        await this.tokenStorage.remove(storageKey);
        return null;
      }

      const newTokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || tokens.refreshToken,
        tokenType: tokenData.token_type || tokens.tokenType,
        scope: tokenData.scope ? tokenData.scope.split(' ') : tokens.scope
      };

      if (tokenData.expires_in) {
        newTokens.expiresAt = Date.now() + (tokenData.expires_in * 1000);
      }

      await this.tokenStorage.store(storageKey, newTokens);

      if (this.onTokenRefresh) {
        this.onTokenRefresh(providerName, newTokens);
      }

      return newTokens;

    } catch (error) {
      // Remove invalid tokens
      await this.tokenStorage.remove(storageKey);
      return null;
    }
  }

  async revokeAuthentication(providerName: string): Promise<void> {
    const storageKey = createStorageKey(providerName);
    await this.tokenStorage.remove(storageKey);
  }

  async clearAllAuthentications(): Promise<void> {
    await this.tokenStorage.clear();
  }

  async getAuthenticatedProviders(): Promise<string[]> {
    const allProviders = Array.from(this.providers.keys());
    const authenticatedProviders: string[] = [];

    for (const providerName of allProviders) {
      const status = await this.getAuthenticationStatus(providerName);
      if (status.isAuthenticated) {
        authenticatedProviders.push(providerName);
      }
    }

    return authenticatedProviders;
  }

  private getUserInfoUrl(provider: OAuthProvider): string | null {
    // This should be configurable in the provider config
    // For now, we'll use common patterns
    const urlMap: Record<string, string> = {
      'github': 'https://api.github.com/user',
      'google': 'https://www.googleapis.com/oauth2/v2/userinfo',
      'microsoft': 'https://graph.microsoft.com/v1.0/me',
      'slack': 'https://slack.com/api/users.identity'
    };

    return urlMap[provider.name.toLowerCase()] || null;
  }

  private normalizeUserInfo(provider: OAuthProvider, userData: any): UserInfo {
    // Normalize user data based on provider
    const providerName = provider.name.toLowerCase();

    switch (providerName) {
      case 'github':
        return {
          id: userData.id?.toString(),
          username: userData.login,
          email: userData.email,
          name: userData.name,
          avatarUrl: userData.avatar_url
        };

      case 'google':
        return {
          id: userData.id,
          username: userData.email,
          email: userData.email,
          name: userData.name,
          avatarUrl: userData.picture
        };

      case 'microsoft':
        return {
          id: userData.id,
          username: userData.userPrincipalName,
          email: userData.mail || userData.userPrincipalName,
          name: userData.displayName,
          avatarUrl: userData.photo?.['@odata.mediaContentType'] ? undefined : userData.photo
        };

      default:
        // Generic fallback
        return {
          id: userData.id?.toString() || userData.sub?.toString(),
          username: userData.username || userData.login || userData.preferred_username,
          email: userData.email,
          name: userData.name || userData.displayName,
          avatarUrl: userData.avatar_url || userData.picture || userData.photo
        };
    }
  }

  async cleanup(): Promise<void> {
    await this.oauthFlow.cleanup();
  }
}
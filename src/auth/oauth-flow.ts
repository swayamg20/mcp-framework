import express from 'express';
import { Server } from 'http';
import open from 'open';
import {
  OAuthProvider,
  OAuthTokens,
  OAuthFlowState,
  BaseError
} from '../shared/types.js';
import {
  generateSecureRandom,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthorizationUrl,
  parseQueryString,
  createError,
  buildCallbackUrl,
  getDefaultHost,
  getDefaultPort,
  getDefaultCallbackPath
} from '../shared/utils.js';

export interface OAuthFlowOptions {
  provider: OAuthProvider;
  port?: number;
  host?: string;
  callbackPath?: string;
  timeout?: number;
  onSuccess?: (tokens: OAuthTokens) => void;
  onError?: (error: BaseError) => void;
}

export class OAuthFlow {
  private app: express.Application;
  private server: Server | null = null;
  private flowState: Map<string, OAuthFlowState> = new Map();
  private pendingFlows: Map<string, {
    resolve: (tokens: OAuthTokens) => void;
    reject: (error: BaseError) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  async startFlow(options: OAuthFlowOptions): Promise<OAuthTokens> {
    const {
      provider,
      port = getDefaultPort(),
      host = getDefaultHost(),
      callbackPath = getDefaultCallbackPath(),
      timeout = 300000 // 5 minutes
    } = options;

    return new Promise((resolve, reject) => {
      const state = generateSecureRandom(32);
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const redirectUri = buildCallbackUrl(host, port, callbackPath);

      // Store flow state
      const flowState: OAuthFlowState = {
        state,
        codeVerifier,
        provider: provider.name,
        redirectUri,
        createdAt: Date.now()
      };

      this.flowState.set(state, flowState);

      // Setup promise handlers with timeout
      const timeoutHandle = setTimeout(() => {
        this.pendingFlows.delete(state);
        this.flowState.delete(state);
        reject(createError(
          'OAUTH_TIMEOUT',
          'OAuth flow timed out',
          { provider: provider.name, timeout }
        ));
      }, timeout);

      this.pendingFlows.set(state, {
        resolve,
        reject,
        timeout: timeoutHandle
      });

      // Start callback server
      this.startCallbackServer(port, host)
        .then(() => {
          // Build authorization URL and open browser
          const authUrl = buildAuthorizationUrl(
            provider,
            state,
            codeChallenge,
            redirectUri
          );

          return this.openBrowser(authUrl);
        })
        .catch((error) => {
          this.pendingFlows.delete(state);
          this.flowState.delete(state);
          clearTimeout(timeoutHandle);
          reject(createError(
            'OAUTH_SETUP_FAILED',
            'Failed to setup OAuth flow',
            { provider: provider.name, originalError: error.message }
          ));
        });
    });
  }

  private async startCallbackServer(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        return resolve();
      }

      this.server = this.app.listen(port, host, () => {
        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(createError(
            'PORT_IN_USE',
            `Port ${port} is already in use`,
            { port, host }
          ));
        } else {
          reject(createError(
            'SERVER_START_FAILED',
            'Failed to start callback server',
            { port, host, originalError: error.message }
          ));
        }
      });
    });
  }

  private async openBrowser(url: string): Promise<void> {
    try {
      await open(url);
    } catch (error) {
      throw createError(
        'BROWSER_OPEN_FAILED',
        'Failed to open browser for OAuth authorization',
        { url, originalError: (error as Error).message }
      );
    }
  }

  private setupRoutes(): void {
    // OAuth callback route
    this.app.get('/oauth/callback', (req, res) => {
      this.handleCallback(req, res);
    });

    // Health check route
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: Date.now() });
    });

    // Default route for OAuth errors
    this.app.get('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: 'OAuth callback endpoint not found'
      });
    });
  }

  private async handleCallback(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { code, state, error: oauthError, error_description } = req.query as Record<string, string>;

      // Handle OAuth errors
      if (oauthError) {
        const errorMessage = error_description || oauthError;
        this.handleCallbackError(
          state,
          createError('OAUTH_AUTHORIZATION_FAILED', errorMessage, {
            oauthError,
            error_description
          }),
          res
        );
        return;
      }

      // Validate required parameters
      if (!code || !state) {
        this.handleCallbackError(
          state,
          createError('OAUTH_INVALID_CALLBACK', 'Missing code or state parameter'),
          res
        );
        return;
      }

      // Retrieve flow state
      const flowState = this.flowState.get(state);
      if (!flowState) {
        this.handleCallbackError(
          state,
          createError('OAUTH_INVALID_STATE', 'Invalid or expired state parameter'),
          res
        );
        return;
      }

      // Exchange authorization code for tokens
      const tokens = await this.exchangeCodeForTokens(code, flowState);

      // Clean up
      this.flowState.delete(state);
      const pendingFlow = this.pendingFlows.get(state);
      if (pendingFlow) {
        clearTimeout(pendingFlow.timeout);
        this.pendingFlows.delete(state);
        
        // Send success response
        res.send(this.getSuccessPage());
        
        // Resolve the promise
        pendingFlow.resolve(tokens);
      } else {
        res.status(500).send(this.getErrorPage('Flow state not found'));
      }

    } catch (error) {
      const { state } = req.query as Record<string, string>;
      this.handleCallbackError(
        state,
        error instanceof Error && 'code' in error ? error as BaseError : createError(
          'OAUTH_CALLBACK_ERROR',
          'Unexpected error during OAuth callback',
          { originalError: error instanceof Error ? error.message : String(error) }
        ),
        res
      );
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    flowState: OAuthFlowState
  ): Promise<OAuthTokens> {
    const provider = this.getProviderFromState(flowState);
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      code,
      redirect_uri: flowState.redirectUri,
      code_verifier: flowState.codeVerifier
    });

    // Add client secret if provided (not needed for PKCE)
    if (provider.clientSecret) {
      tokenParams.append('client_secret', provider.clientSecret);
    }

    try {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: tokenParams.toString()
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw createError(
          'TOKEN_EXCHANGE_FAILED',
          `Token exchange failed: ${response.status} ${response.statusText}`,
          { 
            provider: provider.name,
            statusCode: response.status,
            responseBody: errorData
          }
        );
      }

      const tokenData = await response.json();

      if (tokenData.error) {
        throw createError(
          'TOKEN_EXCHANGE_ERROR',
          tokenData.error_description || tokenData.error,
          {
            provider: provider.name,
            oauthError: tokenData.error,
            errorDescription: tokenData.error_description
          }
        );
      }

      // Parse token response
      const tokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope ? tokenData.scope.split(' ') : provider.scope
      };

      // Calculate expiration time
      if (tokenData.expires_in) {
        tokens.expiresAt = Date.now() + (tokenData.expires_in * 1000);
      }

      return tokens;

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      
      throw createError(
        'TOKEN_EXCHANGE_NETWORK_ERROR',
        'Network error during token exchange',
        { 
          provider: provider.name,
          originalError: (error as Error).message
        }
      );
    }
  }

  private getProviderFromState(flowState: OAuthFlowState): OAuthProvider {
    // This would normally come from a provider registry
    // For now, we'll throw an error to indicate it needs to be implemented
    throw createError(
      'PROVIDER_NOT_FOUND',
      `Provider '${flowState.provider}' not found in registry`,
      { provider: flowState.provider }
    );
  }

  private handleCallbackError(
    state: string | undefined,
    error: BaseError,
    res: express.Response
  ): void {
    // Clean up state
    if (state) {
      this.flowState.delete(state);
      const pendingFlow = this.pendingFlows.get(state);
      if (pendingFlow) {
        clearTimeout(pendingFlow.timeout);
        this.pendingFlows.delete(state);
        pendingFlow.reject(error);
      }
    }

    // Send error response
    res.status(error.statusCode || 400).send(this.getErrorPage(error.message));
  }

  private getSuccessPage(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { color: #6c757d; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="success">✅ Authentication Successful</div>
        <div class="message">You can now close this window and return to your application.</div>
        <script>
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `;
  }

  private getErrorPage(errorMessage: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; text-align: center; padding: 50px; }
          .error { color: #dc3545; font-size: 24px; margin-bottom: 20px; }
          .message { color: #6c757d; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="error">❌ Authentication Failed</div>
        <div class="message">${errorMessage}</div>
        <div class="message" style="margin-top: 20px;">You can close this window and try again.</div>
      </body>
      </html>
    `;
  }

  async cleanup(): Promise<void> {
    // Cancel all pending flows
    for (const [state, pendingFlow] of this.pendingFlows) {
      clearTimeout(pendingFlow.timeout);
      pendingFlow.reject(createError(
        'OAUTH_CANCELLED',
        'OAuth flow was cancelled during cleanup'
      ));
    }
    this.pendingFlows.clear();
    this.flowState.clear();

    // Close server
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }
}
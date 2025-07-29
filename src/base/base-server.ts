import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  ServerConfig,
  OAuthProvider,
  ToolDefinition,
  RequestContext,
  AuthenticatedRequest,
  BaseError
} from '../shared/types.js';
import {
  createError,
  getDefaultPort,
  getDefaultHost,
  getDefaultCallbackPath
} from '../shared/utils.js';
import { AuthManager, AuthManagerOptions } from '../auth/auth-manager.js';
import { ToolRegistry } from './tool-registry.js';

export interface BaseMCPServerOptions {
  name: string;
  version: string;
  providers?: OAuthProvider[];
  authOptions?: Partial<AuthManagerOptions>;
  serverConfig?: Partial<ServerConfig>;
  debug?: boolean;
}

export abstract class BaseMCPServer {
  protected server: Server;
  protected authManager: AuthManager;
  protected toolRegistry: ToolRegistry;
  protected config: ServerConfig;
  protected debug: boolean;
  protected serverName: string;

  constructor(options: BaseMCPServerOptions) {
    this.serverName = options.name;
    this.debug = options.debug ?? false;
    
    // Setup configuration
    this.config = {
      providers: options.providers || [],
      port: options.serverConfig?.port || getDefaultPort(),
      host: options.serverConfig?.host || getDefaultHost(),
      callbackPath: options.serverConfig?.callbackPath || getDefaultCallbackPath(),
      ...options.serverConfig
    };

    // Initialize MCP server
    this.server = new Server(
      {
        name: options.name,
        version: options.version
      }
    );

    // Initialize auth manager
    const authOptions: AuthManagerOptions = {
      providers: this.config.providers,
      ...options.authOptions
    };
    if (this.config.tokenStorage) {
      authOptions.tokenStorage = this.config.tokenStorage;
    }
    this.authManager = new AuthManager(authOptions);

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry({
      authManager: this.authManager,
      debug: this.debug
    });

    this.setupMCPHandlers();
    this.log('BaseMCPServer initialized');
  }

  protected setupMCPHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = await this.toolRegistry.listTools();
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await this.toolRegistry.executeTool(name, args || {});
        return {
          content: [
            {
              type: 'text' as const,
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`Tool execution failed: ${errorMessage}`);
        
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }

  protected addTool(definition: ToolDefinition): void {
    this.toolRegistry.registerTool(definition);
    this.log(`Registered tool: ${definition.name}`);
  }

  protected async requireAuth(provider: string, scopes?: string[]): Promise<AuthenticatedRequest> {
    const authRequest = await this.authManager.getAuthenticatedRequest(provider, scopes);
    
    if (!authRequest) {
      // Trigger authentication flow
      await this.authManager.authenticate(provider);
      
      // Retry getting authenticated request
      const retryRequest = await this.authManager.getAuthenticatedRequest(provider, scopes);
      if (!retryRequest) {
        throw createError(
          'AUTHENTICATION_REQUIRED',
          `Authentication required for provider: ${provider}`,
          { provider, scopes }
        );
      }
      return retryRequest;
    }
    
    return authRequest;
  }

  protected async makeAuthenticatedRequest(
    provider: string,
    url: string,
    options: RequestInit = {},
    requiredScopes?: string[]
  ): Promise<Response> {
    const auth = await this.requireAuth(provider, requiredScopes);
    
    const headers = {
      'Authorization': `${auth.tokens.tokenType || 'Bearer'} ${auth.tokens.accessToken}`,
      'Accept': 'application/json',
      'User-Agent': `${this.serverName}/1.0`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw createError(
        'API_REQUEST_FAILED',
        `API request failed: ${response.status} ${response.statusText}`,
        {
          provider,
          url,
          statusCode: response.status,
          statusText: response.statusText
        }
      );
    }

    return response;
  }

  protected createRequestContext(toolName: string, auth?: AuthenticatedRequest): RequestContext {
    const context: RequestContext = {
      server: this,
      tools: this.toolRegistry.getToolDefinitions()
    };
    if (auth) {
      context.auth = auth;
    }
    return context;
  }

  async start(transport?: any): Promise<void> {
    try {
      // Allow custom transport or default to stdio
      const serverTransport = transport || new StdioServerTransport();
      
      this.log('Starting MCP server...');
      
      // Connect to transport
      await this.server.connect(serverTransport);
      
      this.log('MCP server started successfully');
      
      // Call abstract initialization method
      await this.initialize();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to start server: ${errorMessage}`);
      throw createError(
        'SERVER_START_FAILED',
        'Failed to start MCP server',
        { originalError: errorMessage }
      );
    }
  }

  async stop(): Promise<void> {
    try {
      this.log('Stopping MCP server...');
      
      // Cleanup auth manager
      await this.authManager.cleanup();
      
      // Call abstract cleanup method
      await this.cleanup();
      
      // Close server
      await this.server.close();
      
      this.log('MCP server stopped');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Error during server shutdown: ${errorMessage}`);
      throw createError(
        'SERVER_STOP_FAILED',
        'Failed to stop MCP server',
        { originalError: errorMessage }
      );
    }
  }

  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.serverName}]`;
      console.error(`${prefix} ${message}`);
    }
  }

  // Abstract methods that subclasses must implement
  protected abstract initialize(): Promise<void>;
  protected abstract cleanup(): Promise<void>;

  // Utility methods for subclasses
  protected getAuthManager(): AuthManager {
    return this.authManager;
  }

  protected getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  protected getConfig(): ServerConfig {
    return this.config;
  }

  protected async getAuthenticationStatus(provider: string) {
    return this.authManager.getAuthenticationStatus(provider);
  }

  protected async authenticateProvider(provider: string) {
    return this.authManager.authenticate(provider);
  }

  protected async revokeAuthentication(provider: string) {
    return this.authManager.revokeAuthentication(provider);
  }

  protected async getAuthenticatedProviders() {
    return this.authManager.getAuthenticatedProviders();
  }
}
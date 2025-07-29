import { Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  ToolDefinition,
  ToolHandler,
  RequestContext,
  ToolAuthRequirement,
  AuthenticatedRequest,
  BaseError
} from '../shared/types.js';
import {
  createError,
  validateScopes
} from '../shared/utils.js';
import { AuthManager } from '../auth/auth-manager.js';

export interface ToolRegistryOptions {
  authManager: AuthManager;
  debug?: boolean;
}

export interface ToolExecutionContext {
  toolName: string;
  params: any;
  startTime: number;
  auth?: AuthenticatedRequest;
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private authManager: AuthManager;
  private debug: boolean;
  private executionHistory: ToolExecutionContext[] = [];

  constructor(options: ToolRegistryOptions) {
    this.authManager = options.authManager;
    this.debug = options.debug ?? false;
  }

  registerTool(definition: ToolDefinition): void {
    // Validate tool definition
    this.validateToolDefinition(definition);
    
    // Store tool
    this.tools.set(definition.name, definition);
    
    this.log(`Tool registered: ${definition.name}`);
  }

  unregisterTool(name: string): boolean {
    const removed = this.tools.delete(name);
    if (removed) {
      this.log(`Tool unregistered: ${name}`);
    }
    return removed;
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolDefinitions(): Map<string, ToolDefinition> {
    return new Map(this.tools);
  }

  async listTools(): Promise<Tool[]> {
    const mcpTools: Tool[] = [];
    
    for (const [name, definition] of this.tools) {
      const mcpTool: Tool = {
        name,
        description: definition.description,
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      };

      // Add auth information to description if required
      if (definition.auth?.required) {
        const authInfo = this.formatAuthRequirement(definition.auth);
        mcpTool.description += `\n\n🔐 ${authInfo}`;
      }

      mcpTools.push(mcpTool);
    }

    return mcpTools.sort((a, b) => a.name.localeCompare(b.name));
  }

  async executeTool(name: string, params: any): Promise<any> {
    const definition = this.tools.get(name);
    if (!definition) {
      throw createError(
        'TOOL_NOT_FOUND',
        `Tool '${name}' not found`,
        { toolName: name }
      );
    }

    const startTime = Date.now();
    let auth: AuthenticatedRequest | undefined;

    try {
      // Handle authentication if required
      if (definition.auth?.required) {
        auth = await this.handleToolAuthentication(definition.auth, name);
      }

      // Create execution context
      const context: RequestContext = {
        server: null, // Will be set by BaseMCPServer
        tools: this.tools
      };
      if (auth) {
        context.auth = auth;
      }

      // Execute tool with context
      this.log(`Executing tool: ${name}`);
      const result = await definition.handler(params, context);

      // Record successful execution
      const execContext: ToolExecutionContext = {
        toolName: name,
        params,
        startTime
      };
      if (auth) {
        execContext.auth = auth;
      }
      this.recordExecution(execContext);

      return result;

    } catch (error) {
      this.log(`Tool execution failed: ${name} - ${error instanceof Error ? error.message : String(error)}`, 'error');
      
      // Record failed execution
      const execContext: ToolExecutionContext = {
        toolName: name,
        params,
        startTime
      };
      if (auth) {
        execContext.auth = auth;
      }
      this.recordExecution(execContext);

      throw error;
    }
  }

  private async handleToolAuthentication(
    authRequirement: ToolAuthRequirement,
    toolName: string
  ): Promise<AuthenticatedRequest> {
    const provider = authRequirement.provider;
    if (!provider) {
      throw createError(
        'MISSING_AUTH_PROVIDER',
        `Tool '${toolName}' requires authentication but no provider specified`,
        { toolName }
      );
    }

    // Get authenticated request
    const authRequest = await this.authManager.getAuthenticatedRequest(
      provider,
      authRequirement.scopes
    );

    if (!authRequest) {
      // Show custom message if provided
      const message = authRequirement.message || 
        `Authentication required for ${provider} to use '${toolName}'`;
      
      throw createError(
        'AUTHENTICATION_REQUIRED',
        message,
        {
          toolName,
          provider,
          scopes: authRequirement.scopes
        }
      );
    }

    // Validate scopes if specified
    if (authRequirement.scopes && authRequest.tokens.scope) {
      if (!validateScopes(authRequirement.scopes, authRequest.tokens.scope)) {
        throw createError(
          'INSUFFICIENT_SCOPE',
          `Tool '${toolName}' requires scopes: ${authRequirement.scopes.join(', ')}`,
          {
            toolName,
            provider,
            requiredScopes: authRequirement.scopes,
            availableScopes: authRequest.tokens.scope
          }
        );
      }
    }

    return authRequest;
  }

  private validateToolDefinition(definition: ToolDefinition): void {
    const errors: string[] = [];

    if (!definition.name?.trim()) {
      errors.push('Tool name is required');
    }

    if (!definition.description?.trim()) {
      errors.push('Tool description is required');
    }

    if (typeof definition.handler !== 'function') {
      errors.push('Tool handler must be a function');
    }

    // Validate tool name format
    if (definition.name && !/^[a-z][a-z0-9_-]*[a-z0-9]$/.test(definition.name)) {
      errors.push('Tool name must be lowercase, start with a letter, and contain only letters, numbers, hyphens, and underscores');
    }

    // Check for duplicate registration
    if (this.tools.has(definition.name)) {
      errors.push(`Tool '${definition.name}' is already registered`);
    }

    // Validate auth requirement if present
    if (definition.auth) {
      this.validateAuthRequirement(definition.auth, errors);
    }

    if (errors.length > 0) {
      throw createError(
        'INVALID_TOOL_DEFINITION',
        `Tool definition validation failed: ${errors.join(', ')}`,
        {
          toolName: definition.name,
          errors
        }
      );
    }
  }

  private validateAuthRequirement(auth: ToolAuthRequirement, errors: string[]): void {
    if (auth.required && !auth.provider) {
      errors.push('Provider must be specified when authentication is required');
    }

    if (auth.scopes && !Array.isArray(auth.scopes)) {
      errors.push('Scopes must be an array of strings');
    }

    if (auth.scopes && auth.scopes.some(scope => typeof scope !== 'string')) {
      errors.push('All scopes must be strings');
    }
  }

  private formatAuthRequirement(auth: ToolAuthRequirement): string {
    const parts = [];
    
    if (auth.provider) {
      parts.push(`Requires ${auth.provider} authentication`);
    } else {
      parts.push('Requires authentication');
    }

    if (auth.scopes && auth.scopes.length > 0) {
      parts.push(`with scopes: ${auth.scopes.join(', ')}`);
    }

    return parts.join(' ');
  }

  private recordExecution(context: ToolExecutionContext): void {
    // Keep last 100 executions for debugging
    this.executionHistory.push(context);
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }
  }

  getExecutionHistory(): ToolExecutionContext[] {
    return [...this.executionHistory];
  }

  getToolStats(): Record<string, { executions: number; lastUsed?: number }> {
    const stats: Record<string, { executions: number; lastUsed?: number }> = {};
    
    for (const toolName of this.tools.keys()) {
      stats[toolName] = { executions: 0 };
    }

    for (const execution of this.executionHistory) {
      const toolStats = stats[execution.toolName];
      if (!toolStats) {
        stats[execution.toolName] = { executions: 1, lastUsed: execution.startTime };
      } else {
        toolStats.executions++;
        toolStats.lastUsed = Math.max(
          toolStats.lastUsed || 0,
          execution.startTime
        );
      }
    }

    return stats;
  }

  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  // Tool discovery and categorization
  getToolsByProvider(provider?: string): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    
    for (const definition of this.tools.values()) {
      if (!provider || definition.auth?.provider === provider) {
        tools.push(definition);
      }
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  getAuthenticatedTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.auth?.required)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  getPublicTools(): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(tool => !tool.auth?.required)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Batch operations
  registerTools(definitions: ToolDefinition[]): void {
    for (const definition of definitions) {
      this.registerTool(definition);
    }
  }

  unregisterTools(names: string[]): number {
    let removed = 0;
    for (const name of names) {
      if (this.unregisterTool(name)) {
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    const toolNames = Array.from(this.tools.keys());
    this.tools.clear();
    this.clearExecutionHistory();
    this.log(`Cleared ${toolNames.length} tools from registry`);
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.debug) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [ToolRegistry]`;
      console.error(`${prefix} ${message}`);
    }
  }
}
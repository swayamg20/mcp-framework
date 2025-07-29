import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolDefinition, RequestContext, OAuthProvider } from '../shared/types.js';
import { AuthManager } from '../auth/index.js';
import { ToolRegistry } from './tool-registry.js';

export interface MCPServerInfo {
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
}

export interface ServerCapabilities {
  tools: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

export interface ServerTransportConfig {
  type: 'stdio' | 'sse' | 'websocket';
  options?: Record<string, any>;
}

export interface ToolCategory {
  name: string;
  description: string;
  tools: string[];
  icon?: string;
  color?: string;
}

export interface ToolValidationRule {
  field: string;
  type: 'required' | 'type' | 'format' | 'range' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | string;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  returns?: {
    type: string;
    description: string;
    schema?: Record<string, any>;
  };
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    result?: any;
  }>;
}

export interface ToolMetadata {
  category?: string;
  tags?: string[];
  version?: string;
  deprecated?: boolean;
  experimental?: boolean;
  rateLimit?: {
    requests: number;
    period: number; // milliseconds
  };
  cacheable?: boolean;
  cacheTtl?: number; // milliseconds
}

export interface EnhancedToolDefinition extends ToolDefinition {
  schema?: ToolSchema;
  metadata?: ToolMetadata;
  validation?: ToolValidationRule[];
  middleware?: ToolMiddleware[];
}

export type ToolMiddleware = (
  params: any,
  context: RequestContext,
  next: () => Promise<any>
) => Promise<any>;

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: Error;
  executionTime: number;
  cached?: boolean;
  metadata?: Record<string, any>;
}

export interface ServerMiddleware {
  name: string;
  priority: number;
  handler: (context: MiddlewareContext, next: () => Promise<void>) => Promise<void>;
}

export interface MiddlewareContext extends RequestContext {
  request: any;
  response?: any;
  metadata: Record<string, any>;
}

export interface ServerPlugin {
  name: string;
  version: string;
  description: string;
  install: (server: any) => Promise<void>;
  uninstall?: (server: any) => Promise<void>;
  dependencies?: string[];
}

export interface ServerState {
  status: 'initializing' | 'ready' | 'error' | 'stopped';
  startTime: number;
  lastActivity?: number;
  toolCount: number;
  authenticatedProviders: string[];
  requestCount: number;
  errorCount: number;
}

export interface ServerMetrics {
  uptime: number;
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  toolUsage: Record<string, { count: number; averageTime: number }>;
  authenticationEvents: number;
  cacheHitRate?: number;
}

export interface ServerEvents {
  'server:started': { timestamp: number };
  'server:stopped': { timestamp: number };
  'server:error': { error: Error; timestamp: number };
  'tool:registered': { toolName: string; timestamp: number };
  'tool:unregistered': { toolName: string; timestamp: number };
  'tool:executed': { toolName: string; executionTime: number; timestamp: number };
  'tool:failed': { toolName: string; error: Error; timestamp: number };
  'auth:success': { provider: string; timestamp: number };
  'auth:failed': { provider: string; error: Error; timestamp: number };
  'auth:revoked': { provider: string; timestamp: number };
}

export type ServerEventHandler<T = any> = (data: T) => void | Promise<void>;

export interface ServerEventEmitter {
  on<K extends keyof ServerEvents>(event: K, handler: ServerEventHandler<ServerEvents[K]>): void;
  off<K extends keyof ServerEvents>(event: K, handler: ServerEventHandler<ServerEvents[K]>): void;
  emit<K extends keyof ServerEvents>(event: K, data: ServerEvents[K]): Promise<void>;
}

export interface ProviderMetadata {
  name: string;
  displayName: string;
  description: string;
  iconUrl?: string;
  website?: string;
  documentation?: string;
  supportedScopes: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
  setupInstructions?: string;
}

export interface ToolCache {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
}

export interface RateLimiter {
  check(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
  reset(key: string): Promise<void>;
}

export interface ServerHealthCheck {
  name: string;
  check: () => Promise<{ healthy: boolean; message?: string; details?: any }>;
  critical?: boolean;
  timeout?: number;
}

export interface ServerConfiguration {
  server: MCPServerInfo;
  transport: ServerTransportConfig;
  auth: {
    providers: OAuthProvider[];
    options?: Record<string, any>;
  };
  tools: {
    categories?: ToolCategory[];
    middleware?: string[];
    validation?: boolean;
    caching?: {
      enabled: boolean;
      defaultTtl: number;
      maxSize: number;
    };
  };
  security: {
    rateLimit?: {
      enabled: boolean;
      requests: number;
      window: number;
    };
    cors?: {
      enabled: boolean;
      origins: string[];
    };
  };
  monitoring: {
    enabled: boolean;
    metrics?: boolean;
    logging?: {
      level: 'debug' | 'info' | 'warn' | 'error';
      format: 'json' | 'text';
    };
  };
}

export interface DevServerOptions {
  hotReload?: boolean;
  mockAuth?: boolean;
  debugMode?: boolean;
  playground?: boolean;
  apiExplorer?: boolean;
}

export interface ServerFactory {
  create(config: ServerConfiguration): Promise<any>;
  validate(config: ServerConfiguration): Promise<boolean>;
  getDefaults(): ServerConfiguration;
}

export interface ToolBuilder {
  name(name: string): ToolBuilder;
  description(description: string): ToolBuilder;
  auth(requirement: { provider: string; scopes?: string[] }): ToolBuilder;
  parameter(name: string, type: string, required?: boolean, description?: string): ToolBuilder;
  handler(handler: (params: any, context: RequestContext) => Promise<any>): ToolBuilder;
  middleware(middleware: ToolMiddleware): ToolBuilder;
  metadata(metadata: Partial<ToolMetadata>): ToolBuilder;
  build(): EnhancedToolDefinition;
}

export interface ServerBuilder {
  name(name: string): ServerBuilder;
  version(version: string): ServerBuilder;
  description(description: string): ServerBuilder;
  provider(provider: OAuthProvider): ServerBuilder;
  tool(tool: ToolDefinition | EnhancedToolDefinition): ServerBuilder;
  middleware(middleware: ServerMiddleware): ServerBuilder;
  plugin(plugin: ServerPlugin): ServerBuilder;
  config(config: Partial<ServerConfiguration>): ServerBuilder;
  build(): any;
}
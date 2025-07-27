import { BaseError, OAuthProvider } from './types.js';
import { createHash, randomBytes } from 'crypto';

export function generateSecureRandom(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32));
}

export function generateCodeChallenge(codeVerifier: string): string {
  const hash = createHash('sha256').update(codeVerifier).digest();
  return base64UrlEncode(hash);
}

export function base64UrlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64UrlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function buildAuthorizationUrl(
  provider: OAuthProvider,
  state: string,
  codeChallenge: string,
  redirectUri: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    scope: provider.scope.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...provider.additionalParams,
  });

  return `${provider.authorizationUrl}?${params.toString()}`;
}

export function validateProvider(provider: OAuthProvider): void {
  const errors: string[] = [];

  if (!provider.name?.trim()) {
    errors.push('Provider name is required');
  }

  if (!provider.clientId?.trim()) {
    errors.push('Client ID is required');
  }

  if (!isValidUrl(provider.authorizationUrl)) {
    errors.push('Invalid authorization URL');
  }

  if (!isValidUrl(provider.tokenUrl)) {
    errors.push('Invalid token URL');
  }

  if (!Array.isArray(provider.scope) || provider.scope.length === 0) {
    errors.push('At least one scope is required');
  }

  if (provider.redirectUri && !isValidUrl(provider.redirectUri)) {
    errors.push('Invalid redirect URI');
  }

  if (errors.length > 0) {
    throw createError('INVALID_PROVIDER', `Provider validation failed: ${errors.join(', ')}`, {
      provider: provider.name,
      errors,
    });
  }
}

export function createError(
  code: string,
  message: string,
  details?: Record<string, any>,
  statusCode?: number
): BaseError {
  const error = new Error(message) as BaseError;
  error.code = code;
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  if (details !== undefined) {
    error.details = details;
  }
  return error;
}

export function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return Date.now() >= expiresAt;
}

export function calculateTokenExpiry(expiresInSeconds: number): number {
  return Date.now() + (expiresInSeconds * 1000);
}

export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

export function parseQueryString(query: string): Record<string, string> {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createStorageKey(provider: string, suffix?: string): string {
  const key = `mcp-oauth:${provider}`;
  return suffix ? `${key}:${suffix}` : key;
}

export function validateScopes(required: string[], available: string[]): boolean {
  return required.every(scope => available.includes(scope));
}

export function maskToken(token: string): string {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

export function getDefaultPort(): number {
  return 8080;
}

export function getDefaultHost(): string {
  return 'localhost';
}

export function getDefaultCallbackPath(): string {
  return '/oauth/callback';
}

export function buildCallbackUrl(host: string, port: number, path: string): string {
  return `http://${host}:${port}${path}`;
}
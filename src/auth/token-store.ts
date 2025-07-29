import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { createHash, createCipheriv, createDecipheriv, randomBytes as cryptoRandomBytes } from 'crypto';
import {
  OAuthTokens,
  TokenStorage,
  BaseError
} from '../shared/types.js';
import {
  createError,
  isTokenExpired,
  createStorageKey,
  maskToken
} from '../shared/utils.js';

export interface FileTokenStoreOptions {
  storageDir?: string;
  encrypt?: boolean;
  encryptionKey?: string;
}

export class FileTokenStore implements TokenStorage {
  private storageDir: string;
  private encrypt: boolean;
  private encryptionKey: string;

  constructor(options: FileTokenStoreOptions = {}) {
    this.storageDir = options.storageDir || join(homedir(), '.mcp-oauth');
    this.encrypt = options.encrypt ?? true;
    this.encryptionKey = options.encryptionKey || this.generateDefaultKey();
    
    this.ensureStorageDir();
  }

  async store(key: string, tokens: OAuthTokens): Promise<void> {
    try {
      const filePath = this.getTokenFilePath(key);
      const data = this.encrypt ? this.encryptData(tokens) : JSON.stringify(tokens);
      
      await fs.writeFile(filePath, data, { mode: 0o600 }); // Read/write for owner only
      
    } catch (error) {
      throw createError(
        'TOKEN_STORE_FAILED',
        'Failed to store tokens',
        {
          key: maskToken(key),
          originalError: (error as Error).message
        }
      );
    }
  }

  async retrieve(key: string): Promise<OAuthTokens | null> {
    try {
      const filePath = this.getTokenFilePath(key);
      
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const tokens = this.encrypt ? this.decryptData(data) : JSON.parse(data);
        
        // Check if tokens are expired
        if (isTokenExpired(tokens.expiresAt)) {
          await this.remove(key); // Clean up expired tokens
          return null;
        }
        
        return tokens;
        
      } catch (readError: any) {
        if (readError.code === 'ENOENT') {
          return null; // File doesn't exist
        }
        throw readError;
      }
      
    } catch (error) {
      throw createError(
        'TOKEN_RETRIEVE_FAILED',
        'Failed to retrieve tokens',
        {
          key: maskToken(key),
          originalError: (error as Error).message
        }
      );
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const filePath = this.getTokenFilePath(key);
      
      try {
        await fs.unlink(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, which is fine
      }
      
    } catch (error) {
      throw createError(
        'TOKEN_REMOVE_FAILED',
        'Failed to remove tokens',
        {
          key: maskToken(key),
          originalError: (error as Error).message
        }
      );
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.storageDir);
      const tokenFiles = files.filter(file => file.endsWith('.token'));
      
      await Promise.all(
        tokenFiles.map(file => 
          fs.unlink(join(this.storageDir, file)).catch(() => {
            // Ignore errors for individual file deletion
          })
        )
      );
      
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw createError(
          'TOKEN_CLEAR_FAILED',
          'Failed to clear all tokens',
          { originalError: error.message }
        );
      }
    }
  }

  async listStoredProviders(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const tokenFiles = files.filter(file => file.endsWith('.token'));
      
      return tokenFiles.map(file => {
        const name = file.replace('.token', '');
        return name.replace(/^mcp-oauth:/, '');
      });
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw createError(
        'TOKEN_LIST_FAILED',
        'Failed to list stored providers',
        { originalError: error.message }
      );
    }
  }

  async refreshToken(key: string, refreshTokenValue: string, provider: any): Promise<OAuthTokens | null> {
    if (!refreshTokenValue || !provider.tokenUrl) {
      return null;
    }

    try {
      const refreshParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTokenValue,
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
        throw createError(
          'TOKEN_REFRESH_FAILED',
          `Token refresh failed: ${response.status} ${response.statusText}`,
          { statusCode: response.status }
        );
      }

      const tokenData = await response.json();

      if (tokenData.error) {
        throw createError(
          'TOKEN_REFRESH_ERROR',
          tokenData.error_description || tokenData.error,
          { oauthError: tokenData.error }
        );
      }

      const newTokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshTokenValue,
        tokenType: tokenData.token_type || 'Bearer',
        scope: tokenData.scope ? tokenData.scope.split(' ') : undefined
      };

      if (tokenData.expires_in) {
        newTokens.expiresAt = Date.now() + (tokenData.expires_in * 1000);
      }

      // Store the new tokens
      await this.store(key, newTokens);
      
      return newTokens;

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error;
      }
      
      throw createError(
        'TOKEN_REFRESH_NETWORK_ERROR',
        'Network error during token refresh',
        { originalError: (error as Error).message }
      );
    }
  }

  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true, mode: 0o700 });
    } catch (error) {
      throw createError(
        'STORAGE_DIR_FAILED',
        'Failed to create token storage directory',
        {
          storageDir: this.storageDir,
          originalError: (error as Error).message
        }
      );
    }
  }

  private getTokenFilePath(key: string): string {
    const safeKey = this.sanitizeKey(key);
    return join(this.storageDir, `${safeKey}.token`);
  }

  private sanitizeKey(key: string): string {
    // Replace special characters with safe alternatives
    return key.replace(/[^a-zA-Z0-9-_:.]/g, '_');
  }

  private generateDefaultKey(): string {
    // Generate a machine-specific key for basic encryption
    const machineInfo = `${homedir()}-${process.platform}-${process.arch}`;
    return createHash('sha256').update(machineInfo).digest('hex').slice(0, 32);
  }

  private encryptData(tokens: OAuthTokens): string {
    try {
      const algorithm = 'aes-256-cbc';
      const iv = cryptoRandomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex').subarray(0, 32);
      const cipher = createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(tokens), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw createError(
        'ENCRYPTION_FAILED',
        'Failed to encrypt token data',
        { originalError: (error as Error).message }
      );
    }
  }

  private decryptData(encryptedData: string): OAuthTokens {
    try {
      const algorithm = 'aes-256-cbc';
      const [ivHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(this.encryptionKey, 'hex').subarray(0, 32);
      const decipher = createDecipheriv(algorithm, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw createError(
        'DECRYPTION_FAILED',
        'Failed to decrypt token data',
        { originalError: (error as Error).message }
      );
    }
  }
}

export class MemoryTokenStore implements TokenStorage {
  private tokens: Map<string, OAuthTokens> = new Map();

  async store(key: string, tokens: OAuthTokens): Promise<void> {
    this.tokens.set(key, { ...tokens });
  }

  async retrieve(key: string): Promise<OAuthTokens | null> {
    const tokens = this.tokens.get(key);
    if (!tokens) {
      return null;
    }

    // Check if tokens are expired
    if (isTokenExpired(tokens.expiresAt)) {
      this.tokens.delete(key);
      return null;
    }

    return { ...tokens };
  }

  async remove(key: string): Promise<void> {
    this.tokens.delete(key);
  }

  async clear(): Promise<void> {
    this.tokens.clear();
  }

  listStoredProviders(): string[] {
    return Array.from(this.tokens.keys()).map(key => 
      key.replace(/^mcp-oauth:/, '')
    );
  }
}

export function createTokenStore(options: FileTokenStoreOptions & { useMemory?: boolean } = {}): TokenStorage {
  if (options.useMemory) {
    return new MemoryTokenStore();
  }
  return new FileTokenStore(options);
}
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface EncryptedApiKey {
  encrypted: string;
  iv: string;
  salt: string;
}

interface ApiKeyValidation {
  isValid: boolean;
  error?: string;
  keyInfo?: {
    provider: string;
    masked: string;
    isExpired: boolean;
  };
}

export class ApiKeyManager {
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || '';
    if (!this.encryptionKey || this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  /**
   * Encrypt API key for secure storage
   */
  encryptApiKey(apiKey: string): EncryptedApiKey {
    try {
      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(16);
      const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha256');
      
      const cipher = crypto.createCipher(this.algorithm, key);
      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex')
      };
    } catch (error) {
      throw new Error('Failed to encrypt API key');
    }
  }

  /**
   * Decrypt API key for use
   */
  decryptApiKey(encryptedData: EncryptedApiKey): string {
    try {
      const salt = Buffer.from(encryptedData.salt, 'hex');
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const key = crypto.pbkdf2Sync(this.encryptionKey, salt, 100000, 32, 'sha256');
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt API key');
    }
  }

  /**
   * Validate API key format and security
   */
  validateApiKey(apiKey: string, provider: 'zeptomail' | 'stripe' | 'cloudflare'): ApiKeyValidation {
    if (!apiKey || typeof apiKey !== 'string') {
      return { isValid: false, error: 'API key is required' };
    }

    // Remove whitespace
    apiKey = apiKey.trim();

    if (apiKey.length < 10) {
      return { isValid: false, error: 'API key is too short' };
    }

    if (apiKey.length > 500) {
      return { isValid: false, error: 'API key is too long' };
    }

    // Provider-specific validation
    switch (provider) {
      case 'zeptomail':
        return this.validateZeptoMailKey(apiKey);
      case 'stripe':
        return this.validateStripeKey(apiKey);
      case 'cloudflare':
        return this.validateCloudflareKey(apiKey);
      default:
        return { isValid: false, error: 'Unknown provider' };
    }
  }

  /**
   * Validate ZeptoMail API key format
   */
  private validateZeptoMailKey(apiKey: string): ApiKeyValidation {
    // ZeptoMail keys are typically base64 encoded and quite long
    if (apiKey.length < 50) {
      return { isValid: false, error: 'ZeptoMail API key appears to be invalid (too short)' };
    }

    // Check for common patterns that indicate a valid key
    const hasValidChars = /^[A-Za-z0-9+/=]+$/.test(apiKey);
    if (!hasValidChars) {
      return { isValid: false, error: 'ZeptoMail API key contains invalid characters' };
    }

    return {
      isValid: true,
      keyInfo: {
        provider: 'zeptomail',
        masked: this.maskApiKey(apiKey),
        isExpired: false // Would need API call to check
      }
    };
  }

  /**
   * Validate Stripe API key format
   */
  private validateStripeKey(apiKey: string): ApiKeyValidation {
    // Stripe keys start with sk_ or pk_
    if (!apiKey.startsWith('sk_') && !apiKey.startsWith('pk_')) {
      return { isValid: false, error: 'Stripe API key must start with sk_ or pk_' };
    }

    if (apiKey.length < 20) {
      return { isValid: false, error: 'Stripe API key appears to be invalid (too short)' };
    }

    return {
      isValid: true,
      keyInfo: {
        provider: 'stripe',
        masked: this.maskApiKey(apiKey),
        isExpired: false
      }
    };
  }

  /**
   * Validate Cloudflare API key format
   */
  private validateCloudflareKey(apiKey: string): ApiKeyValidation {
    // Cloudflare API tokens are typically 40 characters
    if (apiKey.length < 30) {
      return { isValid: false, error: 'Cloudflare API key appears to be invalid (too short)' };
    }

    const hasValidChars = /^[A-Za-z0-9_-]+$/.test(apiKey);
    if (!hasValidChars) {
      return { isValid: false, error: 'Cloudflare API key contains invalid characters' };
    }

    return {
      isValid: true,
      keyInfo: {
        provider: 'cloudflare',
        masked: this.maskApiKey(apiKey),
        isExpired: false
      }
    };
  }

  /**
   * Mask API key for safe display
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    
    const start = apiKey.substring(0, 4);
    const end = apiKey.substring(apiKey.length - 4);
    const middle = '*'.repeat(Math.max(4, apiKey.length - 8));
    
    return `${start}${middle}${end}`;
  }

  /**
   * Store encrypted API key in database
   */
  async storeApiKey(emailAccountId: string, provider: string, apiKey: string): Promise<void> {
    const validation = this.validateApiKey(apiKey, provider as any);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const encryptedKey = this.encryptApiKey(apiKey);
    const keyHash = await bcrypt.hash(apiKey, 12);

    await supabaseAdmin
      .from('email_api_keys')
      .upsert({
        email_account_id: emailAccountId,
        provider,
        encrypted_key: encryptedKey.encrypted,
        key_iv: encryptedKey.iv,
        key_salt: encryptedKey.salt,
        key_hash: keyHash,
        masked_key: validation.keyInfo?.masked,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email_account_id,provider'
      });
  }

  /**
   * Retrieve and decrypt API key
   */
  async getApiKey(emailAccountId: string, provider: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('email_api_keys')
      .select('encrypted_key, key_iv, key_salt, is_active')
      .eq('email_account_id', emailAccountId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    try {
      return this.decryptApiKey({
        encrypted: data.encrypted_key,
        iv: data.key_iv,
        salt: data.key_salt
      });
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  /**
   * Verify API key matches stored hash
   */
  async verifyApiKey(emailAccountId: string, provider: string, apiKey: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('email_api_keys')
      .select('key_hash')
      .eq('email_account_id', emailAccountId)
      .eq('provider', provider)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return await bcrypt.compare(apiKey, data.key_hash);
  }

  /**
   * Sanitize API key for logging (completely remove it)
   */
  sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      // Remove any potential API keys from strings
      return data.replace(/[A-Za-z0-9+/=]{20,}/g, '[REDACTED]');
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeForLogging(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Remove sensitive fields
        if (['apiKey', 'api_key', 'token', 'secret', 'password', 'key'].includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLogging(value);
        }
      }
      return sanitized;
    }

    return data;
  }
}

export const apiKeyManager = new ApiKeyManager();

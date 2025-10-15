import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export interface APIKeyData {
  id: string;
  key_name: string;
  key_prefix: string;
  permissions: Record<string, boolean>;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

export function generateAPIKey(prefix: string = 'sk_live_'): { apiKey: string; hash: string } {
  // Generate random API key
  const randomBytes = crypto.randomBytes(32);
  const apiKey = prefix + randomBytes.toString('hex');

  // Create hash for storage
  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');

  return { apiKey, hash };
}

export async function validateAPIKey(providedKey: string): Promise<{
  valid: boolean;
  emailAccountId?: string;
  permissions?: Record<string, boolean>;
  error?: string;
}> {
  try {
    const hash = crypto.createHash('sha256').update(providedKey).digest('hex');

    const supabase = await createClient();

    const { data: keyRecord, error } = await supabase
      .from('email_api_keys')
      .select(`
        *,
        email_accounts!inner(id, status)
      `)
      .eq('key_hash', hash)
      .eq('is_active', true)
      .single();

    if (error || !keyRecord) {
      return { valid: false, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check if account is active
    if (keyRecord.email_accounts.status !== 'active') {
      return { valid: false, error: 'Email account is not active' };
    }

    // Update last used timestamp
    await supabase
      .from('email_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRecord.id);

    return {
      valid: true,
      emailAccountId: keyRecord.email_account_id,
      permissions: keyRecord.permissions
    };
  } catch (error) {
    console.error('Error validating API key:', error);
    return { valid: false, error: 'Internal server error' };
  }
}

export class APIKeyService {
  private async getSupabase() {
    return await createClient();
  }

  async createAPIKey(emailAccountId: string, keyData: {
    name: string;
    permissions?: Record<string, boolean>;
    expiresAt?: Date;
  }): Promise<{ success: boolean; apiKey?: string; error?: string }> {
    try {
      const { apiKey, hash } = generateAPIKey();
      const supabase = await this.getSupabase();

      const { error } = await supabase
        .from('email_api_keys')
        .insert({
          email_account_id: emailAccountId,
          key_name: keyData.name,
          key_hash: hash,
          key_prefix: apiKey.substring(0, 8),
          permissions: keyData.permissions || { send: true, templates: true, domains: false },
          expires_at: keyData.expiresAt?.toISOString() || null
        });

      if (error) {
        console.error('Error creating API key:', error);
        return { success: false, error: 'Failed to create API key' };
      }

      return { success: true, apiKey };
    } catch (error) {
      console.error('Error in createAPIKey:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async listAPIKeys(emailAccountId: string): Promise<{
    success: boolean;
    keys?: APIKeyData[];
    error?: string;
  }> {
    try {
      const supabase = await this.getSupabase();
      const { data, error } = await supabase
        .from('email_api_keys')
        .select('id, key_name, key_prefix, permissions, last_used_at, expires_at, created_at, is_active')
        .eq('email_account_id', emailAccountId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error listing API keys:', error);
        return { success: false, error: 'Failed to fetch API keys' };
      }

      return { success: true, keys: data || [] };
    } catch (error) {
      console.error('Error in listAPIKeys:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async revokeAPIKey(keyId: string, emailAccountId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('email_api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('email_account_id', emailAccountId);

      if (error) {
        console.error('Error revoking API key:', error);
        return { success: false, error: 'Failed to revoke API key' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in revokeAPIKey:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async updateAPIKey(keyId: string, emailAccountId: string, updates: {
    name?: string;
    permissions?: Record<string, boolean>;
    expiresAt?: Date | null;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {};

      if (updates.name) updateData.key_name = updates.name;
      if (updates.permissions) updateData.permissions = updates.permissions;
      if (updates.expiresAt !== undefined) {
        updateData.expires_at = updates.expiresAt?.toISOString() || null;
      }

      const supabase = await this.getSupabase();
      const { error } = await supabase
        .from('email_api_keys')
        .update(updateData)
        .eq('id', keyId)
        .eq('email_account_id', emailAccountId);

      if (error) {
        console.error('Error updating API key:', error);
        return { success: false, error: 'Failed to update API key' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in updateAPIKey:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  async getAPIKeyUsage(_emailAccountId: string, _keyId?: string): Promise<{
    success: boolean;
    usage?: {
      totalRequests: number;
      emailsSent: number;
      lastUsed: string | null;
      dailyUsage: { date: string; count: number }[];
    };
    error?: string;
  }> {
    try {
      // This would typically involve querying usage logs from email_usage_records table
      // For now, we'll return mock data
      // TODO: Implement actual usage tracking using emailAccountId and keyId
      const usage = {
        totalRequests: 1250,
        emailsSent: 1180,
        lastUsed: new Date().toISOString(),
        dailyUsage: [
          { date: '2024-01-10', count: 45 },
          { date: '2024-01-11', count: 67 },
          { date: '2024-01-12', count: 89 },
          { date: '2024-01-13', count: 123 },
          { date: '2024-01-14', count: 156 }
        ]
      };

      return { success: true, usage };
    } catch (error) {
      console.error('Error in getAPIKeyUsage:', error);
      return { success: false, error: 'Internal server error' };
    }
  }
}

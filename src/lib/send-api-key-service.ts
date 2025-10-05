/**
 * Send API Key Service
 * Handles API key generation, validation, and management
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export class SendAPIKeyService {
  /**
   * Generate a new API key
   */
  static generateAPIKey(): string {
    const randomBytes = crypto.randomBytes(32)
    return `sk_live_${randomBytes.toString('hex')}`
  }

  /**
   * Hash API key for storage
   */
  static async hashAPIKey(apiKey: string): Promise<string> {
    return await bcrypt.hash(apiKey, 10)
  }

  /**
   * Verify API key
   */
  static async verifyAPIKey(apiKey: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(apiKey, hash)
  }

  /**
   * Get key prefix (first 12 characters)
   */
  static getKeyPrefix(apiKey: string): string {
    return apiKey.substring(0, 12)
  }

  /**
   * Create API key
   */
  static async createAPIKey(
    userId: string,
    name: string,
    scopes: string[] = ['read', 'write'],
    expiresAt?: Date
  ): Promise<{ success: boolean; apiKey?: string; keyData?: any; error?: string }> {
    try {
      const apiKey = this.generateAPIKey()
      const keyHash = await this.hashAPIKey(apiKey)
      const keyPrefix = this.getKeyPrefix(apiKey)

      const { data, error } = await supabaseAdmin
        .from('send_api_keys')
        .insert({
          user_id: userId,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes,
          expires_at: expiresAt?.toISOString()
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return {
        success: true,
        apiKey, // Return plain key only on creation
        keyData: data
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Validate API key and return user
   */
  static async validateAPIKey(
    apiKey: string
  ): Promise<{ valid: boolean; userId?: string; keyId?: string; error?: string }> {
    try {
      const keyPrefix = this.getKeyPrefix(apiKey)

      // Find key by prefix
      const { data: keys } = await supabaseAdmin
        .from('send_api_keys')
        .select('*')
        .eq('key_prefix', keyPrefix)

      if (!keys || keys.length === 0) {
        return { valid: false, error: 'Invalid API key' }
      }

      // Verify hash for each matching key
      for (const key of keys) {
        const isValid = await this.verifyAPIKey(apiKey, key.key_hash)
        
        if (isValid) {
          // Check if expired
          if (key.expires_at && new Date(key.expires_at) < new Date()) {
            return { valid: false, error: 'API key expired' }
          }

          // Update last used timestamp
          await supabaseAdmin
            .from('send_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', key.id)

          return {
            valid: true,
            userId: key.user_id,
            keyId: key.id
          }
        }
      }

      return { valid: false, error: 'Invalid API key' }
    } catch (error: any) {
      return { valid: false, error: error.message }
    }
  }

  /**
   * Log API key usage
   */
  static async logUsage(
    keyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await supabaseAdmin.from('send_api_key_usage').insert({
        api_key_id: keyId,
        endpoint,
        method,
        status_code: statusCode,
        ip_address: ipAddress,
        user_agent: userAgent
      })
    } catch (error) {
      console.error('Failed to log API key usage:', error)
    }
  }

  /**
   * Revoke API key
   */
  static async revokeAPIKey(keyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('send_api_keys')
        .delete()
        .eq('id', keyId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * List API keys for user
   */
  static async listAPIKeys(userId: string): Promise<any[]> {
    try {
      const { data: keys } = await supabaseAdmin
        .from('send_api_keys')
        .select('id, name, key_prefix, scopes, last_used_at, expires_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return keys || []
    } catch (error) {
      console.error('Failed to list API keys:', error)
      return []
    }
  }

  /**
   * Get API key usage stats
   */
  static async getUsageStats(
    keyId: string,
    days: number = 30
  ): Promise<any> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: usage } = await supabaseAdmin
        .from('send_api_key_usage')
        .select('*')
        .eq('api_key_id', keyId)
        .gte('created_at', startDate.toISOString())

      if (!usage) {
        return { totalRequests: 0, byEndpoint: {}, byDay: {} }
      }

      // Aggregate stats
      const stats = {
        totalRequests: usage.length,
        byEndpoint: {} as Record<string, number>,
        byDay: {} as Record<string, number>,
        byStatus: {} as Record<number, number>
      }

      usage.forEach(log => {
        // By endpoint
        stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1

        // By day
        const day = new Date(log.created_at).toISOString().split('T')[0]
        stats.byDay[day] = (stats.byDay[day] || 0) + 1

        // By status
        stats.byStatus[log.status_code] = (stats.byStatus[log.status_code] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Failed to get usage stats:', error)
      return { totalRequests: 0, byEndpoint: {}, byDay: {}, byStatus: {} }
    }
  }
}


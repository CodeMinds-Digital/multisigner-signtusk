/**
 * Comprehensive Realtime Service for SignTusk
 * Provides centralized real-time functionality across the application
 * Works alongside existing code without breaking it
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeConfig {
  enabled: boolean
  fallbackPolling: boolean
  pollingInterval: number
  debug: boolean
}

// Default configuration
const defaultConfig: RealtimeConfig = {
  enabled: true,
  fallbackPolling: true,
  pollingInterval: 60000, // 60 seconds
  debug: true
}

export class RealtimeService {
  private static config: RealtimeConfig = defaultConfig
  private static channels: Map<string, RealtimeChannel> = new Map()

  /**
   * Configure realtime service
   */
  static configure(config: Partial<RealtimeConfig>) {
    this.config = { ...this.config, ...config }
    if (this.config.debug) {
      console.log('🔧 Realtime service configured:', this.config)
    }
  }

  /**
   * Subscribe to table changes
   */
  static subscribeToTable<T = any>(
    tableName: string,
    filter: string | null,
    callback: (payload: any) => void,
    userId?: string
  ): () => void {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('⏭️ Realtime disabled, skipping subscription')
      }
      return () => { }
    }

    const channelName = `${tableName}_${userId || 'global'}_${filter || 'all'}`

    if (this.config.debug) {
      console.log(`🔄 Setting up realtime subscription: ${channelName}`)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter ? { filter } : {})
        },
        (payload: any) => {
          if (this.config.debug) {
            console.log(`📡 Realtime update from ${tableName}:`, payload)
          }
          callback(payload)
        }
      )
      .subscribe((status: string) => {
        if (this.config.debug) {
          console.log(`📡 Subscription status for ${channelName}:`, status)
        }
      })

    this.channels.set(channelName, channel)

    // Return cleanup function
    return () => {
      if (this.config.debug) {
        console.log(`🔄 Cleaning up subscription: ${channelName}`)
      }
      const ch = this.channels.get(channelName)
      if (ch) {
        supabase.removeChannel(ch)
        this.channels.delete(channelName)
      }
    }
  }

  /**
   * Subscribe to notifications for a user
   */
  static subscribeToNotifications(
    userId: string,
    onInsert: (notification: any) => void,
    onUpdate?: (notification: any) => void
  ): () => void {
    if (!this.config.enabled) return () => { }

    const channelName = `notifications_${userId}`

    if (this.config.debug) {
      console.log(`🔔 Setting up notification subscription for user: ${userId}`)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (this.config.debug) {
            console.log('🔔 New notification:', payload.new)
          }
          onInsert(payload.new)
        }
      )

    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          if (this.config.debug) {
            console.log('🔔 Notification updated:', payload.new)
          }
          onUpdate(payload.new)
        }
      )
    }

    channel.subscribe((status: string) => {
      if (this.config.debug) {
        console.log(`📡 Notification subscription status:`, status)
      }
    })

    this.channels.set(channelName, channel)

    return () => {
      const ch = this.channels.get(channelName)
      if (ch) {
        supabase.removeChannel(ch)
        this.channels.delete(channelName)
      }
    }
  }

  /**
   * Subscribe to documents for a user
   */
  static subscribeToDocuments(
    userId: string,
    onChange: (payload: any) => void
  ): () => void {
    return this.subscribeToTable('documents', `user_id=eq.${userId}`, onChange, userId)
  }

  /**
   * Subscribe to signing requests for a user
   */
  static subscribeToSigningRequests(
    userId: string,
    onChange: (payload: any) => void
  ): () => void {
    return this.subscribeToTable('signing_requests', `initiated_by=eq.${userId}`, onChange, userId)
  }

  /**
   * Subscribe to a specific signing request
   */
  static subscribeToSigningRequest(
    requestId: string,
    onChange: (payload: any) => void
  ): () => void {
    const channelName = `signing_request_${requestId}`

    if (this.config.debug) {
      console.log(`🔄 Setting up signing request subscription: ${requestId}`)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signing_requests',
          filter: `id=eq.${requestId}`
        },
        (payload: any) => {
          if (this.config.debug) {
            console.log('📝 Signing request updated:', payload.new)
          }
          onChange(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signing_request_signers',
          filter: `signing_request_id=eq.${requestId}`
        },
        (payload: any) => {
          if (this.config.debug) {
            console.log('✍️ Signer status updated:', payload.new)
          }
          onChange(payload)
        }
      )
      .subscribe((status: string) => {
        if (this.config.debug) {
          console.log(`📡 Signing request subscription status:`, status)
        }
      })

    this.channels.set(channelName, channel)

    return () => {
      const ch = this.channels.get(channelName)
      if (ch) {
        supabase.removeChannel(ch)
        this.channels.delete(channelName)
      }
    }
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup() {
    if (this.config.debug) {
      console.log(`🧹 Cleaning up ${this.channels.size} realtime subscriptions`)
    }

    this.channels.forEach((channel, name) => {
      if (this.config.debug) {
        console.log(`🔄 Removing channel: ${name}`)
      }
      supabase.removeChannel(channel)
    })

    this.channels.clear()
  }

  /**
   * Get subscription status
   */
  static getStatus() {
    return {
      enabled: this.config.enabled,
      activeChannels: this.channels.size,
      channels: Array.from(this.channels.keys())
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id')
        .limit(1)

      return !error
    } catch (error) {
      console.error('❌ Realtime health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const realtimeService = RealtimeService


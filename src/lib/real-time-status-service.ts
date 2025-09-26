// Real-time status update service for SignTusk
// Provides live updates for document signing status without page reloads

import { redis } from './upstash-config'
import { supabase } from './supabase'

export interface StatusUpdate {
  type: 'signing_request_updated' | 'document_signed' | 'request_completed'
  requestId: string
  status: string
  signedCount?: number
  totalSigners?: number
  signerEmail?: string
  timestamp: string
  metadata?: any
}

export class RealTimeStatusService {
  private static readonly CHANNEL_PREFIX = 'status_updates'
  private static readonly SIGNING_REQUESTS_CHANNEL = 'signing_requests_updates'
  
  /**
   * Publish a status update to all connected clients
   */
  static async publishStatusUpdate(update: StatusUpdate): Promise<void> {
    try {
      const channel = `${this.CHANNEL_PREFIX}:${update.requestId}`
      
      // Publish to Redis for real-time updates
      await redis.publish(channel, JSON.stringify(update))
      
      // Also publish to global signing requests channel
      await redis.publish(this.SIGNING_REQUESTS_CHANNEL, JSON.stringify(update))
      
      console.log('✅ Status update published:', update)
      
    } catch (error) {
      console.error('❌ Error publishing status update:', error)
    }
  }

  /**
   * Publish document signing update
   */
  static async publishDocumentSigned(
    requestId: string,
    signerEmail: string,
    signedCount: number,
    totalSigners: number
  ): Promise<void> {
    const update: StatusUpdate = {
      type: 'document_signed',
      requestId,
      status: signedCount >= totalSigners ? 'completed' : 'in_progress',
      signedCount,
      totalSigners,
      signerEmail,
      timestamp: new Date().toISOString(),
      metadata: {
        progress: Math.round((signedCount / totalSigners) * 100)
      }
    }

    await this.publishStatusUpdate(update)
  }

  /**
   * Publish request completion update
   */
  static async publishRequestCompleted(
    requestId: string,
    finalPdfUrl?: string
  ): Promise<void> {
    const update: StatusUpdate = {
      type: 'request_completed',
      requestId,
      status: 'completed',
      timestamp: new Date().toISOString(),
      metadata: {
        finalPdfUrl,
        completedAt: new Date().toISOString()
      }
    }

    await this.publishStatusUpdate(update)
  }

  /**
   * Subscribe to status updates for a specific request
   */
  static subscribeToRequest(
    requestId: string,
    callback: (update: StatusUpdate) => void
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {} // Server-side, return no-op
    }

    // Use Supabase real-time for browser clients
    const channel = supabase
      .channel(`signing_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signing_requests',
          filter: `id=eq.${requestId}`
        },
        (payload) => {
          const update: StatusUpdate = {
            type: 'signing_request_updated',
            requestId: payload.new.id,
            status: payload.new.status,
            timestamp: new Date().toISOString(),
            metadata: payload.new
          }
          callback(update)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signing_request_signers',
          filter: `signature_request_id=eq.${requestId}`
        },
        (payload) => {
          const update: StatusUpdate = {
            type: 'document_signed',
            requestId,
            status: payload.new.status === 'signed' ? 'signed' : 'pending',
            signerEmail: payload.new.email,
            timestamp: new Date().toISOString(),
            metadata: payload.new
          }
          callback(update)
        }
      )
      .subscribe()

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to all signing requests updates
   */
  static subscribeToAllRequests(
    callback: (update: StatusUpdate) => void
  ): () => void {
    if (typeof window === 'undefined') {
      return () => {} // Server-side, return no-op
    }

    const channel = supabase
      .channel('all_signing_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signing_requests'
        },
        (payload) => {
          const update: StatusUpdate = {
            type: 'signing_request_updated',
            requestId: payload.new?.id || payload.old?.id,
            status: payload.new?.status || 'deleted',
            timestamp: new Date().toISOString(),
            metadata: payload
          }
          callback(update)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signing_request_signers'
        },
        (payload) => {
          const update: StatusUpdate = {
            type: 'document_signed',
            requestId: payload.new.signature_request_id,
            status: payload.new.status,
            signerEmail: payload.new.email,
            timestamp: new Date().toISOString(),
            metadata: payload.new
          }
          callback(update)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Get current status for a request (with caching)
   */
  static async getCurrentStatus(requestId: string): Promise<any> {
    try {
      // Try cache first
      const cacheKey = `request_status:${requestId}`
      const cached = await redis.get(cacheKey)
      
      if (cached) {
        return JSON.parse(cached as string)
      }

      // Fetch from database
      const { data: request, error } = await supabase
        .from('signing_requests')
        .select(`
          *,
          signing_request_signers (
            id,
            email,
            status,
            signed_at,
            signature_data
          )
        `)
        .eq('id', requestId)
        .single()

      if (error) throw error

      // Calculate progress
      const signers = request.signing_request_signers || []
      const signedCount = signers.filter((s: any) => s.status === 'signed').length
      const totalSigners = signers.length

      const status = {
        ...request,
        progress: {
          signed: signedCount,
          total: totalSigners,
          percentage: totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0
        },
        updated_at: new Date().toISOString()
      }

      // Cache for 30 seconds
      await redis.setex(cacheKey, 30, JSON.stringify(status))

      return status

    } catch (error) {
      console.error('❌ Error getting current status:', error)
      return null
    }
  }

  /**
   * Invalidate status cache for a request
   */
  static async invalidateStatusCache(requestId: string): Promise<void> {
    try {
      const cacheKey = `request_status:${requestId}`
      await redis.del(cacheKey)
    } catch (error) {
      console.error('❌ Error invalidating status cache:', error)
    }
  }

  /**
   * Batch update multiple requests (for bulk operations)
   */
  static async batchUpdateStatus(
    updates: Array<{ requestId: string; status: string; metadata?: any }>
  ): Promise<void> {
    try {
      const promises = updates.map(update => {
        const statusUpdate: StatusUpdate = {
          type: 'signing_request_updated',
          requestId: update.requestId,
          status: update.status,
          timestamp: new Date().toISOString(),
          metadata: update.metadata
        }
        return this.publishStatusUpdate(statusUpdate)
      })

      await Promise.all(promises)
      console.log(`✅ Batch updated ${updates.length} requests`)

    } catch (error) {
      console.error('❌ Error in batch update:', error)
    }
  }

  /**
   * Health check for real-time service
   */
  static async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test Redis connection
      const testKey = 'health_check_realtime'
      await redis.set(testKey, 'ok')
      const result = await redis.get(testKey)
      await redis.del(testKey)

      // Test Supabase connection
      const { data, error } = await supabase
        .from('signing_requests')
        .select('id')
        .limit(1)

      return {
        status: 'healthy',
        details: {
          redis: result === 'ok',
          supabase: !error,
          timestamp: new Date().toISOString()
        }
      }

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }
    }
  }
}

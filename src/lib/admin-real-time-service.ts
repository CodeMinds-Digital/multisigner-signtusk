// =====================================================
// ADMIN REAL-TIME SERVICE
// Provides real-time updates for admin dashboard
// =====================================================

import { supabaseAdmin } from './supabase-admin'

export interface RealTimeUpdate {
  type: 'user_created' | 'document_uploaded' | 'signature_completed' | 'system_alert'
  data: any
  timestamp: string
  id: string
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  timestamp: string
  read: boolean
  action_url?: string
}

export class AdminRealTimeService {
  private static subscriptions: Map<string, any> = new Map()
  private static callbacks: Map<string, Function[]> = new Map()

  /**
   * Subscribe to real-time admin updates
   */
  static subscribeToAdminUpdates(
    adminUserId: string,
    callback: (update: RealTimeUpdate) => void
  ): () => void {
    const subscriptionKey = `admin_updates_${adminUserId}`
    
    // Store callback
    if (!this.callbacks.has(subscriptionKey)) {
      this.callbacks.set(subscriptionKey, [])
    }
    this.callbacks.get(subscriptionKey)!.push(callback)

    // Create subscription if not exists
    if (!this.subscriptions.has(subscriptionKey)) {
      const subscription = supabaseAdmin
        .channel('admin_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_profiles'
          },
          (payload: any) => {
            const update: RealTimeUpdate = {
              type: 'user_created',
              data: payload.new,
              timestamp: new Date().toISOString(),
              id: `user_${payload.new.id}`
            }
            this.notifyCallbacks(subscriptionKey, update)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents'
          },
          (payload: any) => {
            const update: RealTimeUpdate = {
              type: 'document_uploaded',
              data: payload.new,
              timestamp: new Date().toISOString(),
              id: `doc_${payload.new.id}`
            }
            this.notifyCallbacks(subscriptionKey, update)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'signing_request_signers'
          },
          (payload: any) => {
            if (payload.new.status === 'completed') {
              const update: RealTimeUpdate = {
                type: 'signature_completed',
                data: payload.new,
                timestamp: new Date().toISOString(),
                id: `sig_${payload.new.id}`
              }
              this.notifyCallbacks(subscriptionKey, update)
            }
          }
        )
        .subscribe()

      this.subscriptions.set(subscriptionKey, subscription)
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(subscriptionKey) || []
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }

      // If no more callbacks, unsubscribe
      if (callbacks.length === 0) {
        const subscription = this.subscriptions.get(subscriptionKey)
        if (subscription) {
          subscription.unsubscribe()
          this.subscriptions.delete(subscriptionKey)
          this.callbacks.delete(subscriptionKey)
        }
      }
    }
  }

  /**
   * Subscribe to admin notifications
   */
  static subscribeToNotifications(
    adminUserId: string,
    callback: (notification: AdminNotification) => void
  ): () => void {
    const subscriptionKey = `admin_notifications_${adminUserId}`
    
    const subscription = supabaseAdmin
      .channel('admin_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `admin_user_id=eq.${adminUserId}`
        },
        (payload: any) => {
          callback(payload.new as AdminNotification)
        }
      )
      .subscribe()

    this.subscriptions.set(subscriptionKey, subscription)

    return () => {
      subscription.unsubscribe()
      this.subscriptions.delete(subscriptionKey)
    }
  }

  /**
   * Send real-time notification to admin
   */
  static async sendAdminNotification(
    adminUserId: string,
    notification: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('admin_notifications')
        .insert({
          admin_user_id: adminUserId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          action_url: notification.action_url,
          read: false
        })
    } catch (error) {
      console.error('Error sending admin notification:', error)
    }
  }

  /**
   * Get system health metrics in real-time
   */
  static async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical'
    metrics: {
      cpu_usage: number
      memory_usage: number
      disk_usage: number
      active_connections: number
      response_time_ms: number
    }
    alerts: string[]
  }> {
    try {
      // In a real implementation, this would connect to monitoring services
      // For now, we'll simulate health metrics
      const metrics = {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        active_connections: Math.floor(Math.random() * 1000),
        response_time_ms: Math.floor(Math.random() * 500)
      }

      const alerts = []
      if (metrics.cpu_usage > 80) alerts.push('High CPU usage detected')
      if (metrics.memory_usage > 85) alerts.push('High memory usage detected')
      if (metrics.disk_usage > 90) alerts.push('Low disk space')
      if (metrics.response_time_ms > 300) alerts.push('Slow response times')

      const status = alerts.length > 2 ? 'critical' : alerts.length > 0 ? 'warning' : 'healthy'

      return { status, metrics, alerts }
    } catch (error) {
      console.error('Error getting system health:', error)
      return {
        status: 'critical',
        metrics: {
          cpu_usage: 0,
          memory_usage: 0,
          disk_usage: 0,
          active_connections: 0,
          response_time_ms: 0
        },
        alerts: ['Unable to fetch system metrics']
      }
    }
  }

  /**
   * Notify all callbacks for a subscription
   */
  private static notifyCallbacks(subscriptionKey: string, update: RealTimeUpdate): void {
    const callbacks = this.callbacks.get(subscriptionKey) || []
    callbacks.forEach(callback => {
      try {
        callback(update)
      } catch (error) {
        console.error('Error in real-time callback:', error)
      }
    })
  }

  /**
   * Get live analytics data
   */
  static async getLiveAnalytics(): Promise<{
    activeUsers: number
    documentsToday: number
    signaturesCompleted: number
    systemLoad: number
  }> {
    try {
      // Get active users (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { count: activeUsers } = await supabaseAdmin
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_activity', fiveMinutesAgo)

      // Get documents created today
      const today = new Date().toISOString().split('T')[0]
      const { count: documentsToday } = await supabaseAdmin
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today)

      // Get signatures completed today
      const { count: signaturesCompleted } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('signed_at', today)

      return {
        activeUsers: activeUsers || 0,
        documentsToday: documentsToday || 0,
        signaturesCompleted: signaturesCompleted || 0,
        systemLoad: Math.random() * 100 // Simulated system load
      }
    } catch (error) {
      console.error('Error getting live analytics:', error)
      return {
        activeUsers: 0,
        documentsToday: 0,
        signaturesCompleted: 0,
        systemLoad: 0
      }
    }
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup(): void {
    this.subscriptions.forEach(subscription => {
      subscription.unsubscribe()
    })
    this.subscriptions.clear()
    this.callbacks.clear()
  }
}

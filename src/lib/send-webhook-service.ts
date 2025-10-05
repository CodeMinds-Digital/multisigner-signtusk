/**
 * Send Webhook Service
 * Handles webhook delivery, retry logic, and signature verification
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

export interface WebhookEvent {
  event: string
  timestamp: string
  data: any
}

export interface Webhook {
  id: string
  user_id: string
  url: string
  secret: string
  events: string[]
  enabled: boolean
}

export class SendWebhookService {
  /**
   * Generate HMAC signature for webhook payload
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Deliver webhook with retry logic
   */
  static async deliverWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    retryCount: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = JSON.stringify(event)
      const signature = this.generateSignature(payload, webhook.secret)

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event.event,
          'X-Webhook-Delivery-ID': crypto.randomUUID(),
          'User-Agent': 'SendTusk-Webhooks/1.0'
        },
        body: payload,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Log successful delivery
      await this.logWebhookDelivery(webhook.id, event, 'success', null, retryCount)

      return { success: true }
    } catch (error: any) {
      console.error('Webhook delivery error:', error)

      // Log failed delivery
      await this.logWebhookDelivery(webhook.id, event, 'failed', error.message, retryCount)

      // Retry logic with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.deliverWebhook(webhook, event, retryCount + 1)
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * Log webhook delivery attempt
   */
  static async logWebhookDelivery(
    webhookId: string,
    event: WebhookEvent,
    status: 'success' | 'failed',
    error: string | null,
    retryCount: number
  ): Promise<void> {
    try {
      await supabaseAdmin.from('send_webhook_logs').insert({
        webhook_id: webhookId,
        event_type: event.event,
        payload: event.data,
        status,
        error_message: error,
        retry_count: retryCount,
        delivered_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log webhook delivery:', error)
    }
  }

  /**
   * Trigger webhook for event
   */
  static async triggerWebhook(
    userId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      // Get all webhooks for this user that are subscribed to this event
      const { data: webhooks } = await supabaseAdmin
        .from('send_webhooks')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .contains('events', [eventType])

      if (!webhooks || webhooks.length === 0) {
        return
      }

      const event: WebhookEvent = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: eventData
      }

      // Deliver to all matching webhooks
      const deliveryPromises = webhooks.map(webhook =>
        this.deliverWebhook(webhook, event)
      )

      await Promise.allSettled(deliveryPromises)
    } catch (error) {
      console.error('Failed to trigger webhooks:', error)
    }
  }

  /**
   * Create webhook
   */
  static async createWebhook(
    userId: string,
    url: string,
    events: string[],
    secret?: string
  ): Promise<{ success: boolean; webhook?: any; error?: string }> {
    try {
      // Generate secret if not provided
      const webhookSecret = secret || crypto.randomBytes(32).toString('hex')

      const { data: webhook, error } = await supabaseAdmin
        .from('send_webhooks')
        .insert({
          user_id: userId,
          url,
          secret: webhookSecret,
          events,
          enabled: true
        })
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, webhook }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update webhook
   */
  static async updateWebhook(
    webhookId: string,
    updates: Partial<Webhook>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('send_webhooks')
        .update(updates)
        .eq('id', webhookId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete webhook
   */
  static async deleteWebhook(webhookId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabaseAdmin
        .from('send_webhooks')
        .delete()
        .eq('id', webhookId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get webhook logs
   */
  static async getWebhookLogs(
    webhookId: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const { data: logs } = await supabaseAdmin
        .from('send_webhook_logs')
        .select('*')
        .eq('webhook_id', webhookId)
        .order('delivered_at', { ascending: false })
        .limit(limit)

      return logs || []
    } catch (error) {
      console.error('Failed to get webhook logs:', error)
      return []
    }
  }

  /**
   * Test webhook delivery
   */
  static async testWebhook(webhook: Webhook): Promise<{ success: boolean; error?: string }> {
    const testEvent: WebhookEvent = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhook_id: webhook.id
      }
    }

    return this.deliverWebhook(webhook, testEvent)
  }
}


import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
  updated_at: string
  user_id: string
  description?: string
  headers?: Record<string, string>
}

export interface WebhookEvent {
  id: string
  type: string
  data: any
  webhook_endpoint_id: string
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  attempts: number
  last_attempt_at?: string
  next_retry_at?: string
  response_status?: number
  response_body?: string
  created_at: string
}

export class WebhookService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [1000, 5000, 15000] // 1s, 5s, 15s

  /**
   * Create a new webhook endpoint
   */
  static async createWebhook(
    userId: string,
    url: string,
    events: string[],
    description?: string,
    headers?: Record<string, string>
  ): Promise<WebhookEndpoint | null> {
    try {
      // Generate a secure secret for webhook verification
      const secret = crypto.randomBytes(32).toString('hex')

      const { data, error } = await supabase
        .from('webhook_endpoints')
        .insert([{
          user_id: userId,
          url,
          events,
          secret,
          active: true,
          description,
          headers,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating webhook:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating webhook:', error)
      return null
    }
  }

  /**
   * Get all webhooks for a user
   */
  static async getUserWebhooks(userId: string): Promise<WebhookEndpoint[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching webhooks:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching webhooks:', error)
      return []
    }
  }

  /**
   * Update webhook endpoint
   */
  static async updateWebhook(
    webhookId: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'active' | 'description' | 'headers'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', webhookId)

      if (error) {
        console.error('Error updating webhook:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating webhook:', error)
      return false
    }
  }

  /**
   * Delete webhook endpoint
   */
  static async deleteWebhook(webhookId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', webhookId)

      if (error) {
        console.error('Error deleting webhook:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting webhook:', error)
      return false
    }
  }

  /**
   * Trigger webhook event
   */
  static async triggerEvent(
    eventType: string,
    eventData: any,
    userId?: string
  ): Promise<void> {
    try {
      // Get all active webhooks that listen to this event type
      let query = supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('active', true)
        .contains('events', [eventType])

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data: webhooks, error } = await query

      if (error) {
        console.error('Error fetching webhooks for event:', error)
        return
      }

      if (!webhooks || webhooks.length === 0) {
        return
      }

      // Create webhook events for each endpoint
      const webhookEvents = webhooks.map(webhook => ({
        webhook_endpoint_id: webhook.id,
        type: eventType,
        data: eventData,
        status: 'pending' as const,
        attempts: 0,
        created_at: new Date().toISOString()
      }))

      const { error: insertError } = await supabase
        .from('webhook_events')
        .insert(webhookEvents)

      if (insertError) {
        console.error('Error creating webhook events:', insertError)
        return
      }

      // Process events asynchronously
      for (const webhook of webhooks) {
        this.processWebhookEvent(webhook, eventType, eventData)
      }
    } catch (error) {
      console.error('Error triggering webhook event:', error)
    }
  }

  /**
   * Process individual webhook event
   */
  private static async processWebhookEvent(
    webhook: WebhookEndpoint,
    eventType: string,
    eventData: any
  ): Promise<void> {
    try {
      const payload = {
        id: crypto.randomUUID(),
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString()
      }

      // Create signature for verification
      const signature = this.createSignature(JSON.stringify(payload), webhook.secret)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'User-Agent': 'SignTusk-Webhooks/1.0',
        ...webhook.headers
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      // Update webhook event status
      await supabase
        .from('webhook_events')
        .update({
          status: response.ok ? 'delivered' : 'failed',
          attempts: 1,
          last_attempt_at: new Date().toISOString(),
          response_status: response.status,
          response_body: await response.text().catch(() => '')
        })
        .eq('webhook_endpoint_id', webhook.id)
        .eq('type', eventType)

      if (!response.ok) {
        console.error(`Webhook delivery failed: ${response.status} ${response.statusText}`)
        // Schedule retry if needed
        this.scheduleRetry(webhook.id, eventType, eventData, 1)
      }
    } catch (error) {
      console.error('Error processing webhook event:', error)
      // Schedule retry
      this.scheduleRetry(webhook.id, eventType, eventData, 1)
    }
  }

  /**
   * Schedule webhook retry
   */
  private static async scheduleRetry(
    webhookId: string,
    eventType: string,
    eventData: any,
    attempt: number
  ): Promise<void> {
    if (attempt >= this.MAX_RETRIES) {
      return
    }

    const delay = this.RETRY_DELAYS[attempt - 1] || 15000
    const nextRetryAt = new Date(Date.now() + delay).toISOString()

    await supabase
      .from('webhook_events')
      .update({
        status: 'retrying',
        next_retry_at: nextRetryAt
      })
      .eq('webhook_endpoint_id', webhookId)
      .eq('type', eventType)

    // In a production environment, you would use a job queue like Bull or Agenda
    setTimeout(() => {
      this.retryWebhookEvent(webhookId, eventType, eventData, attempt + 1)
    }, delay)
  }

  /**
   * Retry webhook event
   */
  private static async retryWebhookEvent(
    webhookId: string,
    eventType: string,
    eventData: any,
    _attempt: number
  ): Promise<void> {
    try {
      const { data: webhook } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('id', webhookId)
        .single()

      if (!webhook || !webhook.active) {
        return
      }

      await this.processWebhookEvent(webhook, eventType, eventData)
    } catch (error) {
      console.error('Error retrying webhook event:', error)
    }
  }

  /**
   * Create HMAC signature for webhook verification
   */
  private static createSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.createSignature(payload, secret)
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }

  /**
   * Get webhook events for monitoring
   */
  static async getWebhookEvents(
    webhookId: string,
    limit: number = 50
  ): Promise<WebhookEvent[]> {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('webhook_endpoint_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching webhook events:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching webhook events:', error)
      return []
    }
  }
}

// Common webhook event types
export const WEBHOOK_EVENTS = {
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_SIGNED: 'document.signed',
  SIGNATURE_REQUEST_CREATED: 'signature_request.created',
  SIGNATURE_REQUEST_COMPLETED: 'signature_request.completed',
  SIGNATURE_REQUEST_EXPIRED: 'signature_request.expired',
  USER_REGISTERED: 'user.registered',
  PAYMENT_COMPLETED: 'payment.completed',
  SUBSCRIPTION_UPDATED: 'subscription.updated'
} as const

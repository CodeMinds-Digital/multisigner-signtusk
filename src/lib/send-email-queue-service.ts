// Optimized Email Queue Service for Send Module
// Converts synchronous email sending to QStash queues for better performance

import { qstash, JOB_URLS } from './upstash-config'
import { redis, RedisUtils, CACHE_TTL } from './upstash-config'
import {
  sendDocumentViewedEmail,
  sendDocumentDownloadedEmail,
  sendNDAAcceptedEmail,
  sendHighEngagementEmail,
  sendLinkExpiringEmail,
  sendWeeklyDigestEmail
} from './send-email-service'
import { sendDocumentShareEmail } from './send-document-email-service'

export interface QueuedEmailData {
  type: 'document_viewed' | 'document_downloaded' | 'document_shared' | 'nda_accepted' | 'high_engagement' | 'link_expiring' | 'weekly_digest'
  priority: 'high' | 'normal' | 'low'
  emailData: any
  userId?: string
  documentId?: string
  linkId?: string
  scheduledFor?: number // Unix timestamp
  retryCount?: number
  maxRetries?: number
}

export interface EmailQueueStats {
  queued: number
  processing: number
  completed: number
  failed: number
  totalToday: number
}

export class SendEmailQueueService {
  private static readonly QUEUE_PREFIX = 'send_email_queue'
  private static readonly STATS_PREFIX = 'send_email_stats'
  private static readonly MAX_RETRIES = 3
  private static readonly BATCH_SIZE = 10

  /**
   * Queue document viewed notification email
   */
  static async queueDocumentViewedEmail(
    emailData: any,
    priority: 'high' | 'normal' | 'low' = 'normal',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'document_viewed',
      priority,
      emailData,
      userId: emailData.userId,
      documentId: emailData.documentId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue document downloaded notification email
   */
  static async queueDocumentDownloadedEmail(
    emailData: any,
    priority: 'high' | 'normal' | 'low' = 'normal',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'document_downloaded',
      priority,
      emailData,
      userId: emailData.userId,
      documentId: emailData.documentId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue document share email
   */
  static async queueDocumentShareEmail(
    emailData: any,
    priority: 'high' | 'normal' | 'low' = 'high',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'document_shared',
      priority,
      emailData,
      userId: emailData.userId,
      documentId: emailData.documentId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue NDA accepted notification email
   */
  static async queueNDAAcceptedEmail(
    emailData: any,
    priority: 'high' | 'normal' | 'low' = 'high',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'nda_accepted',
      priority,
      emailData,
      userId: emailData.userId,
      documentId: emailData.documentId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue high engagement notification email
   */
  static async queueHighEngagementEmail(
    emailData: any,
    priority: 'high' | 'normal' | 'low' = 'high',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'high_engagement',
      priority,
      emailData,
      userId: emailData.userId,
      documentId: emailData.documentId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue link expiring warning email
   */
  static async queueLinkExpiringEmail(
    emailData: any,
    priority: 'normal' | 'high' | 'low' = 'normal',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'link_expiring',
      priority,
      emailData,
      userId: emailData.userId,
      linkId: emailData.linkId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue weekly digest email
   */
  static async queueWeeklyDigestEmail(
    emailData: any,
    priority: 'low' | 'normal' | 'high' = 'low',
    delay?: number
  ): Promise<string> {
    return this.queueEmail({
      type: 'weekly_digest',
      priority,
      emailData,
      userId: emailData.userId,
      scheduledFor: delay ? Date.now() + (delay * 1000) : undefined
    })
  }

  /**
   * Queue bulk emails with batching
   */
  static async queueBulkEmails(
    emails: QueuedEmailData[],
    batchSize: number = this.BATCH_SIZE
  ): Promise<string[]> {
    const jobIds: string[] = []

    // Split into batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)

      // Add delay between batches to avoid overwhelming the email service
      const delay = Math.floor(i / batchSize) * 30 // 30 seconds between batches

      for (const email of batch) {
        const jobId = await this.queueEmail({
          ...email,
          scheduledFor: email.scheduledFor || (Date.now() + (delay * 1000))
        })
        jobIds.push(jobId)
      }
    }

    return jobIds
  }

  /**
   * Core email queuing method
   */
  static async queueEmail(emailData: QueuedEmailData): Promise<string> {
    try {
      // Calculate delay for QStash
      const delay = emailData.scheduledFor
        ? Math.max(0, Math.floor((emailData.scheduledFor - Date.now()) / 1000))
        : 0

      // Queue with QStash
      const jobId = await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/send/jobs/process-email`,
        body: {
          ...emailData,
          queuedAt: Date.now(),
          retryCount: 0,
          maxRetries: emailData.maxRetries || this.MAX_RETRIES
        },
        delay: delay > 0 ? `${delay}s` : undefined,
        retries: emailData.maxRetries || this.MAX_RETRIES,
        headers: {
          'X-Priority': emailData.priority,
          'X-Job-Type': 'send-email',
          'X-Email-Type': emailData.type
        }
      })

      // Track in Redis for monitoring
      await this.trackEmailJob(jobId.messageId, emailData)

      // Update queue stats
      await this.updateQueueStats('queued')

      console.log(`📧 Queued ${emailData.type} email with job ID: ${jobId.messageId}`)
      return jobId.messageId

    } catch (error) {
      console.error('Failed to queue email:', error)

      // Fallback to synchronous sending if queue fails
      console.warn('⚠️ QStash email queuing failed, falling back to synchronous sending')
      await this.processSynchronousEmail(emailData)

      return `fallback_${Date.now()}`
    }
  }

  /**
   * Process email synchronously (fallback)
   */
  static async processSynchronousEmail(emailData: QueuedEmailData): Promise<void> {
    try {
      switch (emailData.type) {
        case 'document_viewed':
          await sendDocumentViewedEmail(emailData.emailData)
          break
        case 'document_downloaded':
          await sendDocumentDownloadedEmail(emailData.emailData)
          break
        case 'document_shared':
          await sendDocumentShareEmail(emailData.emailData)
          break
        case 'nda_accepted':
          await sendNDAAcceptedEmail(emailData.emailData)
          break
        case 'high_engagement':
          await sendHighEngagementEmail(emailData.emailData)
          break
        case 'link_expiring':
          await sendLinkExpiringEmail(emailData.emailData)
          break
        case 'weekly_digest':
          await sendWeeklyDigestEmail(emailData.emailData)
          break
        default:
          throw new Error(`Unknown email type: ${emailData.type}`)
      }
    } catch (error) {
      console.error('Synchronous email sending failed:', error)
      throw error
    }
  }

  /**
   * Track email job in Redis
   */
  private static async trackEmailJob(jobId: string, emailData: QueuedEmailData): Promise<void> {
    const jobKey = RedisUtils.buildKey(this.QUEUE_PREFIX, 'job', jobId)
    const jobInfo = {
      id: jobId,
      type: emailData.type,
      priority: emailData.priority,
      recipient: emailData.emailData.to,
      status: 'queued',
      queuedAt: Date.now(),
      userId: emailData.userId,
      documentId: emailData.documentId,
      linkId: emailData.linkId
    }

    await RedisUtils.setWithTTL(jobKey, jobInfo, CACHE_TTL.ANALYTICS_DATA)

    // Add to priority queue
    const queueKey = RedisUtils.buildKey(this.QUEUE_PREFIX, emailData.priority)
    await redis.lpush(queueKey, jobId)
  }

  /**
   * Update queue statistics
   */
  private static async updateQueueStats(status: 'queued' | 'processing' | 'completed' | 'failed'): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey(this.STATS_PREFIX, today)

    await redis.hincrby(statsKey, status, 1)
    await redis.hincrby(statsKey, 'totalToday', 1)
    await redis.expire(statsKey, CACHE_TTL.ANALYTICS_DATA)
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<EmailQueueStats> {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey(this.STATS_PREFIX, today)

    const stats = await redis.hgetall(statsKey)

    return {
      queued: parseInt(stats.queued || '0'),
      processing: parseInt(stats.processing || '0'),
      completed: parseInt(stats.completed || '0'),
      failed: parseInt(stats.failed || '0'),
      totalToday: parseInt(stats.totalToday || '0')
    }
  }

  /**
   * Get pending jobs count by priority
   */
  static async getPendingJobsCount(): Promise<{ high: number; normal: number; low: number }> {
    const [high, normal, low] = await Promise.all([
      redis.llen(RedisUtils.buildKey(this.QUEUE_PREFIX, 'high')),
      redis.llen(RedisUtils.buildKey(this.QUEUE_PREFIX, 'normal')),
      redis.llen(RedisUtils.buildKey(this.QUEUE_PREFIX, 'low'))
    ])

    return { high, normal, low }
  }

  /**
   * Schedule recurring weekly digest emails
   */
  static async scheduleWeeklyDigests(): Promise<void> {
    // This would be called by a cron job to schedule weekly digests for all users
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/send/jobs/schedule-weekly-digests`,
      body: { timestamp: Date.now() },
      cron: '0 9 * * 1', // Every Monday at 9 AM
      headers: {
        'X-Job-Type': 'weekly-digest-scheduler'
      }
    })
  }
}

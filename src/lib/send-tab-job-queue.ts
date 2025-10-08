/**
 * Send Tab Job Queue Service
 * Handles background jobs for Send Tab using QStash
 */

import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export class SendTabJobQueue {
  // =====================================================
  // EMAIL NOTIFICATIONS
  // =====================================================

  /**
   * Queue view notification email
   */
  static async queueViewNotification(data: {
    linkId: string
    documentTitle: string
    viewerEmail?: string
    viewerName?: string
    ownerEmail: string
    ownerName: string
    viewedAt: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/view-notification`,
      body: data,
      retries: 3,
    })
  }

  /**
   * Queue email verification
   */
  static async queueEmailVerification(data: {
    linkId: string
    email: string
    verificationCode: string
    documentTitle: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/email-verification`,
      body: data,
      retries: 3,
    })
  }

  /**
   * Queue NDA acceptance notification
   */
  static async queueNDANotification(data: {
    linkId: string
    documentTitle: string
    acceptorName: string
    acceptorEmail: string
    ownerEmail: string
    acceptedAt: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/nda-notification`,
      body: data,
      retries: 3,
    })
  }

  /**
   * Queue download notification
   */
  static async queueDownloadNotification(data: {
    linkId: string
    documentTitle: string
    viewerEmail?: string
    ownerEmail: string
    downloadedAt: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/download-notification`,
      body: data,
      retries: 3,
    })
  }

  // =====================================================
  // PDF PROCESSING
  // =====================================================

  /**
   * Queue thumbnail generation
   */
  static async queueThumbnailGeneration(data: {
    documentId: string
    fileUrl: string
    pageNumber?: number
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/generate-thumbnail`,
      body: data,
      retries: 2,
    })
  }

  /**
   * Queue PDF conversion (for non-PDF files)
   */
  static async queuePDFConversion(data: {
    documentId: string
    fileUrl: string
    fileType: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/convert-to-pdf`,
      body: data,
      retries: 2,
    })
  }

  /**
   * Queue OCR processing
   */
  static async queueOCRProcessing(data: {
    documentId: string
    fileUrl: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/ocr-processing`,
      body: data,
      retries: 1,
    })
  }

  // =====================================================
  // ANALYTICS AGGREGATION
  // =====================================================

  /**
   * Queue hourly analytics aggregation
   */
  static async queueHourlyAnalytics(linkId: string): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/aggregate-analytics`,
      body: { linkId, period: 'hourly' },
      delay: '1h', // Run after 1 hour
    })
  }

  /**
   * Queue daily analytics aggregation
   */
  static async queueDailyAnalytics(linkId: string): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/aggregate-analytics`,
      body: { linkId, period: 'daily' },
      delay: '1d', // Run after 1 day
    })
  }

  /**
   * Queue analytics report generation
   */
  static async queueAnalyticsReport(data: {
    userId: string
    linkId?: string
    documentId?: string
    format: 'pdf' | 'csv'
    email: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/generate-report`,
      body: data,
      retries: 2,
    })
  }

  // =====================================================
  // WEBHOOK DELIVERY
  // =====================================================

  /**
   * Queue webhook delivery
   */
  static async queueWebhook(data: {
    endpoint: string
    event: string
    payload: any
    secret?: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/webhook-delivery`,
      body: data,
      retries: 3,
      headers: {
        'X-Webhook-Event': data.event,
      },
    })
  }

  // =====================================================
  // SCHEDULED TASKS
  // =====================================================

  /**
   * Schedule link expiration
   */
  static async scheduleLinkExpiration(data: {
    linkId: string
    expiresAt: string
  }): Promise<void> {
    const expiryTime = new Date(data.expiresAt).getTime()
    const now = Date.now()
    const delay = Math.max(0, expiryTime - now)

    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/expire-link`,
      body: { linkId: data.linkId },
      delay: Math.floor(delay / 1000), // Convert to seconds
    })
  }

  /**
   * Schedule reminder notification
   */
  static async scheduleReminder(data: {
    linkId: string
    recipientEmail: string
    documentTitle: string
    sendAt: string
  }): Promise<void> {
    const sendTime = new Date(data.sendAt).getTime()
    const now = Date.now()
    const delay = Math.max(0, sendTime - now)

    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/send-reminder`,
      body: data,
      delay: Math.floor(delay / 1000),
    })
  }

  /**
   * Schedule link activation
   */
  static async scheduleLinkActivation(data: {
    linkId: string
    activateAt: string
  }): Promise<void> {
    const activationTime = new Date(data.activateAt).getTime()
    const now = Date.now()
    const delay = Math.max(0, activationTime - now)

    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/activate-link`,
      body: { linkId: data.linkId },
      delay: Math.floor(delay / 1000),
    })
  }

  // =====================================================
  // CLEANUP JOBS
  // =====================================================

  /**
   * Queue cleanup of expired verifications
   */
  static async queueCleanupVerifications(): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/cleanup-verifications`,
      body: {},
      retries: 1,
    })
  }

  /**
   * Queue cleanup of old analytics data
   */
  static async queueCleanupAnalytics(data: {
    olderThanDays: number
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/cleanup-analytics`,
      body: data,
      retries: 1,
    })
  }

  /**
   * Queue cleanup of inactive sessions
   */
  static async queueCleanupSessions(): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/cleanup-sessions`,
      body: {},
      retries: 1,
    })
  }

  // =====================================================
  // BATCH OPERATIONS
  // =====================================================

  /**
   * Queue batch email sending
   */
  static async queueBatchEmails(data: {
    linkId: string
    recipients: Array<{
      email: string
      name?: string
    }>
    subject: string
    message: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/batch-emails`,
      body: data,
      retries: 2,
    })
  }

  /**
   * Queue batch analytics export
   */
  static async queueBatchExport(data: {
    userId: string
    linkIds: string[]
    format: 'pdf' | 'csv'
    email: string
  }): Promise<void> {
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/batch-export`,
      body: data,
      retries: 2,
    })
  }

  // =====================================================
  // RECURRING JOBS
  // =====================================================

  /**
   * Schedule recurring analytics aggregation (cron)
   */
  static async scheduleRecurringAnalytics(): Promise<void> {
    // Run every hour
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/recurring-analytics`,
      body: {},
      cron: '0 * * * *', // Every hour at minute 0
    })
  }

  /**
   * Schedule recurring cleanup (cron)
   */
  static async scheduleRecurringCleanup(): Promise<void> {
    // Run daily at 2 AM
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/recurring-cleanup`,
      body: {},
      cron: '0 2 * * *', // Daily at 2 AM
    })
  }

  /**
   * Schedule recurring link expiration check (cron)
   */
  static async scheduleRecurringExpirationCheck(): Promise<void> {
    // Run every 15 minutes
    await qstash.publishJSON({
      url: `${baseUrl}/api/send/jobs/check-expirations`,
      body: {},
      cron: '*/15 * * * *', // Every 15 minutes
    })
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Cancel a scheduled job
   */
  static async cancelJob(messageId: string): Promise<void> {
    await qstash.messages.delete(messageId)
  }

  /**
   * Get job status
   */
  static async getJobStatus(messageId: string): Promise<any> {
    return await qstash.messages.get(messageId)
  }

  /**
   * Retry a failed job
   */
  static async retryJob(messageId: string): Promise<void> {
    // QStash handles retries automatically, but we can manually trigger
    const job = await this.getJobStatus(messageId)
    if (job && job.url) {
      await qstash.publishJSON({
        url: job.url,
        body: job.body,
        retries: 1,
      })
    }
  }
}


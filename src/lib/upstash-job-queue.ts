import { qstash, JOB_URLS } from './upstash-config'
import { redis, RedisUtils, CACHE_KEYS } from './upstash-config'

export class UpstashJobQueue {
  // Queue email sending jobs
  static async queueEmail(emailData: any, delay?: number, priority: 'high' | 'normal' | 'low' = 'normal') {
    const jobId = await qstash.publishJSON({
      url: JOB_URLS.SEND_EMAIL,
      body: { ...emailData, priority },
      delay: delay ? `${delay}s` : undefined,
      retries: 3,
      headers: {
        'X-Priority': priority,
        'X-Job-Type': 'email'
      }
    })

    // Track job status in Redis
    await this.trackJobStatus(jobId.messageId, 'email', 'queued', emailData)
    return jobId
  }

  // Queue bulk email sending
  static async queueBulkEmails(emailsData: any[], batchSize: number = 10) {
    const batches = []
    for (let i = 0; i < emailsData.length; i += batchSize) {
      batches.push(emailsData.slice(i, i + batchSize))
    }

    const jobIds = []
    for (const [index, batch] of batches.entries()) {
      const delay = index * 30 // 30 second delay between batches
      const jobId = await this.queueEmail({
        type: 'bulk',
        emails: batch,
        batchIndex: index,
        totalBatches: batches.length
      }, delay, 'normal')
      jobIds.push(jobId)
    }

    return jobIds
  }

  // Queue PDF generation jobs
  static async queuePDFGeneration(requestId: string, priority: 'high' | 'normal' = 'normal') {
    const jobId = await qstash.publishJSON({
      url: JOB_URLS.GENERATE_PDF,
      body: { requestId, priority, timestamp: Date.now() },
      retries: 2,
      headers: {
        'X-Priority': priority,
        'X-Job-Type': 'pdf-generation'
      }
    })

    // Track PDF generation status
    await this.trackJobStatus(jobId.messageId, 'pdf-generation', 'queued', { requestId })

    // Cache PDF generation status for real-time updates
    const statusKey = RedisUtils.buildKey(CACHE_KEYS.PDF_GENERATION, requestId)
    await RedisUtils.setWithTTL(statusKey, {
      status: 'queued',
      jobId: jobId.messageId,
      startedAt: Date.now(),
      priority
    }, 3600) // 1 hour

    return jobId
  }

  // Queue notification jobs
  static async queueNotification(notificationData: any, delay?: number) {
    const jobId = await qstash.publishJSON({
      url: JOB_URLS.SEND_NOTIFICATION,
      body: notificationData,
      delay: delay ? `${delay}s` : undefined,
      retries: 3,
      headers: {
        'X-Job-Type': 'notification'
      }
    })

    await this.trackJobStatus(jobId.messageId, 'notification', 'queued', notificationData)
    return jobId
  }

  // Queue audit logging (non-blocking)
  static async queueAuditLog(auditData: any) {
    const jobId = await qstash.publishJSON({
      url: JOB_URLS.AUDIT_LOG,
      body: auditData,
      retries: 1,
      headers: {
        'X-Job-Type': 'audit-log'
      }
    })

    await this.trackJobStatus(jobId.messageId, 'audit-log', 'queued', auditData)
    return jobId
  }

  // Queue analytics aggregation
  static async queueAnalyticsAggregation(domain: string, date: string) {
    const jobId = await qstash.publishJSON({
      url: JOB_URLS.AGGREGATE_ANALYTICS,
      body: { domain, date, timestamp: Date.now() },
      delay: '300s', // 5 minute delay for batching
      retries: 2,
      headers: {
        'X-Job-Type': 'analytics-aggregation'
      }
    })

    await this.trackJobStatus(jobId.messageId, 'analytics-aggregation', 'queued', { domain, date })
    return jobId
  }

  // Schedule recurring reminder checks
  static async scheduleReminderCheck() {
    return await qstash.publishJSON({
      url: JOB_URLS.CHECK_REMINDERS,
      body: { timestamp: Date.now() },
      cron: '0 */6 * * *', // Every 6 hours
      headers: {
        'X-Job-Type': 'reminder-check'
      }
    })
  }

  // Schedule cleanup of expired data
  static async scheduleCleanupExpired() {
    return await qstash.publishJSON({
      url: JOB_URLS.CLEANUP_EXPIRED,
      body: { timestamp: Date.now() },
      cron: '0 2 * * *', // Daily at 2 AM
      headers: {
        'X-Job-Type': 'cleanup-expired'
      }
    })
  }

  // Queue document expiry notifications
  static async queueDocumentExpiryNotification(requestId: string, hoursUntilExpiry: number) {
    const delay = Math.max(0, (hoursUntilExpiry - 24) * 3600) // 24 hours before expiry

    return await this.queueNotification({
      type: 'document_expiry_warning',
      requestId,
      hoursUntilExpiry: 24
    }, delay)
  }

  // Queue sequential signature notifications
  static async queueSequentialNotification(requestId: string, nextSignerEmail: string, delay: number = 0) {
    return await this.queueNotification({
      type: 'sequential_signature_request',
      requestId,
      nextSignerEmail,
      timestamp: Date.now()
    }, delay)
  }

  // Track job status in Redis
  private static async trackJobStatus(jobId: string, jobType: string, status: string, data: any) {
    const jobKey = `job:${jobId}`
    const jobData = {
      id: jobId,
      type: jobType,
      status,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    await RedisUtils.setWithTTL(jobKey, jobData, 86400) // 24 hours

    // Add to job type index
    await redis.lpush(`jobs:${jobType}`, jobId)
    await redis.ltrim(`jobs:${jobType}`, 0, 999) // Keep last 1000 jobs
  }

  // Update job status
  static async updateJobStatus(jobId: string, status: string, result?: any, error?: string) {
    const jobKey = `job:${jobId}`
    const existingJob = await RedisUtils.get(jobKey)

    if (existingJob) {
      const updatedJob = {
        ...existingJob,
        status,
        result,
        error,
        updatedAt: Date.now(),
        completedAt: status === 'completed' || status === 'failed' ? Date.now() : undefined
      }

      await RedisUtils.setWithTTL(jobKey, updatedJob, 86400)
    }
  }

  // Get job status
  static async getJobStatus(jobId: string) {
    const jobKey = `job:${jobId}`
    return await RedisUtils.get(jobKey)
  }

  // Get recent jobs by type
  static async getRecentJobs(jobType: string, limit: number = 50) {
    const jobIds = await redis.lrange(`jobs:${jobType}`, 0, limit - 1)
    const jobs = []

    for (const jobId of jobIds as string[]) {
      const job = await this.getJobStatus(jobId)
      if (job) jobs.push(job)
    }

    return jobs
  }

  // Get job statistics
  static async getJobStats(jobType?: string) {
    const types = jobType ? [jobType] : ['email', 'pdf-generation', 'notification', 'audit-log', 'analytics-aggregation']
    const stats: any = {}

    for (const type of types) {
      const recentJobs = await this.getRecentJobs(type, 100)
      const completed = recentJobs.filter(job => job.status === 'completed').length
      const failed = recentJobs.filter(job => job.status === 'failed').length
      const pending = recentJobs.filter(job => job.status === 'queued' || job.status === 'processing').length

      stats[type] = {
        total: recentJobs.length,
        completed,
        failed,
        pending,
        successRate: recentJobs.length > 0 ? (completed / recentJobs.length) * 100 : 0
      }
    }

    return stats
  }
}

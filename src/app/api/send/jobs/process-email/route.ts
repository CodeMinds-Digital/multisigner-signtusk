import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { SendEmailQueueService, QueuedEmailData } from '@/lib/send-email-queue-service'
import { redis, RedisUtils } from '@/lib/upstash-config'
import { 
  sendDocumentViewedEmail, 
  sendDocumentDownloadedEmail, 
  sendNDAAcceptedEmail, 
  sendHighEngagementEmail, 
  sendLinkExpiringEmail, 
  sendWeeklyDigestEmail 
} from '@/lib/send-email-service'
import { sendDocumentShareEmail } from '@/lib/send-document-email-service'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const emailData: QueuedEmailData = body

    console.log(`📧 Processing queued email: ${emailData.type} for ${emailData.emailData.to}`)

    // Update job status to processing
    if (emailData.userId) {
      await updateJobStatus(emailData, 'processing')
    }

    // Update queue stats
    await updateQueueStats('processing')

    let result
    try {
      // Process email based on type
      switch (emailData.type) {
        case 'document_viewed':
          result = await sendDocumentViewedEmail(emailData.emailData)
          break

        case 'document_downloaded':
          result = await sendDocumentDownloadedEmail(emailData.emailData)
          break

        case 'document_shared':
          result = await sendDocumentShareEmail(emailData.emailData)
          break

        case 'nda_accepted':
          result = await sendNDAAcceptedEmail(emailData.emailData)
          break

        case 'high_engagement':
          result = await sendHighEngagementEmail(emailData.emailData)
          break

        case 'link_expiring':
          result = await sendLinkExpiringEmail(emailData.emailData)
          break

        case 'weekly_digest':
          result = await sendWeeklyDigestEmail(emailData.emailData)
          break

        default:
          throw new Error(`Unknown email type: ${emailData.type}`)
      }

      if (result.success) {
        console.log(`✅ Email sent successfully: ${emailData.type} to ${emailData.emailData.to}`)
        
        // Update job status to completed
        if (emailData.userId) {
          await updateJobStatus(emailData, 'completed', result.messageId)
        }
        
        // Update queue stats
        await updateQueueStats('completed')

        // Track successful email in analytics
        await trackEmailAnalytics(emailData, 'sent', result.messageId)

        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          type: emailData.type,
          recipient: emailData.emailData.to
        })

      } else {
        throw new Error(result.error || 'Email sending failed')
      }

    } catch (emailError: any) {
      console.error(`❌ Email sending failed: ${emailData.type}`, emailError)

      // Handle retry logic
      const retryCount = (emailData.retryCount || 0) + 1
      const maxRetries = emailData.maxRetries || 3

      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying email (attempt ${retryCount}/${maxRetries})`)
        
        // Update retry count and requeue with exponential backoff
        const delay = Math.pow(2, retryCount) * 60 // 2^n minutes
        await requeueEmailWithDelay(emailData, retryCount, delay)
        
        return NextResponse.json({
          success: false,
          error: emailError.message,
          retryCount,
          retryScheduled: true,
          retryDelay: delay
        })

      } else {
        console.error(`💀 Email failed permanently after ${maxRetries} attempts`)
        
        // Update job status to failed
        if (emailData.userId) {
          await updateJobStatus(emailData, 'failed', undefined, emailError.message)
        }
        
        // Update queue stats
        await updateQueueStats('failed')

        // Track failed email in analytics
        await trackEmailAnalytics(emailData, 'failed', undefined, emailError.message)

        return NextResponse.json({
          success: false,
          error: emailError.message,
          retryCount,
          permanentFailure: true
        }, { status: 500 })
      }
    }

  } catch (error: any) {
    console.error('Email job processing error:', error)
    
    // Update queue stats for processing errors
    await updateQueueStats('failed')

    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * Update job status in Redis
 */
async function updateJobStatus(
  emailData: QueuedEmailData, 
  status: 'processing' | 'completed' | 'failed',
  messageId?: string,
  error?: string
): Promise<void> {
  try {
    const jobKey = RedisUtils.buildKey('send_email_queue', 'job', emailData.userId || 'unknown')
    const jobInfo = {
      type: emailData.type,
      recipient: emailData.emailData.to,
      status,
      updatedAt: Date.now(),
      messageId,
      error,
      retryCount: emailData.retryCount || 0
    }

    await RedisUtils.setWithTTL(jobKey, jobInfo, 86400) // 24 hours
  } catch (error) {
    console.error('Failed to update job status:', error)
  }
}

/**
 * Update queue statistics
 */
async function updateQueueStats(status: 'processing' | 'completed' | 'failed'): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey('send_email_stats', today)
    
    await redis.hincrby(statsKey, status, 1)
    
    // Decrease queued count when processing starts
    if (status === 'processing') {
      await redis.hincrby(statsKey, 'queued', -1)
    }
    
    await redis.expire(statsKey, 86400) // 24 hours
  } catch (error) {
    console.error('Failed to update queue stats:', error)
  }
}

/**
 * Track email analytics
 */
async function trackEmailAnalytics(
  emailData: QueuedEmailData,
  status: 'sent' | 'failed',
  messageId?: string,
  error?: string
): Promise<void> {
  try {
    const analyticsKey = RedisUtils.buildKey('send_email_analytics', new Date().toISOString().split('T')[0])
    const analyticsData = {
      type: emailData.type,
      recipient: emailData.emailData.to,
      status,
      timestamp: Date.now(),
      messageId,
      error,
      userId: emailData.userId,
      documentId: emailData.documentId,
      linkId: emailData.linkId
    }

    // Store individual email analytics
    await redis.lpush(analyticsKey, JSON.stringify(analyticsData))
    await redis.ltrim(analyticsKey, 0, 9999) // Keep last 10k emails
    await redis.expire(analyticsKey, 604800) // 7 days

    // Update email type counters
    const typeKey = RedisUtils.buildKey('send_email_type_stats', emailData.type, new Date().toISOString().split('T')[0])
    await redis.hincrby(typeKey, status, 1)
    await redis.expire(typeKey, 604800) // 7 days

  } catch (error) {
    console.error('Failed to track email analytics:', error)
  }
}

/**
 * Requeue email with delay for retry
 */
async function requeueEmailWithDelay(
  emailData: QueuedEmailData,
  retryCount: number,
  delayMinutes: number
): Promise<void> {
  try {
    const updatedEmailData: QueuedEmailData = {
      ...emailData,
      retryCount,
      scheduledFor: Date.now() + (delayMinutes * 60 * 1000)
    }

    // Use the queue service to requeue
    await SendEmailQueueService.queueEmail(updatedEmailData)
    
    console.log(`🔄 Email requeued for retry in ${delayMinutes} minutes`)
  } catch (error) {
    console.error('Failed to requeue email:', error)
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Send Email Queue Processor',
    status: 'active',
    timestamp: Date.now(),
    supportedEmailTypes: [
      'document_viewed',
      'document_downloaded', 
      'document_shared',
      'nda_accepted',
      'high_engagement',
      'link_expiring',
      'weekly_digest'
    ]
  })
}

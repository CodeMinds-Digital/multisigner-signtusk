import { NextRequest, NextResponse } from 'next/server'
import { verifySignature } from '@upstash/qstash/nextjs'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { RedisCacheService } from '@/lib/redis-cache-service'
import { UpstashRealTime } from '@/lib/upstash-real-time'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, userId, title, message, data, actionUrl, ...notificationData } = body

    console.log('🔔 Processing notification job:', { type, userId, title })

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    let result
    switch (type) {
      case 'signature_request':
        result = await sendSignatureRequestNotification(notificationData)
        break
      
      case 'signature_completed':
        result = await sendSignatureCompletedNotification(notificationData)
        break
      
      case 'document_expiry_warning':
        result = await sendDocumentExpiryNotification(notificationData)
        break
      
      case 'sequential_signature_request':
        result = await sendSequentialSignatureNotification(notificationData)
        break
      
      case 'reminder':
        result = await sendReminderNotification(notificationData)
        break
      
      case 'system_notification':
        result = await sendSystemNotification(notificationData)
        break
      
      case 'bulk_notification':
        result = await sendBulkNotifications(notificationData)
        break
      
      default:
        // Generic notification
        result = await createGenericNotification(userId, title, message, data, actionUrl)
        break
    }

    // Update job status
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(
        jobId,
        result.success ? 'completed' : 'failed',
        result,
        result.success ? undefined : result.error
      )
    }

    console.log('✅ Notification job completed:', { type, success: result.success })

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Notification job failed:', error)

    // Update job status as failed
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(
        jobId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

// Notification handler functions
async function sendSignatureRequestNotification(data: any) {
  try {
    const { requestId, signerEmail, documentTitle } = data

    // Create notification in database
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'signature_request',
        title: 'New Signature Request',
        message: `You have a new document to sign: ${documentTitle}`,
        metadata: { requestId, signerEmail },
        action_url: `/sign/${requestId}`,
        is_read: false
      })

    if (error) throw error

    // Update unread count in Redis
    await RedisCacheService.incrementUnreadCount(data.userId)

    // Send real-time notification
    await UpstashRealTime.publishUserNotification(data.userId, {
      type: 'signature_request',
      title: 'New Signature Request',
      message: `You have a new document to sign: ${documentTitle}`,
      actionUrl: `/sign/${requestId}`,
      timestamp: Date.now()
    })

    return { success: true, notificationId: 'signature_request_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendSignatureCompletedNotification(data: any) {
  try {
    const { requestId, documentTitle, signerEmail } = data

    // Create notification
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'signature_completed',
        title: 'Document Signed',
        message: `${documentTitle} has been signed by ${signerEmail}`,
        metadata: { requestId, signerEmail },
        action_url: `/documents/${requestId}`,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(data.userId)

    await UpstashRealTime.publishUserNotification(data.userId, {
      type: 'signature_completed',
      title: 'Document Signed',
      message: `${documentTitle} has been signed by ${signerEmail}`,
      actionUrl: `/documents/${requestId}`,
      timestamp: Date.now()
    })

    return { success: true, notificationId: 'signature_completed_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendDocumentExpiryNotification(data: any) {
  try {
    const { requestId, documentTitle, hoursUntilExpiry } = data

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'document_expiry_warning',
        title: 'Document Expiring Soon',
        message: `${documentTitle} will expire in ${hoursUntilExpiry} hours`,
        metadata: { requestId, hoursUntilExpiry },
        action_url: `/documents/${requestId}`,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(data.userId)

    return { success: true, notificationId: 'expiry_warning_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendSequentialSignatureNotification(data: any) {
  try {
    const { requestId, nextSignerEmail, documentTitle } = data

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'sequential_signature_request',
        title: 'Your Turn to Sign',
        message: `It's your turn to sign: ${documentTitle}`,
        metadata: { requestId, nextSignerEmail },
        action_url: `/sign/${requestId}`,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(data.userId)

    return { success: true, notificationId: 'sequential_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendReminderNotification(data: any) {
  try {
    const { requestId, documentTitle, reminderCount } = data

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'reminder',
        title: 'Signature Reminder',
        message: `Reminder: Please sign ${documentTitle} (Reminder #${reminderCount})`,
        metadata: { requestId, reminderCount },
        action_url: `/sign/${requestId}`,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(data.userId)

    return { success: true, notificationId: 'reminder_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendSystemNotification(data: any) {
  try {
    const { title, message, actionUrl } = data

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: data.userId,
        type: 'system',
        title,
        message,
        metadata: data.metadata || {},
        action_url: actionUrl,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(data.userId)

    return { success: true, notificationId: 'system_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendBulkNotifications(data: any) {
  try {
    const { notifications } = data
    const results = []

    for (const notification of notifications) {
      const result = await createGenericNotification(
        notification.userId,
        notification.title,
        notification.message,
        notification.data,
        notification.actionUrl
      )
      results.push(result)
    }

    const successCount = results.filter(r => r.success).length
    return { 
      success: true, 
      processed: results.length, 
      successful: successCount,
      failed: results.length - successCount
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function createGenericNotification(userId: string, title: string, message: string, data?: any, actionUrl?: string) {
  try {
    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'general',
        title,
        message,
        metadata: data || {},
        action_url: actionUrl,
        is_read: false
      })

    if (error) throw error

    await RedisCacheService.incrementUnreadCount(userId)

    return { success: true, notificationId: 'generic_' + Date.now() }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Verify QStash signature for security
export const POST = verifySignature(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Notification Job Handler',
    status: 'active',
    timestamp: Date.now(),
    supportedTypes: [
      'signature_request',
      'signature_completed',
      'document_expiry_warning',
      'sequential_signature_request',
      'reminder',
      'system_notification',
      'bulk_notification'
    ]
  })
}

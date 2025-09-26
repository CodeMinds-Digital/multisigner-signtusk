import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { timestamp } = body

    console.log('⏰ Processing reminder check job at:', new Date(timestamp))

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    // Check for documents that need reminders
    const reminderResults = await checkAndSendReminders()

    // Check for expiring documents
    const expiryResults = await checkExpiringDocuments()

    // Check for overdue documents
    const overdueResults = await checkOverdueDocuments()

    const totalProcessed = reminderResults.processed + expiryResults.processed + overdueResults.processed
    const totalSent = reminderResults.sent + expiryResults.sent + overdueResults.sent

    // Update job status
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'completed', {
        reminderResults,
        expiryResults,
        overdueResults,
        totalProcessed,
        totalSent
      })
    }

    console.log('✅ Reminder check completed:', { totalProcessed, totalSent })

    return NextResponse.json({
      success: true,
      reminderResults,
      expiryResults,
      overdueResults,
      totalProcessed,
      totalSent,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Reminder check job failed:', error)

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

async function checkAndSendReminders() {
  try {
    console.log('⏰ Checking for documents needing reminders...')

    // Get signing requests that need reminders
    // Documents that are pending and haven't been reminded in the last 24 hours
    const { data: pendingRequests, error } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        id,
        document_sign_id,
        status,
        created_at,
        expires_at,
        last_reminder_sent,
        documents!inner(
          id,
          title,
          user_id
        ),
        signing_request_signers!inner(
          id,
          email,
          status,
          user_id
        )
      `)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours
      .or('last_reminder_sent.is.null,last_reminder_sent.lt.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('❌ Error fetching pending requests:', error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    let sent = 0
    const errors = []

    for (const request of pendingRequests || []) {
      try {
        // Get pending signers
        const pendingSigners = request.signing_request_signers.filter(signer => signer.status === 'pending')

        for (const signer of pendingSigners) {
          // Queue reminder notification
          await UpstashJobQueue.queueNotification({
            type: 'reminder',
            userId: signer.user_id,
            requestId: request.id,
            documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document',
            signerEmail: signer.email,
            reminderCount: await getReminderCount(request.id, signer.id)
          })

          // Queue reminder email
          await UpstashJobQueue.queueEmail({
            type: 'reminder',
            to: signer.email,
            requestId: request.id,
            documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document',
            signUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign/${request.document_sign_id}`
          })

          sent++
        }

        // Update last reminder sent timestamp
        await supabaseAdmin
          .from('signing_requests')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', request.id)

      } catch (error) {
        console.error('❌ Error sending reminder for request:', request.id, error)
        errors.push(`Request ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      processed: pendingRequests?.length || 0,
      sent,
      errors
    }

  } catch (error) {
    console.error('❌ Error in checkAndSendReminders:', error)
    return { processed: 0, sent: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}

async function checkExpiringDocuments() {
  try {
    console.log('⏰ Checking for expiring documents...')

    // Get documents expiring in the next 24 hours
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: expiringRequests, error } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        id,
        document_sign_id,
        status,
        expires_at,
        documents!inner(
          id,
          title,
          user_id
        ),
        signing_request_signers!inner(
          id,
          email,
          status,
          user_id
        )
      `)
      .eq('status', 'pending')
      .lt('expires_at', expiryTime)
      .gt('expires_at', new Date().toISOString()) // Not already expired

    if (error) {
      console.error('❌ Error fetching expiring requests:', error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    let sent = 0
    const errors = []

    for (const request of expiringRequests || []) {
      try {
        const hoursUntilExpiry = Math.ceil((new Date(request.expires_at).getTime() - Date.now()) / (1000 * 60 * 60))

        // Notify document owner
        await UpstashJobQueue.queueNotification({
          type: 'document_expiry_warning',
          userId: (request.documents as any)?.[0]?.user_id,
          requestId: request.id,
          documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document',
          hoursUntilExpiry
        })

        // Notify pending signers
        const pendingSigners = request.signing_request_signers.filter(signer => signer.status === 'pending')

        for (const signer of pendingSigners) {
          await UpstashJobQueue.queueNotification({
            type: 'document_expiry_warning',
            userId: signer.user_id,
            requestId: request.id,
            documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document',
            hoursUntilExpiry
          })

          await UpstashJobQueue.queueEmail({
            type: 'expiry-warning',
            to: signer.email,
            requestId: request.id,
            documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document',
            hoursUntilExpiry,
            signUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign/${request.document_sign_id}`
          })

          sent++
        }

      } catch (error) {
        console.error('❌ Error sending expiry warning for request:', request.id, error)
        errors.push(`Request ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      processed: expiringRequests?.length || 0,
      sent,
      errors
    }

  } catch (error) {
    console.error('❌ Error in checkExpiringDocuments:', error)
    return { processed: 0, sent: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}

async function checkOverdueDocuments() {
  try {
    console.log('⏰ Checking for overdue documents...')

    // Get documents that have expired but are still pending
    const { data: overdueRequests, error } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        id,
        document_sign_id,
        status,
        expires_at,
        documents!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())

    if (error) {
      console.error('❌ Error fetching overdue requests:', error)
      return { processed: 0, sent: 0, errors: [error.message] }
    }

    let sent = 0
    const errors = []

    for (const request of overdueRequests || []) {
      try {
        // Update status to expired
        await supabaseAdmin
          .from('signing_requests')
          .update({ status: 'expired' })
          .eq('id', request.id)

        // Notify document owner
        await UpstashJobQueue.queueNotification({
          type: 'document_expired',
          userId: (request.documents as any)?.[0]?.user_id,
          requestId: request.id,
          documentTitle: (request.documents as any)?.[0]?.title || 'Unknown Document'
        })

        sent++

      } catch (error) {
        console.error('❌ Error processing overdue request:', request.id, error)
        errors.push(`Request ${request.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      processed: overdueRequests?.length || 0,
      sent,
      errors
    }

  } catch (error) {
    console.error('❌ Error in checkOverdueDocuments:', error)
    return { processed: 0, sent: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }
  }
}

async function getReminderCount(requestId: string, signerId: string): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>requestId', requestId)
      .eq('metadata->>signerId', signerId)
      .eq('type', 'reminder')

    return count || 0
  } catch (error) {
    console.error('❌ Error getting reminder count:', error)
    return 0
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Reminder Check Job Handler',
    status: 'active',
    timestamp: Date.now(),
    features: [
      'Automatic reminder sending',
      'Expiry warning notifications',
      'Overdue document processing',
      'Email and in-app notifications',
      'Configurable reminder intervals'
    ],
    schedule: 'Every 6 hours via cron'
  })
}

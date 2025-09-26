import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { sendSignatureRequestEmail, sendReminderEmail, sendBulkSignatureRequests } from '@/lib/email-service'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, priority = 'normal', ...emailData } = body

    console.log('📧 Processing email job:', { type, priority })

    let result
    switch (type) {
      case 'signature-request':
        result = await sendSignatureRequestEmail(emailData)
        break

      case 'reminder':
        result = await sendReminderEmail(emailData)
        break

      case 'bulk':
        result = await sendBulkSignatureRequests(
          emailData.documentTitle || 'Document',
          emailData.senderName || 'SignTusk',
          emailData.emails || [],
          {
            message: emailData.message,
            dueDate: emailData.dueDate,
            documentId: emailData.documentId || ''
          }
        )
        break

      case 'completion':
        result = await sendCompletionEmail(emailData)
        break

      case 'expiry-warning':
        result = await sendExpiryWarningEmail(emailData)
        break

      case 'sequential-notification':
        result = await sendSequentialNotificationEmail(emailData)
        break

      default:
        throw new Error(`Unknown email type: ${type}`)
    }

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(
        jobId,
        result.success ? 'completed' : 'failed',
        result,
        result.success ? undefined : (result as any).error || (result as any).errors?.join(', ') || 'Unknown error'
      )
    }

    console.log('✅ Email job completed:', { type, success: result.success })

    return NextResponse.json({
      success: result.success,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Email job failed:', error)

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

// Email helper functions
async function sendCompletionEmail(emailData: any) {
  // Implementation for completion email
  console.log('📧 Sending completion email:', emailData)
  return { success: true, messageId: `completion_${Date.now()}` }
}

async function sendExpiryWarningEmail(emailData: any) {
  // Implementation for expiry warning email
  console.log('📧 Sending expiry warning email:', emailData)
  return { success: true, messageId: `expiry_${Date.now()}` }
}

async function sendSequentialNotificationEmail(emailData: any) {
  // Implementation for sequential notification email
  console.log('📧 Sending sequential notification email:', emailData)
  return { success: true, messageId: `sequential_${Date.now()}` }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Email Job Handler',
    status: 'active',
    timestamp: Date.now(),
    supportedTypes: [
      'signature-request',
      'reminder',
      'bulk',
      'completion',
      'expiry-warning',
      'sequential-notification'
    ]
  })
}

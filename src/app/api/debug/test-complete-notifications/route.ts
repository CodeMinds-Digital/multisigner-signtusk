import { NextRequest } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { NotificationScheduler } from '@/lib/notification-scheduler'

export async function POST(request: NextRequest) {
  try {
    const { testSuite } = await request.json()

    console.log('🧪 Running complete notification test suite:', testSuite)

    const results: any = {
      timestamp: new Date().toISOString(),
      testSuite,
      results: {}
    }

    switch (testSuite) {
      case 'signing_workflow':
        results.results = await testSigningWorkflow()
        break

      case 'decline_workflow':
        results.results = await testDeclineWorkflow()
        break

      case 'administrative_actions':
        results.results = await testAdministrativeActions()
        break

      case 'scheduled_notifications':
        results.results = await testScheduledNotifications()
        break

      case 'email_delivery':
        results.results = await testEmailDelivery()
        break

      case 'all':
      default:
        results.results = {
          signing_workflow: await testSigningWorkflow(),
          decline_workflow: await testDeclineWorkflow(),
          administrative_actions: await testAdministrativeActions(),
          scheduled_notifications: await testScheduledNotifications(),
          email_delivery: await testEmailDelivery()
        }
        break
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Complete notification test suite executed',
        ...results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error running notification test suite:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test suite execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function testSigningWorkflow() {
  const results: any = {}
  
  try {
    // Test signature completion notification
    await NotificationService.notifySignatureCompleted(
      'test-request-123',
      'Test Document',
      'signer@test.com',
      'requester-user-id'
    )
    results.signature_completed = { success: true }
  } catch (error) {
    results.signature_completed = { success: false, error: String(error) }
  }

  try {
    // Test document completion notification
    await NotificationService.notifyDocumentCompleted(
      'test-request-123',
      'Test Document',
      'requester-user-id',
      ['signer1@test.com', 'signer2@test.com']
    )
    results.document_completed = { success: true }
  } catch (error) {
    results.document_completed = { success: false, error: String(error) }
  }

  try {
    // Test final document ready notification
    await NotificationService.notifyFinalDocumentReady(
      'test-request-123',
      'Test Document',
      'requester-user-id',
      ['signer1@test.com', 'signer2@test.com'],
      'https://example.com/final.pdf'
    )
    results.final_document_ready = { success: true }
  } catch (error) {
    results.final_document_ready = { success: false, error: String(error) }
  }

  return results
}

async function testDeclineWorkflow() {
  const results: any = {}
  
  try {
    // Test decline notification
    await NotificationService.notifyDocumentDeclined(
      'test-request-123',
      'Test Document',
      'decliner@test.com',
      'Test Decliner',
      'requester-user-id',
      'Testing decline workflow'
    )
    results.document_declined = { success: true }
  } catch (error) {
    results.document_declined = { success: false, error: String(error) }
  }

  try {
    // Test decline cascade notification
    await NotificationService.notifyOtherSignersOfDecline(
      'test-request-123',
      'Test Document',
      'decliner@test.com',
      'Test Decliner',
      ['signer1@test.com', 'signer2@test.com']
    )
    results.decline_cascade = { success: true }
  } catch (error) {
    results.decline_cascade = { success: false, error: String(error) }
  }

  return results
}

async function testAdministrativeActions() {
  const results: any = {}
  
  try {
    // Test signer added notification
    await NotificationService.notifySignerAdded(
      'test-request-123',
      'Test Document',
      'newsigner@test.com',
      'New Signer',
      'requester-user-id'
    )
    results.signer_added = { success: true }
  } catch (error) {
    results.signer_added = { success: false, error: String(error) }
  }

  try {
    // Test signer removed notification
    await NotificationService.notifySignerRemoved(
      'test-request-123',
      'Test Document',
      'removedsigner@test.com',
      'Removed Signer',
      'requester-user-id'
    )
    results.signer_removed = { success: true }
  } catch (error) {
    results.signer_removed = { success: false, error: String(error) }
  }

  try {
    // Test deadline extended notification
    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await NotificationService.notifyDeadlineExtended(
      'test-request-123',
      'Test Document',
      newDeadline,
      'requester-user-id',
      ['signer1@test.com', 'signer2@test.com']
    )
    results.deadline_extended = { success: true }
  } catch (error) {
    results.deadline_extended = { success: false, error: String(error) }
  }

  return results
}

async function testScheduledNotifications() {
  const results: any = {}
  
  try {
    // Test expiry check
    const expiredResult = await NotificationScheduler.checkExpiredDocuments()
    results.expired_check = { 
      success: true, 
      processed: expiredResult.processed,
      notified: expiredResult.notified,
      errors: expiredResult.errors.length
    }
  } catch (error) {
    results.expired_check = { success: false, error: String(error) }
  }

  try {
    // Test deadline warnings
    const deadlineResult = await NotificationScheduler.checkDeadlineWarnings()
    results.deadline_warnings = { 
      success: true, 
      processed: deadlineResult.processed,
      notified: deadlineResult.notified,
      errors: deadlineResult.errors.length
    }
  } catch (error) {
    results.deadline_warnings = { success: false, error: String(error) }
  }

  try {
    // Test auto reminders
    const reminderResult = await NotificationScheduler.sendAutoReminders()
    results.auto_reminders = { 
      success: true, 
      processed: reminderResult.processed,
      notified: reminderResult.notified,
      errors: reminderResult.errors.length
    }
  } catch (error) {
    results.auto_reminders = { success: false, error: String(error) }
  }

  return results
}

async function testEmailDelivery() {
  const results: any = {}
  
  try {
    // Test basic notification creation (which triggers email)
    const emailResult = await NotificationService.createNotification(
      'test-user-id',
      'signature_request_received',
      'Test Email Notification',
      'This is a test email notification to verify email delivery is working.',
      {
        request_id: 'test-request-123',
        document_title: 'Test Document',
        action_url: '/sign/test-request-123'
      }
    )
    results.email_delivery = { success: emailResult }
  } catch (error) {
    results.email_delivery = { success: false, error: String(error) }
  }

  // Check environment variables
  results.environment_check = {
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasFromEmail: !!process.env.EMAIL_FROM_ADDRESS,
    hasFromName: !!process.env.EMAIL_FROM_NAME,
    hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL
  }

  return results
}

// GET endpoint for test suite information
export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'Complete Notification Test Suite',
      status: 'active',
      timestamp: new Date().toISOString(),
      available_test_suites: [
        'signing_workflow',
        'decline_workflow',
        'administrative_actions',
        'scheduled_notifications',
        'email_delivery',
        'all'
      ],
      description: {
        signing_workflow: 'Tests signature completion, document completion, and final document ready notifications',
        decline_workflow: 'Tests document decline and decline cascade notifications',
        administrative_actions: 'Tests signer add/remove and deadline extension notifications',
        scheduled_notifications: 'Tests expiry checks, deadline warnings, and auto reminders',
        email_delivery: 'Tests actual email delivery and environment configuration',
        all: 'Runs all test suites'
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

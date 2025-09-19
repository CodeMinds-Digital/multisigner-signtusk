import { NextRequest } from 'next/server'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const { testType, requestId, userEmail } = await request.json()

    console.log('🧪 Testing notification type:', testType)

    const testRequestId = requestId || 'test-request-123'
    const testUserEmail = userEmail || 'test@example.com'
    const testUserId = 'test-user-123'
    const documentTitle = 'Test Document'

    switch (testType) {
      case 'decline':
        await NotificationService.notifyDocumentDeclined(
          testRequestId,
          documentTitle,
          testUserEmail,
          'Test User',
          testUserId,
          'Testing decline notification'
        )
        break

      case 'decline_cascade':
        await NotificationService.notifyOtherSignersOfDecline(
          testRequestId,
          documentTitle,
          testUserEmail,
          'Test User',
          ['signer1@test.com', 'signer2@test.com']
        )
        break

      case 'document_expired':
        await NotificationService.notifyDocumentExpired(
          testRequestId,
          documentTitle,
          testUserId,
          ['signer1@test.com', 'signer2@test.com']
        )
        break

      case 'deadline_approaching':
        await NotificationService.notifyDeadlineApproaching(
          testRequestId,
          documentTitle,
          ['signer1@test.com', 'signer2@test.com'],
          24
        )
        break

      case 'signer_added':
        await NotificationService.notifySignerAdded(
          testRequestId,
          documentTitle,
          'newsigner@test.com',
          'New Signer',
          testUserId
        )
        break

      case 'signer_removed':
        await NotificationService.notifySignerRemoved(
          testRequestId,
          documentTitle,
          'removedsigner@test.com',
          'Removed Signer',
          testUserId
        )
        break

      case 'deadline_extended':
        await NotificationService.notifyDeadlineExtended(
          testRequestId,
          documentTitle,
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          testUserId,
          ['signer1@test.com', 'signer2@test.com']
        )
        break

      case 'document_accessed':
        await NotificationService.notifyDocumentAccessed(
          testRequestId,
          documentTitle,
          testUserEmail,
          'Test User',
          testUserId
        )
        break

      case 'final_document_ready':
        await NotificationService.notifyFinalDocumentReady(
          testRequestId,
          documentTitle,
          testUserId,
          ['signer1@test.com', 'signer2@test.com'],
          'https://example.com/final-document.pdf'
        )
        break

      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid test type',
            availableTypes: [
              'decline',
              'decline_cascade', 
              'document_expired',
              'deadline_approaching',
              'signer_added',
              'signer_removed',
              'deadline_extended',
              'document_accessed',
              'final_document_ready'
            ]
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${testType} notification test completed`,
        testType,
        requestId: testRequestId
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error testing notifications:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to test notifications',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

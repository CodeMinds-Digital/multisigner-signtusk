import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { 
  canSendReminder, 
  getReminderAnalytics,
  hasPendingSigners,
  formatTimeRemaining,
  getReminderRestrictionMessage 
} from '@/lib/reminder-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const requestId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    console.log('📊 Getting reminder status for signature request:', requestId)

    // Check if reminder can be sent
    const restriction = await canSendReminder(requestId, userId)
    
    // Get reminder analytics
    const analytics = await getReminderAnalytics(requestId, userId)
    
    // Check if there are pending signers
    const hasPending = await hasPendingSigners(requestId)

    // Calculate status information
    const status = {
      canSendReminder: restriction.allowed && hasPending,
      restriction: restriction,
      restrictionMessage: getReminderRestrictionMessage(restriction),
      hasPendingSigners: hasPending,
      analytics: analytics,
      timeRemaining: restriction.nextAllowedAt ? formatTimeRemaining(restriction.nextAllowedAt) : null,
      nextAvailableAt: restriction.nextAllowedAt,
      lastReminderAt: restriction.lastReminderAt
    }

    // Add user-friendly status message
    let statusMessage = ''
    if (!hasPending) {
      statusMessage = 'All signers have completed or declined signing'
    } else if (restriction.allowed) {
      statusMessage = 'Reminder can be sent now'
    } else {
      statusMessage = getReminderRestrictionMessage(restriction)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status: {
          ...status,
          message: statusMessage
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting reminder status:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

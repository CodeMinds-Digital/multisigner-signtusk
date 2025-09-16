import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const body = await request.json()
    const { notification_id, mark_all } = body

    console.log('📧 Marking notifications as read for user:', userId, { notification_id, mark_all })

    let success = false

    if (mark_all) {
      // Mark all notifications as read
      success = await NotificationService.markAllAsRead(userId)
    } else if (notification_id) {
      // Mark specific notification as read
      success = await NotificationService.markAsRead(notification_id)
    } else {
      return new Response(
        JSON.stringify({ error: 'Either notification_id or mark_all must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to mark notification(s) as read' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get updated unread count
    const unreadCount = await NotificationService.getUnreadCount(userId)

    return new Response(
      JSON.stringify({
        success: true,
        message: mark_all ? 'All notifications marked as read' : 'Notification marked as read',
        unread_count: unreadCount
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error marking notification as read:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

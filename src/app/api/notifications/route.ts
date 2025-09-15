import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { NotificationService } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    console.log('📧 Fetching notifications for user:', userId, { limit, offset, unreadOnly })

    // Get notifications
    const notifications = await NotificationService.getNotifications(
      userId,
      limit,
      unreadOnly
    )

    // Get unread count
    const unreadCount = await NotificationService.getUnreadCount(userId)

    return new Response(
      JSON.stringify({
        success: true,
        notifications,
        unread_count: unreadCount,
        pagination: {
          limit,
          offset,
          total: notifications.length
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching notifications:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

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
    const { type, title, message, metadata, action_url } = body

    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, title, message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Creating notification for user:', userId, { type, title })

    // Create notification
    const success = await NotificationService.createNotification(
      userId,
      type,
      title,
      message,
      metadata,
      action_url
    )

    if (!success) {
      return new Response(
        JSON.stringify({ error: 'Failed to create notification' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification created successfully'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

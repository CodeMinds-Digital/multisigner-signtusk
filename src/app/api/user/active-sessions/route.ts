import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// GET - Fetch user's active sessions
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Fetch active sessions from user_sessions table
    const { data: sessions, error } = await supabaseAdmin
      .from('user_sessions')
      .select(`
        id,
        session_token,
        created_at,
        last_used_at,
        expires_at,
        ip_address,
        user_agent,
        is_current
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false })

    if (error) {
      console.error('Error fetching active sessions:', error)

      // If table doesn't exist, return empty sessions instead of error
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('user_sessions table does not exist, returning empty sessions')
        return NextResponse.json({
          success: true,
          data: [],
          message: 'No sessions table found - this is normal for new installations'
        })
      }

      return NextResponse.json({
        error: 'Failed to fetch active sessions',
        details: error.message
      }, { status: 500 })
    }

    // Parse user agent to get device/browser info
    const sessionsWithDeviceInfo = sessions?.map(session => {
      const userAgent = session.user_agent || ''
      let deviceInfo = 'Unknown Device'
      let browserInfo = 'Unknown Browser'

      // Simple user agent parsing
      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        deviceInfo = 'Mobile Device'
      } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        deviceInfo = 'Tablet'
      } else {
        deviceInfo = 'Desktop'
      }

      if (userAgent.includes('Chrome')) {
        browserInfo = 'Chrome'
      } else if (userAgent.includes('Firefox')) {
        browserInfo = 'Firefox'
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserInfo = 'Safari'
      } else if (userAgent.includes('Edge')) {
        browserInfo = 'Edge'
      }

      return {
        id: session.id,
        deviceInfo,
        browserInfo,
        ipAddress: session.ip_address,
        location: 'Unknown', // Could be enhanced with IP geolocation
        lastAccessed: session.last_used_at,
        createdAt: session.created_at,
        isCurrent: session.is_current || false,
        expiresAt: session.expires_at
      }
    }) || []

    // If no sessions found, return empty array with helpful message
    if (!sessions || sessions.length === 0) {
      console.log('No active sessions found for user, this is normal for new users')
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No active sessions found - this is normal for new users'
      })
    }

    return NextResponse.json({
      success: true,
      data: sessionsWithDeviceInfo
    })

  } catch (error) {
    console.error('Error in active sessions GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Terminate a specific session
export async function DELETE(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Deactivate the specific session
    const { error } = await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString(),
        terminated_reason: 'user_requested'
      })
      .eq('id', sessionId)
      .eq('user_id', userId) // Ensure user can only terminate their own sessions

    if (error) {
      console.error('Error terminating session:', error)
      return NextResponse.json({ error: 'Failed to terminate session' }, { status: 500 })
    }

    // Log the session termination
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action: 'session_terminated',
        details: {
          session_id: sessionId,
          reason: 'user_requested',
          timestamp: new Date().toISOString()
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'Session terminated successfully'
    })

  } catch (error) {
    console.error('Error in session DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

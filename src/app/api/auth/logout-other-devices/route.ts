import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// POST - Logout all other devices except current session
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    const currentSessionId = payload.sessionId

    // Get current session info to preserve it
    const { data: currentSession, error: currentSessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('id, session_token')
      .eq('user_id', userId)
      .eq('id', currentSessionId)
      .eq('is_active', true)
      .single()

    if (currentSessionError || !currentSession) {
      console.error('Error finding current session:', currentSessionError)
      return NextResponse.json({ error: 'Current session not found' }, { status: 400 })
    }

    // Deactivate all other sessions for this user
    const { data: terminatedSessions, error: terminateError } = await supabaseAdmin
      .from('user_sessions')
      .update({
        is_active: false,
        terminated_at: new Date().toISOString(),
        terminated_reason: 'logout_other_devices'
      })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', currentSessionId) // Don't terminate current session
      .select('id')

    if (terminateError) {
      console.error('Error terminating other sessions:', terminateError)
      return NextResponse.json({ error: 'Failed to logout other devices' }, { status: 500 })
    }

    const terminatedCount = terminatedSessions?.length || 0

    // Log the action
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action: 'logout_other_devices',
        details: {
          terminated_sessions_count: terminatedCount,
          current_session_preserved: currentSessionId,
          timestamp: new Date().toISOString()
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: `Successfully logged out ${terminatedCount} other device${terminatedCount !== 1 ? 's' : ''}`,
      data: {
        terminatedSessionsCount: terminatedCount,
        currentSessionPreserved: true
      }
    })

  } catch (error) {
    console.error('Error in logout other devices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

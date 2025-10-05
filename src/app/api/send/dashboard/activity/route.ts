import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/dashboard/activity
 * Get recent activity
 */
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

    // Get recent analytics events
    const { data: events } = await supabaseAdmin
      .from('send_analytics_events')
      .select(`
        id,
        event_type,
        created_at,
        send_document_links!inner(
          id,
          name,
          send_shared_documents!inner(
            user_id
          )
        ),
        send_visitor_sessions!inner(
          email
        )
      `)
      .eq('send_document_links.send_shared_documents.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    // Transform events to activity format
    const activities = (events || []).map((event: any) => ({
      id: event.id,
      type: event.event_type,
      documentTitle: event.send_document_links?.name || 'Unknown Document',
      visitorEmail: event.send_visitor_sessions?.email || undefined,
      timestamp: event.created_at
    }))

    return NextResponse.json({
      success: true,
      activities
    })
  } catch (error) {
    console.error('Dashboard activity error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load activity' },
      { status: 500 }
    )
  }
}


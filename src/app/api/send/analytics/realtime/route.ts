import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/send/analytics/realtime
 * Polling fallback endpoint for real-time analytics
 * Returns active viewers and recent events
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const linkId = searchParams.get('linkId')

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID required', errorCode: 'MISSING_DOCUMENT_ID' },
        { status: 400 }
      )
    }

    // Verify user has access to document
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('user_id')
      .eq('id', documentId)
      .single()

    if (!document || document.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied', errorCode: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // Get active sessions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    
    let sessionsQuery = supabaseAdmin
      .from('send_visitor_sessions')
      .select('*')
      .eq('document_id', documentId)
      .gte('last_activity_at', fiveMinutesAgo)
      .order('last_activity_at', { ascending: false })

    if (linkId) {
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (link) {
        sessionsQuery = sessionsQuery.eq('link_id', link.id)
      }
    }

    const { data: sessions } = await sessionsQuery

    // Get recent events (last 5 minutes)
    const { data: events } = await supabaseAdmin
      .from('send_link_analytics_events')
      .select('*')
      .eq('document_id', documentId)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(50)

    // Format active viewers
    const activeViewers = sessions?.map(session => ({
      sessionId: session.id,
      email: session.email,
      fingerprint: session.fingerprint,
      timestamp: session.last_activity_at
    })) || []

    // Format recent events
    const recentEvents = events?.map(event => ({
      documentId: event.document_id,
      linkId: event.link_id,
      type: event.event_type,
      data: {
        sessionId: event.session_id,
        pageNumber: event.page_number,
        metadata: event.metadata
      },
      timestamp: event.created_at
    })) || []

    return NextResponse.json({
      success: true,
      activeViewers,
      recentEvents,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Realtime analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch realtime analytics', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}


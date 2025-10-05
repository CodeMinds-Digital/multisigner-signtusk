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
 * GET /api/send/visitors/profile/[fingerprint]
 * Get detailed visitor profile by fingerprint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fingerprint: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { fingerprint } = params
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const linkId = searchParams.get('linkId')

    // Build query
    let query = supabaseAdmin
      .from('send_visitor_sessions')
      .select('*')
      .eq('fingerprint', fingerprint)
      .order('created_at', { ascending: false })

    // Filter by link if provided
    if (linkId) {
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id, document_id')
        .eq('link_id', linkId)
        .single()

      if (link) {
        query = query.eq('link_id', link.id)
        
        // Verify ownership
        const { data: document } = await supabaseAdmin
          .from('send_shared_documents')
          .select('user_id')
          .eq('id', link.document_id)
          .single()

        if (!document || document.user_id !== user.id) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 403 }
          )
        }
      }
    }

    // Filter by document if provided
    if (documentId) {
      // Verify ownership
      const { data: document } = await supabaseAdmin
        .from('send_shared_documents')
        .select('id')
        .eq('id', documentId)
        .eq('user_id', user.id)
        .single()

      if (!document) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 403 }
        )
      }

      // Get all links for this document
      const { data: links } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('document_id', documentId)

      if (links && links.length > 0) {
        query = query.in('link_id', links.map(l => l.id))
      }
    }

    const { data: sessions, error } = await query

    if (error) {
      throw error
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Visitor not found' },
        { status: 404 }
      )
    }

    // Calculate visitor stats
    const firstVisit = sessions[sessions.length - 1]
    const lastVisit = sessions[0]
    const visitCount = sessions.length
    const totalDuration = sessions.reduce((sum, s) => sum + (s.total_duration || 0), 0)

    // Get associated views and events
    const sessionIds = sessions.map(s => s.id)

    const { data: views } = await supabaseAdmin
      .from('send_document_views')
      .select('*')
      .in('session_id', sessionIds)

    const { data: events } = await supabaseAdmin
      .from('send_analytics_events')
      .select('*')
      .in('session_id', sessionIds)

    const visitor = {
      fingerprint,
      visitCount,
      firstVisitAt: firstVisit.created_at,
      lastVisitAt: lastVisit.last_activity_at || lastVisit.created_at,
      totalDuration,
      avgSessionDuration: Math.round(totalDuration / visitCount),
      isReturning: visitCount > 1,
      sessions: sessions.map(s => ({
        id: s.id,
        createdAt: s.created_at,
        lastActivityAt: s.last_activity_at,
        duration: s.total_duration || 0,
        country: s.country,
        city: s.city,
        deviceType: s.device_type,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ip_address,
        screenResolution: s.screen_resolution,
        language: s.language,
        timezone: s.timezone,
        referrer: s.referrer
      })),
      views: views?.map(v => ({
        id: v.id,
        documentId: v.document_id,
        duration: v.duration_seconds,
        createdAt: v.created_at
      })),
      events: events?.map(e => ({
        id: e.id,
        type: e.event_type,
        pageNumber: e.page_number,
        createdAt: e.created_at
      })),
      stats: {
        totalViews: views?.length || 0,
        totalDownloads: events?.filter(e => e.event_type === 'download').length || 0,
        totalPrints: events?.filter(e => e.event_type === 'print').length || 0,
        pagesViewed: new Set(events?.filter(e => e.event_type === 'page_view').map(e => e.page_number)).size
      }
    }

    return NextResponse.json({
      success: true,
      visitor
    })
  } catch (error: any) {
    console.error('Visitor profile fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch visitor profile' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
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
 * POST /api/send/analytics/track
 * Track document view, download, print, and other events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      linkId,
      documentId,
      eventType, // 'view', 'download', 'print', 'page_view'
      email,
      pageNumber,
      duration,
      metadata
    } = body

    // Get visitor information
    const userAgent = request.headers.get('user-agent') || ''
    const ipAddress = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Get link details
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id, document_id')
      .eq('link_id', linkId)
      .single()

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    // Create or get visitor session
    let sessionId: string | null = null

    // Check for existing active session (within last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: existingSession } = await supabaseAdmin
      .from('send_visitor_sessions')
      .select('id')
      .eq('link_id', link.id)
      .eq('ip_address', ipAddress)
      .gte('last_activity_at', thirtyMinutesAgo)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .single()

    if (existingSession) {
      sessionId = existingSession.id

      // Update last activity
      await supabaseAdmin
        .from('send_visitor_sessions')
        .update({
          last_activity_at: new Date().toISOString(),
          page_count: supabaseAdmin.rpc('increment', { x: 1 })
        })
        .eq('id', sessionId)
    } else {
      // Create new session
      const { data: newSession } = await supabaseAdmin
        .from('send_visitor_sessions')
        .insert({
          link_id: link.id,
          document_id: link.document_id,
          visitor_email: email || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          referrer: request.headers.get('referer') || null,
          page_count: 1,
          last_activity_at: new Date().toISOString()
        })
        .select('id')
        .single()

      sessionId = newSession?.id || null
    }

    // Track specific event type
    if (eventType === 'view') {
      // Create document view record
      const { error: viewError } = await supabaseAdmin
        .from('send_document_views')
        .insert({
          document_id: link.document_id,
          link_id: link.id,
          session_id: sessionId,
          viewer_email: email || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          referrer: request.headers.get('referer') || null,
          duration_seconds: duration || 0
        })

      if (viewError) {
        console.error('View tracking error:', viewError)
      }

      // Increment link view count
      await supabaseAdmin
        .from('send_document_links')
        .update({
          view_count: supabaseAdmin.rpc('increment', { x: 1 }),
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', link.id)
    }

    if (eventType === 'page_view' && pageNumber) {
      // Track page view with scroll depth
      const scrollDepth = metadata?.scrollDepth || 0

      const { error: pageViewError } = await supabaseAdmin
        .from('send_page_views')
        .insert({
          document_id: link.document_id,
          link_id: link.id,
          session_id: sessionId,
          page_number: pageNumber,
          duration_seconds: duration || 0,
          scroll_depth: scrollDepth
        })

      if (pageViewError) {
        console.error('Page view tracking error:', pageViewError)
      }
    }

    if (eventType === 'download' || eventType === 'print') {
      // Track analytics event
      const { error: eventError } = await supabaseAdmin
        .from('send_analytics_events')
        .insert({
          document_id: link.document_id,
          link_id: link.id,
          session_id: sessionId,
          event_type: eventType,
          event_data: metadata || {},
          ip_address: ipAddress,
          user_agent: userAgent
        })

      if (eventError) {
        console.error('Event tracking error:', eventError)
      }

      // Increment download/print count on link
      if (eventType === 'download') {
        await supabaseAdmin
          .from('send_document_links')
          .update({
            download_count: supabaseAdmin.rpc('increment', { x: 1 })
          })
          .eq('id', link.id)
      }
    }

    return NextResponse.json({
      success: true,
      sessionId
    })
  } catch (error: any) {
    console.error('Analytics tracking error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track event' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/send/analytics/track
 * Get analytics for a document or link
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const linkId = searchParams.get('linkId')

    if (!documentId && !linkId) {
      return NextResponse.json(
        { success: false, error: 'documentId or linkId required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('send_document_views')
      .select('*')

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    if (linkId) {
      // Get link ID from link_id
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (link) {
        query = query.eq('link_id', link.id)
      }
    }

    const { data: views, error } = await query
      .order('viewed_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    // Calculate stats
    const totalViews = views?.length || 0
    const uniqueViewers = new Set(views?.map(v => v.viewer_email || v.ip_address)).size
    const avgDuration = views?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / totalViews || 0

    // Get page views for scroll depth and completion rate
    let pageViewsQuery = supabaseAdmin
      .from('send_page_views')
      .select('*')

    if (documentId) {
      pageViewsQuery = pageViewsQuery.eq('document_id', documentId)
    }

    if (linkId) {
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (link) {
        pageViewsQuery = pageViewsQuery.eq('link_id', link.id)
      }
    }

    const { data: pageViews } = await pageViewsQuery

    // Calculate scroll depth and completion rate
    const avgScrollDepth = pageViews?.reduce((sum, pv) => sum + (pv.scroll_depth || 0), 0) / (pageViews?.length || 1) || 0

    // Get total pages from document
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('page_count')
      .eq('id', documentId || views?.[0]?.document_id)
      .single()

    const totalPages = document?.page_count || 1
    const uniquePagesViewed = new Set(pageViews?.map(pv => pv.page_number)).size
    const completionRate = (uniquePagesViewed / totalPages) * 100

    // Calculate engagement score (0-100)
    let engagementScore = 0
    if (avgDuration >= 180) engagementScore += 30
    else if (avgDuration >= 60) engagementScore += 20
    else if (avgDuration >= 30) engagementScore += 10
    engagementScore += Math.floor(completionRate * 0.4)
    engagementScore += Math.floor(avgScrollDepth * 0.2)

    return NextResponse.json({
      success: true,
      stats: {
        totalViews,
        uniqueViewers,
        avgDuration: Math.round(avgDuration),
        avgScrollDepth: Math.round(avgScrollDepth),
        completionRate: Math.round(completionRate),
        engagementScore: Math.min(100, Math.max(0, engagementScore))
      },
      views: views || [],
      pageViews: pageViews || []
    })
  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}


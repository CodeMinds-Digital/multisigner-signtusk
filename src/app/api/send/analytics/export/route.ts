import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { SendAnalyticsExport } from '@/lib/send-analytics-export'

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
 * POST /api/send/analytics/export
 * Export analytics data to CSV or PDF
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { 
      documentId, 
      linkId, 
      format = 'csv',
      includeVisitors = true,
      includeEvents = true
    } = body

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID required' },
        { status: 400 }
      )
    }

    // Verify ownership
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, user_id, title, total_pages')
      .eq('id', documentId)
      .single()

    if (!document || document.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get analytics data
    const analyticsData = await fetchAnalyticsData(documentId, linkId)

    // Generate export based on format
    let exportContent: string
    let mimeType: string
    let filename: string

    if (format === 'csv') {
      exportContent = await SendAnalyticsExport.generateCSV(analyticsData, {
        documentId,
        linkId,
        format: 'csv',
        includeVisitors,
        includeEvents
      })
      mimeType = 'text/csv'
      filename = `analytics-${document.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.csv`
    } else if (format === 'pdf') {
      const htmlContent = SendAnalyticsExport.generateHTMLReport(analyticsData, {
        documentId,
        linkId,
        format: 'pdf',
        includeVisitors,
        includeEvents
      })
      exportContent = htmlContent
      mimeType = 'text/html'
      filename = `analytics-${document.title.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.html`
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid format' },
        { status: 400 }
      )
    }

    // Return file content
    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to export analytics' },
      { status: 500 }
    )
  }
}

async function fetchAnalyticsData(documentId: string, linkId?: string) {
  // Get document info
  const { data: document } = await supabaseAdmin
    .from('send_shared_documents')
    .select('id, title, total_pages')
    .eq('id', documentId)
    .single()

  // Get views
  let viewsQuery = supabaseAdmin
    .from('send_document_views')
    .select('*')
    .eq('document_id', documentId)

  if (linkId) {
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('link_id', linkId)
      .single()

    if (link) {
      viewsQuery = viewsQuery.eq('link_id', link.id)
    }
  }

  const { data: views } = await viewsQuery

  // Get page views
  const sessionIds = views?.map(v => v.session_id) || []
  const { data: pageViews } = await supabaseAdmin
    .from('send_page_views')
    .select('*')
    .in('session_id', sessionIds)

  // Get events
  const { data: events } = await supabaseAdmin
    .from('send_link_analytics_events')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Get visitor sessions
  const { data: sessions } = await supabaseAdmin
    .from('send_visitor_sessions')
    .select('*')
    .eq('document_id', documentId)

  // Calculate summary
  const totalViews = views?.length || 0
  const uniqueViewers = new Set(views?.map(v => v.session_id)).size
  const avgDuration = views?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / (totalViews || 1)
  const avgScrollDepth = pageViews?.reduce((sum, pv) => sum + (pv.scroll_depth || 0), 0) / (pageViews?.length || 1)
  
  const totalPages = document?.total_pages || 1
  const pagesViewed = new Set(pageViews?.map(pv => pv.page_number)).size
  const completionRate = (pagesViewed / totalPages) * 100

  const downloads = events?.filter(e => e.event_type === 'download').length || 0
  const prints = events?.filter(e => e.event_type === 'print').length || 0

  // Calculate engagement score
  let engagementScore = 0
  if (avgDuration >= 180) engagementScore += 30
  else if (avgDuration >= 60) engagementScore += 20
  else if (avgDuration >= 30) engagementScore += 10
  engagementScore += Math.floor(completionRate * 0.4)
  engagementScore += Math.floor(avgScrollDepth * 0.2)
  if (downloads > 0) engagementScore += 10

  // Calculate page stats
  const pageStatsMap = new Map()
  for (let i = 1; i <= totalPages; i++) {
    pageStatsMap.set(i, { page: i, views: 0, totalTime: 0, totalScroll: 0 })
  }

  pageViews?.forEach(pv => {
    const stats = pageStatsMap.get(pv.page_number)
    if (stats) {
      stats.views++
      stats.totalTime += pv.duration_seconds || 0
      stats.totalScroll += pv.scroll_depth || 0
    }
  })

  const pageStats = Array.from(pageStatsMap.values()).map(stats => ({
    page: stats.page,
    views: stats.views,
    avgTime: stats.views > 0 ? stats.totalTime / stats.views : 0,
    avgScroll: stats.views > 0 ? stats.totalScroll / stats.views : 0
  }))

  // Get top viewers
  const visitorMap = new Map()
  sessions?.forEach(session => {
    const fingerprint = session.fingerprint
    if (!visitorMap.has(fingerprint)) {
      visitorMap.set(fingerprint, {
        fingerprint,
        email: session.email,
        visits: 0,
        duration: 0
      })
    }
    const visitor = visitorMap.get(fingerprint)
    visitor.visits++
    visitor.duration += session.duration_seconds || 0
  })

  const topViewers = Array.from(visitorMap.values())
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10)

  return {
    document: {
      id: document?.id || documentId,
      title: document?.title || 'Unknown',
      totalPages: totalPages
    },
    summary: {
      totalViews,
      uniqueViewers,
      avgDuration,
      avgScrollDepth,
      completionRate,
      engagementScore,
      downloads,
      prints
    },
    pageStats,
    topViewers,
    events: events?.map(e => ({
      type: e.event_type,
      timestamp: e.created_at,
      page: e.page_number
    })) || []
  }
}


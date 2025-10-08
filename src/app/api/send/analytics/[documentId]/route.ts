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
 * GET /api/send/analytics/[documentId]
 * Get detailed analytics for a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
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

    const { documentId } = await params

    // Verify ownership
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get document links for this document
    const { data: links } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('document_id', documentId)

    const linkIds = links?.map(l => l.id) || []

    // Get all views for these links
    const { data: views } = await supabaseAdmin
      .from('send_document_views')
      .select('*')
      .in('link_id', linkIds)
      .order('created_at', { ascending: false })

    // Get all page views for these views
    const viewIds = views?.map(v => v.id) || []
    const { data: pageViews } = await supabaseAdmin
      .from('send_page_views')
      .select('*')
      .in('view_id', viewIds)
      .order('created_at', { ascending: false })

    // Get all sessions for these links
    const { data: sessions } = await supabaseAdmin
      .from('send_visitor_sessions')
      .select('*')
      .in('link_id', linkIds)

    // Get all analytics events for these links
    const { data: events } = await supabaseAdmin
      .from('send_analytics_events')
      .select('*')
      .in('link_id', linkIds)
      .order('timestamp', { ascending: false })

    // Calculate metrics
    const totalViews = views?.length || 0
    const uniqueViewers = new Set(views?.map(v => v.viewer_email || v.ip_address)).size
    const avgDuration = views?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / totalViews || 0

    // Page-level metrics
    const avgScrollDepth = pageViews?.reduce((sum, pv) => sum + (pv.scroll_depth || 0), 0) / (pageViews?.length || 1) || 0
    const totalPages = document.page_count || 1
    const uniquePagesViewed = new Set(pageViews?.map(pv => pv.page_number)).size
    const completionRate = (uniquePagesViewed / totalPages) * 100

    // Event counts
    const downloads = events?.filter(e => e.event_type === 'download').length || 0
    const prints = events?.filter(e => e.event_type === 'print').length || 0

    // Engagement score
    let engagementScore = 0
    if (avgDuration >= 180) engagementScore += 30
    else if (avgDuration >= 60) engagementScore += 20
    else if (avgDuration >= 30) engagementScore += 10
    engagementScore += Math.floor(completionRate * 0.4)
    engagementScore += Math.floor(avgScrollDepth * 0.2)
    if (downloads > 0) engagementScore += 10

    // Views over time (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const viewsByDate = views?.reduce((acc: Record<string, number>, view) => {
      const date = new Date(view.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {})

    // Page engagement (time per page)
    const pageEngagement = pageViews?.reduce((acc: Record<number, { duration: number, scrollDepth: number, count: number }>, pv) => {
      const page = pv.page_number
      if (!acc[page]) {
        acc[page] = { duration: 0, scrollDepth: 0, count: 0 }
      }
      acc[page].duration += pv.time_spent_seconds || 0
      acc[page].scrollDepth += pv.scroll_depth_percentage || 0
      acc[page].count += 1
      return acc
    }, {})

    // Calculate average per page
    const pageStats = Object.entries(pageEngagement || {}).map(([page, stats]) => ({
      page: parseInt(page),
      avgDuration: Math.round(stats.duration / stats.count),
      avgScrollDepth: Math.round(stats.scrollDepth / stats.count),
      views: stats.count
    }))

    // Top viewers
    const viewerStats = views?.reduce((acc: Record<string, { views: number, duration: number, email?: string }>, view) => {
      const key = view.viewer_email || view.ip_address
      if (!acc[key]) {
        acc[key] = { views: 0, duration: 0, email: view.viewer_email || undefined }
      }
      acc[key].views += 1
      acc[key].duration += view.duration_seconds || 0
      return acc
    }, {})

    const topViewers = Object.entries(viewerStats || {})
      .map(([identifier, stats]) => ({
        identifier,
        email: stats.email,
        views: stats.views,
        totalDuration: stats.duration,
        avgDuration: Math.round(stats.duration / stats.views)
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    // Geographic data (if available)
    const countries = sessions?.reduce((acc: Record<string, number>, session) => {
      const country = session.country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        totalPages: document.page_count
      },
      summary: {
        totalViews,
        uniqueViewers,
        avgDuration: Math.round(avgDuration),
        avgScrollDepth: Math.round(avgScrollDepth),
        completionRate: Math.round(completionRate),
        engagementScore: Math.min(100, Math.max(0, engagementScore)),
        downloads,
        prints
      },
      charts: {
        viewsByDate: Object.entries(viewsByDate || {}).map(([date, count]) => ({
          date,
          views: count
        })),
        pageStats: pageStats.sort((a, b) => a.page - b.page),
        topViewers,
        countries: Object.entries(countries || {}).map(([country, count]) => ({
          country,
          count
        }))
      },
      recentViews: views?.slice(0, 20).map(v => ({
        id: v.id,
        email: v.viewer_email,
        ipAddress: v.ip_address,
        duration: v.duration_seconds,
        createdAt: v.created_at
      })),
      recentEvents: events?.slice(0, 20).map(e => ({
        id: e.id,
        type: e.event_type,
        email: e.viewer_email,
        pageNumber: e.page_number,
        createdAt: e.created_at
      }))
    })
  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}


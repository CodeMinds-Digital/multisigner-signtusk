import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/dashboard/top-documents
 * Get top performing documents
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

    // Get documents with their links
    const { data: documents } = await supabaseAdmin
      .from('send_shared_documents')
      .select(`
        id,
        title,
        created_at,
        send_document_links (
          id,
          current_views
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (!documents) {
      return NextResponse.json({
        success: true,
        documents: []
      })
    }

    // Calculate metrics for each document
    const documentsWithStats = await Promise.all(
      documents.map(async (doc: any) => {
        const linkIds = doc.send_document_links?.map((link: any) => link.id) || []

        // Get total views from current_views in links
        const totalViews = doc.send_document_links?.reduce((sum: number, link: any) => sum + (link.current_views || 0), 0) || 0

        // Get download events
        const { data: downloads } = await supabaseAdmin
          .from('send_analytics_events')
          .select('id')
          .in('link_id', linkIds)
          .eq('event_type', 'download')

        // Get engagement scores from views
        const { data: views } = await supabaseAdmin
          .from('send_document_views')
          .select('engagement_score')
          .in('link_id', linkIds)
          .not('engagement_score', 'is', null)

        const avgEngagement = views && views.length > 0
          ? Math.round(views.reduce((sum, v) => sum + (v.engagement_score || 0), 0) / views.length)
          : 0

        return {
          id: doc.id,
          title: doc.title,
          views: totalViews,
          downloads: downloads?.length || 0,
          engagement: avgEngagement
        }
      })
    )

    // Sort by views and take top 10
    const topDocuments = documentsWithStats
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    return NextResponse.json({
      success: true,
      documents: topDocuments
    })
  } catch (error) {
    console.error('Top documents error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load top documents' },
      { status: 500 }
    )
  }
}


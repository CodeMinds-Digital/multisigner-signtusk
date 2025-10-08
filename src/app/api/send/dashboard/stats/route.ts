import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/dashboard/stats
 * Get dashboard statistics
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

    // Get total documents
    const { count: totalDocuments } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Get total links
    const { count: totalLinks } = await supabaseAdmin
      .from('send_document_links')
      .select('*, send_shared_documents!inner(user_id)', { count: 'exact', head: true })
      .eq('send_shared_documents.user_id', userId)

    // Get active links (not expired, not disabled)
    const { count: activeLinks } = await supabaseAdmin
      .from('send_document_links')
      .select('*, send_shared_documents!inner(user_id)', { count: 'exact', head: true })
      .eq('send_shared_documents.user_id', userId)
      .eq('is_active', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    // Get total views
    const { data: viewsData } = await supabaseAdmin
      .from('send_document_views')
      .select('id, send_document_links!inner(send_shared_documents!inner(user_id))')
      .eq('send_document_links.send_shared_documents.user_id', userId)

    const totalViews = viewsData?.length || 0

    // Get unique visitors
    const { data: visitorsData } = await supabaseAdmin
      .from('send_visitor_sessions')
      .select('session_id, send_document_links!inner(send_shared_documents!inner(user_id))')
      .eq('send_document_links.send_shared_documents.user_id', userId)

    const uniqueVisitors = new Set(visitorsData?.map(v => v.session_id) || []).size

    // Calculate average engagement - using views data since sessions might not have engagement_score
    const { data: engagementData } = await supabaseAdmin
      .from('send_document_views')
      .select('engagement_score, send_document_links!inner(send_shared_documents!inner(user_id))')
      .eq('send_document_links.send_shared_documents.user_id', userId)
      .not('engagement_score', 'is', null)

    const avgEngagement = engagementData && engagementData.length > 0
      ? Math.round(
        engagementData.reduce((sum, s) => sum + (s.engagement_score || 0), 0) / engagementData.length
      )
      : 0

    const stats = {
      totalDocuments: totalDocuments || 0,
      totalLinks: totalLinks || 0,
      totalViews: totalViews,
      activeLinks: activeLinks || 0,
      totalVisitors: uniqueVisitors,
      avgEngagement: avgEngagement
    }

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard stats' },
      { status: 500 }
    )
  }
}


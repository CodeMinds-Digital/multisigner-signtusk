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

    // Get documents with their stats
    const { data: documents } = await supabaseAdmin
      .from('send_shared_documents')
      .select(`
        id,
        title,
        send_document_links(
          id,
          view_count,
          send_visitor_sessions(
            fingerprint,
            engagement_score
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Calculate stats for each document
    const documentsWithStats = (documents || []).map((doc: any) => {
      const links = doc.send_document_links || []
      const totalViews = links.reduce((sum: number, link: any) => sum + (link.view_count || 0), 0)

      // Get unique visitors across all links
      const allSessions = links.flatMap((link: any) => link.send_visitor_sessions || [])
      const uniqueVisitors = new Set(allSessions.map((s: any) => s.fingerprint)).size

      // Calculate average engagement
      const engagementScores = allSessions
        .map((s: any) => s.engagement_score)
        .filter((score: any) => score !== null && score !== undefined)

      const avgEngagement = engagementScores.length > 0
        ? Math.round(engagementScores.reduce((sum: number, score: number) => sum + score, 0) / engagementScores.length)
        : 0

      return {
        id: doc.id,
        title: doc.title,
        views: totalViews,
        visitors: uniqueVisitors,
        engagement: avgEngagement
      }
    })

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


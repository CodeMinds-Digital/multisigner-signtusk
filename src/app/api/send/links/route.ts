import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get and verify authentication
    const tokens = getAuthTokensFromRequest(request)
    if (!tokens?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyAccessToken(tokens.accessToken)
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Fetch shared links for the user with comprehensive data
    const { data: links, error } = await supabaseAdmin
      .from('send_document_links')
      .select(`
        id,
        link_id,
        title,
        description,
        custom_slug,
        created_at,
        expires_at,
        password_hash,
        max_views,
        current_views,
        is_active,
        allow_download,
        require_email,
        require_nda,
        document_id,
        send_shared_documents!inner (
          title,
          file_name,
          file_type,
          file_size
        )
      `)
      .eq('created_by', payload.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shared links:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    // Get analytics data for all links
    const linkIds = links?.map(link => link.id) || []
    let analyticsData: any = {}

    if (linkIds.length > 0) {
      // Fetch view counts from document_views table
      const { data: viewsData } = await supabaseAdmin
        .from('send_document_views')
        .select('link_id, downloaded')
        .in('link_id', linkIds)

      // Fetch email tracking data
      const { data: emailsData } = await supabaseAdmin
        .from('send_link_emails')
        .select('link_id, status')
        .in('link_id', linkIds)

      // Process analytics
      viewsData?.forEach((view: any) => {
        if (!analyticsData[view.link_id]) {
          analyticsData[view.link_id] = { views: 0, downloads: 0, emails: 0 }
        }
        analyticsData[view.link_id].views++
        if (view.downloaded) {
          analyticsData[view.link_id].downloads++
        }
      })

      // Process email data
      emailsData?.forEach((email: any) => {
        if (!analyticsData[email.link_id]) {
          analyticsData[email.link_id] = { views: 0, downloads: 0, emails: 0 }
        }
        if (email.status === 'sent') {
          analyticsData[email.link_id].emails++
        }
      })
    }

    // Transform the data with comprehensive information
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const transformedLinks = links?.map((link: any) => {
      const sharedDoc = Array.isArray(link.send_shared_documents)
        ? link.send_shared_documents[0]
        : link.send_shared_documents;

      const analytics = analyticsData[link.id] || { views: 0, downloads: 0, emails: 0 }
      const shareUrl = `${baseUrl}/v/${link.link_id}`

      // Use current_views from the link table as primary source, fallback to analytics
      const viewCount = link.current_views || analytics.views || 0

      return {
        id: link.id,
        link_id: link.link_id,
        document_id: link.document_id, // ✅ Added missing document_id
        link_name: link.title || sharedDoc?.title || 'Untitled Link',
        document_title: sharedDoc?.title || sharedDoc?.file_name || 'Unknown Document',
        document_type: sharedDoc?.file_type || 'unknown',
        document_size: sharedDoc?.file_size || 0,
        share_url: shareUrl,
        custom_slug: link.custom_slug,
        description: link.description,
        created_at: link.created_at,
        expires_at: link.expires_at,
        password_protected: !!link.password_hash,
        view_limit: link.max_views,
        is_active: link.is_active,
        allow_download: link.allow_download,
        require_email: link.require_email,
        require_nda: link.require_nda,
        // Analytics data
        total_views: viewCount,
        total_downloads: analytics.downloads,
        emails_sent: analytics.emails,
        current_views: viewCount,
        // Calculated fields
        conversion_rate: viewCount > 0 ? ((analytics.downloads / viewCount) * 100).toFixed(1) : '0',
        is_expired: link.expires_at ? new Date(link.expires_at) < new Date() : false,
        is_limit_reached: link.max_views ? viewCount >= link.max_views : false
      }
    }) || []

    // Calculate summary statistics
    const stats = {
      total_links: transformedLinks.length,
      active_links: transformedLinks.filter(link => link.is_active && !link.is_expired && !link.is_limit_reached).length,
      total_views: transformedLinks.reduce((sum, link) => sum + link.total_views, 0),
      total_downloads: transformedLinks.reduce((sum, link) => sum + link.total_downloads, 0),
      total_emails: transformedLinks.reduce((sum, link) => sum + link.emails_sent, 0),
      expired_links: transformedLinks.filter(link => link.is_expired).length,
      password_protected: transformedLinks.filter(link => link.password_protected).length
    }

    return NextResponse.json({
      success: true,
      links: transformedLinks,
      stats,
      count: transformedLinks.length
    })

  } catch (error) {
    console.error('Error in GET /api/send/links:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

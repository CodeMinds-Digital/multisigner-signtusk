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

    // Fetch shared links for the user with proper join
    const { data: links, error } = await supabaseAdmin
      .from('send_document_links')
      .select(`
        id,
        title,
        created_at,
        expires_at,
        password_hash,
        max_views,
        current_views,
        is_active,
        document_id,
        send_shared_documents!inner (
          title,
          file_name
        )
      `)
      .eq('created_by', payload.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching shared links:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    // Transform the data to flatten the nested structure
    const transformedLinks = links?.map((link: any) => {
      const sharedDoc = Array.isArray(link.send_shared_documents)
        ? link.send_shared_documents[0]
        : link.send_shared_documents;

      return {
        id: link.id,
        link_name: link.title || sharedDoc?.title || 'Untitled Link',
        document_title: sharedDoc?.title || sharedDoc?.file_name || 'Unknown Document',
        created_at: link.created_at,
        expires_at: link.expires_at,
        password_protected: !!link.password_hash,
        view_limit: link.max_views,
        is_active: link.is_active,
        total_views: link.current_views || 0,
        total_downloads: 0, // We'll need to calculate this from analytics
        current_views: link.current_views || 0
      }
    }) || []

    return NextResponse.json({
      success: true,
      links: transformedLinks,
      count: transformedLinks.length
    })

  } catch (error) {
    console.error('Error in GET /api/send/links:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

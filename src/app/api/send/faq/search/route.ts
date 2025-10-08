import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/faq/search - Search FAQ items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const categoryId = searchParams.get('category_id')
    const documentId = searchParams.get('document_id')
    const dataroomId = searchParams.get('dataroom_id')
    const limit = parseInt(searchParams.get('limit') || '20')
    const userId = searchParams.get('user_id') // For public FAQ access

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    let targetUserId = userId

    // If no user_id provided, try to get from auth token
    if (!targetUserId) {
      const { accessToken } = getAuthTokensFromRequest(request)

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }

      const payload = await verifyAccessToken(accessToken)
      targetUserId = payload.userId
    }

    // Search FAQs using the custom function
    const { data: searchResults, error } = await supabaseAdmin
      .rpc('search_faq_items', {
        user_id_param: targetUserId,
        search_query_param: query.trim(),
        category_id_param: categoryId,
        document_id_param: documentId,
        data_room_id_param: dataroomId,
        limit_param: limit
      })

    if (error) {
      console.error('Error searching FAQ items:', error)
      return NextResponse.json(
        { error: 'Failed to search FAQ items' },
        { status: 500 }
      )
    }

    // Log search for analytics (if user is authenticated)
    if (targetUserId) {
      const userAgent = request.headers.get('user-agent') || ''
      const forwarded = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      const ipAddress = forwarded?.split(',')[0] || realIp || '127.0.0.1'

      // Don't await this to avoid slowing down the response
      Promise.resolve(supabaseAdmin
        .from('send_faq_search_history')
        .insert({
          user_id: targetUserId,
          search_query: query.trim(),
          results_count: searchResults?.length || 0,
          document_id: documentId || null,
          data_room_id: dataroomId || null,
          ip_address: ipAddress
        }))
        .then(() => { })
        .catch((err: any) => console.error('Error logging search:', err))
    }

    return NextResponse.json({
      success: true,
      results: searchResults || [],
      query: query.trim(),
      count: searchResults?.length || 0
    })

  } catch (error) {
    console.error('FAQ search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/faq/search - Log FAQ click/view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { faq_id, search_query, session_id } = body

    if (!faq_id) {
      return NextResponse.json(
        { error: 'FAQ ID is required' },
        { status: 400 }
      )
    }

    // Increment view count
    const { error: viewError } = await supabaseAdmin
      .rpc('increment_faq_view_count', { faq_id_param: faq_id })

    if (viewError) {
      console.error('Error incrementing FAQ view count:', viewError)
    }

    // Update search history with clicked FAQ (if search_query provided)
    if (search_query && session_id) {
      const { error: historyError } = await supabaseAdmin
        .from('send_faq_search_history')
        .update({ clicked_faq_id: faq_id })
        .eq('search_query', search_query)
        .eq('session_id', session_id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (historyError) {
        console.error('Error updating search history:', historyError)
      }
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('FAQ click tracking API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

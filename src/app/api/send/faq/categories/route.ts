import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/faq/categories - Get FAQ categories
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    // Build query
    let query = supabaseAdmin
      .from('send_faq_categories')
      .select(`
        *,
        faq_count:send_faq_items(count)
      `)
      .eq('user_id', userId)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching FAQ categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch FAQ categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      categories: categories || []
    })

  } catch (error) {
    console.error('FAQ categories API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/faq/categories - Create FAQ category
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const body = await request.json()
    const {
      name,
      description,
      icon,
      color = '#3B82F6',
      display_order = 0
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Create FAQ category
    const { data: category, error: createError } = await supabaseAdmin
      .from('send_faq_categories')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        color,
        display_order
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating FAQ category:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create FAQ category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      category
    })

  } catch (error) {
    console.error('Create FAQ category API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

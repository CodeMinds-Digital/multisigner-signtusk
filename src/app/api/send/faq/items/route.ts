import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/faq/items - Get FAQ items
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
    const categoryId = searchParams.get('category_id')
    const publishedOnly = searchParams.get('published_only') === 'true'
    const featuredOnly = searchParams.get('featured_only') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabaseAdmin
      .from('send_faq_items')
      .select(`
        *,
        category:send_faq_categories(id, name, color, icon)
      `)
      .eq('user_id', userId)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (publishedOnly) {
      query = query.eq('is_published', true)
    }

    if (featuredOnly) {
      query = query.eq('is_featured', true)
    }

    const { data: faqItems, error } = await query
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching FAQ items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch FAQ items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      faq_items: faqItems || [],
      has_more: faqItems && faqItems.length === limit
    })

  } catch (error) {
    console.error('FAQ items API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/faq/items - Create FAQ item
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
      category_id,
      question,
      answer,
      answer_format = 'text',
      keywords = [],
      tags = [],
      display_order = 0,
      is_published = true,
      is_featured = false
    } = body

    // Validate required fields
    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      )
    }

    // Validate answer format
    const validFormats = ['text', 'markdown', 'html']
    if (!validFormats.includes(answer_format)) {
      return NextResponse.json(
        { error: 'Invalid answer format' },
        { status: 400 }
      )
    }

    // Verify category belongs to user if provided
    if (category_id) {
      const { data: category, error: categoryError } = await supabaseAdmin
        .from('send_faq_categories')
        .select('id')
        .eq('id', category_id)
        .eq('user_id', userId)
        .single()

      if (categoryError || !category) {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        )
      }
    }

    // Create FAQ item
    const { data: faqItem, error: createError } = await supabaseAdmin
      .from('send_faq_items')
      .insert({
        user_id: userId,
        category_id: category_id || null,
        question: question.trim(),
        answer: answer.trim(),
        answer_format,
        keywords: Array.isArray(keywords) ? keywords.filter(k => k.trim()) : [],
        tags: Array.isArray(tags) ? tags.filter(t => t.trim()) : [],
        display_order,
        is_published,
        is_featured,
        published_at: is_published ? new Date().toISOString() : null
      })
      .select(`
        *,
        category:send_faq_categories(id, name, color, icon)
      `)
      .single()

    if (createError) {
      console.error('Error creating FAQ item:', createError)
      return NextResponse.json(
        { error: 'Failed to create FAQ item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      faq_item: faqItem
    })

  } catch (error) {
    console.error('Create FAQ item API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

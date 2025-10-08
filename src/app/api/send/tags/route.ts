import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/tags - Get user's tags
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
    const groupId = searchParams.get('group_id')
    const includeSystem = searchParams.get('include_system') === 'true'
    const sortBy = searchParams.get('sort_by') || 'name' // name, usage_count, created_at

    // Build query
    let query = supabaseAdmin
      .from('send_tags')
      .select(`
        *,
        group:send_tag_groups(id, name, color),
        document_count:send_document_tags(count)
      `)

    // Filter by user or include system tags
    if (includeSystem) {
      query = query.or(`user_id.eq.${userId},is_system.eq.true`)
    } else {
      query = query.eq('user_id', userId)
    }

    if (groupId) {
      query = query.eq('group_id', groupId)
    }

    // Apply sorting
    switch (sortBy) {
      case 'usage_count':
        query = query.order('usage_count', { ascending: false })
        break
      case 'created_at':
        query = query.order('created_at', { ascending: false })
        break
      default:
        query = query.order('name', { ascending: true })
    }

    const { data: tags, error } = await query

    if (error) {
      console.error('Error fetching tags:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tags: tags || []
    })

  } catch (error) {
    console.error('Tags API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/tags - Create tag
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
      color = '#3B82F6',
      icon,
      group_id
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Verify group belongs to user if provided
    if (group_id) {
      const { data: group, error: groupError } = await supabaseAdmin
        .from('send_tag_groups')
        .select('id')
        .eq('id', group_id)
        .eq('user_id', userId)
        .single()

      if (groupError || !group) {
        return NextResponse.json(
          { error: 'Tag group not found' },
          { status: 404 }
        )
      }
    }

    // Create tag
    const { data: tag, error: createError } = await supabaseAdmin
      .from('send_tags')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        color,
        icon: icon?.trim() || null,
        group_id: group_id || null
      })
      .select(`
        *,
        group:send_tag_groups(id, name, color)
      `)
      .single()

    if (createError) {
      console.error('Error creating tag:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A tag with this name already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create tag' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tag
    })

  } catch (error) {
    console.error('Create tag API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

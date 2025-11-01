import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/group-links - Get group-specific share links
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Get group share links with group information
    const { data: groupLinks, error: linksError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select(`
        *,
        viewer_group:send_dataroom_viewer_groups(
          name,
          color
        )
      `)
      .eq('data_room_id', roomId)
      .not('viewer_group_id', 'is', null)
      .order('created_at', { ascending: false })

    if (linksError) {
      console.error('Error fetching group links:', linksError)
      return NextResponse.json(
        { error: 'Failed to fetch group links' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedLinks = (groupLinks || []).map((link: any) => ({
      id: link.id,
      slug: link.slug,
      name: link.name,
      viewer_group_id: link.viewer_group_id,
      group_name: link.viewer_group?.name || 'Unknown Group',
      group_color: link.viewer_group?.color || '#3B82F6',
      password_protected: !!link.password_hash,
      expires_at: link.expires_at,
      view_limit: link.view_limit,
      download_enabled: link.download_enabled,
      watermark_enabled: link.watermark_enabled,
      created_at: link.created_at,
      total_views: link.total_views || 0,
      is_active: link.is_active
    }))

    return NextResponse.json({
      success: true,
      group_links: formattedLinks
    })

  } catch (error: any) {
    console.error('Get group links error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/group-links - Create group-specific share link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      viewer_group_id,
      slug,
      password_protected = false,
      password,
      expires_at,
      view_limit,
      download_enabled = true,
      watermark_enabled = false,
      screenshot_protection = false,
      welcome_message
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Link name is required' },
        { status: 400 }
      )
    }

    if (!viewer_group_id) {
      return NextResponse.json(
        { error: 'User group is required' },
        { status: 400 }
      )
    }

    // Verify the group belongs to this dataroom
    const { data: group, error: groupError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select('id')
      .eq('id', viewer_group_id)
      .eq('data_room_id', roomId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'User group not found' },
        { status: 404 }
      )
    }

    // Generate unique slug
    const linkSlug = slug?.trim() || Math.random().toString(36).substring(2, 10)

    // Check if slug is already taken
    const { data: existingLink } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('id')
      .eq('slug', linkSlug)
      .single()

    if (existingLink) {
      return NextResponse.json(
        { error: 'URL slug is already taken' },
        { status: 400 }
      )
    }

    // Hash password if provided
    let passwordHash = null
    if (password_protected && password) {
      const bcrypt = require('bcryptjs')
      passwordHash = await bcrypt.hash(password, 10)
    }

    // Create group share link
    const { data: groupLink, error: createError } = await supabaseAdmin
      .from('send_dataroom_links')
      .insert({
        data_room_id: roomId,
        viewer_group_id,
        name: name.trim(),
        slug: linkSlug,
        password_hash: passwordHash,
        expires_at: expires_at || null,
        view_limit: view_limit || null,
        download_enabled,
        watermark_enabled,
        screenshot_protection,
        welcome_message: welcome_message?.trim() || null,
        created_by: userId,
        is_active: true,
        total_views: 0
      })
      .select(`
        *,
        viewer_group:send_dataroom_viewer_groups(
          name,
          color
        )
      `)
      .single()

    if (createError) {
      console.error('Error creating group link:', createError)
      return NextResponse.json(
        { error: 'Failed to create group share link' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedLink = {
      id: groupLink.id,
      slug: groupLink.slug,
      name: groupLink.name,
      viewer_group_id: groupLink.viewer_group_id,
      group_name: groupLink.viewer_group?.name || 'Unknown Group',
      group_color: groupLink.viewer_group?.color || '#3B82F6',
      password_protected: !!groupLink.password_hash,
      expires_at: groupLink.expires_at,
      view_limit: groupLink.view_limit,
      download_enabled: groupLink.download_enabled,
      watermark_enabled: groupLink.watermark_enabled,
      created_at: groupLink.created_at,
      total_views: groupLink.total_views || 0,
      is_active: groupLink.is_active,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/v/${groupLink.slug}`
    }

    return NextResponse.json({
      success: true,
      group_link: formattedLink
    })

  } catch (error: any) {
    console.error('Create group link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

// GET /api/send/data-rooms/[roomId]/links - Get all share links for data room
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

    // Get all share links for this data room
    const { data: links, error: linksError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select(`
        *,
        viewer_group:send_dataroom_viewer_groups(
          name,
          color
        )
      `)
      .eq('data_room_id', roomId)
      .order('created_at', { ascending: false })

    if (linksError) {
      console.error('Error fetching data room links:', linksError)
      return NextResponse.json(
        { error: 'Failed to fetch links' },
        { status: 500 }
      )
    }

    // Format the response
    const formattedLinks = (links || []).map((link: any) => ({
      id: link.id,
      slug: link.slug,
      name: link.name,
      viewer_group_id: link.viewer_group_id,
      group_name: link.viewer_group?.name || null,
      group_color: link.viewer_group?.color || null,
      password_protected: !!link.password_hash,
      expires_at: link.expires_at,
      view_limit: link.view_limit,
      download_enabled: link.download_enabled,
      watermark_enabled: link.watermark_enabled,
      screenshot_protection: link.screenshot_protection,
      created_at: link.created_at,
      total_views: link.total_views || 0,
      is_active: link.is_active
    }))

    return NextResponse.json({
      success: true,
      links: formattedLinks
    })

  } catch (error: any) {
    console.error('Get data room links error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/links - Create new share link for data room
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
      slug,
      password_protected,
      password,
      expires_at,
      view_limit,
      download_enabled = true,
      watermark_enabled = false,
      screenshot_protection = false,
      access_controls = {}
    } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Link name is required' },
        { status: 400 }
      )
    }

    // Generate unique slug
    const linkSlug = slug?.trim() || nanoid(8)

    // Check if slug is already taken
    const { data: existingLink } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('id')
      .eq('slug', linkSlug)
      .single()

    if (existingLink) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      )
    }

    // Hash password if provided
    let passwordHash = null
    if (password_protected && password) {
      passwordHash = await bcrypt.hash(password, 10)
    }

    // Create share link
    const { data: link, error: createError } = await supabaseAdmin
      .from('send_dataroom_links')
      .insert({
        data_room_id: roomId,
        viewer_group_id: null, // General link, not group-specific
        name: name.trim(),
        slug: linkSlug,
        password_hash: passwordHash,
        expires_at: expires_at || null,
        view_limit: view_limit || null,
        download_enabled,
        watermark_enabled,
        screenshot_protection,
        access_controls,
        is_active: true,
        total_views: 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating data room link:', createError)
      return NextResponse.json(
        { error: 'Failed to create link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        slug: link.slug,
        name: link.name,
        password_protected: !!link.password_hash,
        expires_at: link.expires_at,
        view_limit: link.view_limit,
        download_enabled: link.download_enabled,
        watermark_enabled: link.watermark_enabled,
        screenshot_protection: link.screenshot_protection,
        created_at: link.created_at,
        total_views: 0,
        is_active: link.is_active,
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/v/${link.slug}`
      }
    })

  } catch (error: any) {
    console.error('Create data room link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

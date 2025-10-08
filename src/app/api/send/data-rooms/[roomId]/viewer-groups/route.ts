import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/viewer-groups - Get viewer groups for dataroom
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

    // Get viewer groups with member counts
    const { data: viewerGroups, error: groupsError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select(`
        *,
        member_count:send_dataroom_viewer_group_members(count)
      `)
      .eq('data_room_id', roomId)
      .order('created_at', { ascending: false })

    if (groupsError) {
      console.error('Error fetching viewer groups:', groupsError)
      return NextResponse.json(
        { error: 'Failed to fetch viewer groups' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      viewer_groups: viewerGroups || []
    })

  } catch (error) {
    console.error('Viewer groups API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/viewer-groups - Create viewer group
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
    const { name, description, color, is_default, members } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    // Create viewer group
    const { data: viewerGroup, error: createError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .insert({
        data_room_id: roomId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#3B82F6',
        is_default: is_default || false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating viewer group:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A viewer group with this name already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create viewer group' },
        { status: 500 }
      )
    }

    // Add members if provided
    if (members && Array.isArray(members) && members.length > 0) {
      const memberInserts = members.map((member: any) => ({
        group_id: viewerGroup.id,
        email: member.email.toLowerCase().trim(),
        name: member.name?.trim() || null,
        company: member.company?.trim() || null,
        role: member.role || 'viewer'
      }))

      const { error: membersError } = await supabaseAdmin
        .from('send_dataroom_viewer_group_members')
        .insert(memberInserts)

      if (membersError) {
        console.error('Error adding group members:', membersError)
        // Don't fail the group creation, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      viewer_group: viewerGroup
    })

  } catch (error) {
    console.error('Create viewer group API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/viewer-groups/[groupId]/members - Get group members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; groupId: string }> }
) {
  try {
    const { roomId, groupId } = await params
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

    // Verify group belongs to dataroom
    const { data: group, error: groupError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select('id')
      .eq('id', groupId)
      .eq('data_room_id', roomId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    // Get group members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('send_dataroom_viewer_group_members')
      .select('*')
      .eq('viewer_group_id', groupId)
      .order('added_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching group members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch group members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      members: members || []
    })
  } catch (error: any) {
    console.error('Get group members error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/viewer-groups/[groupId]/members - Add member to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; groupId: string }> }
) {
  try {
    const { roomId, groupId } = await params
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

    // Verify group belongs to dataroom
    const { data: group, error: groupError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select('id')
      .eq('id', groupId)
      .eq('data_room_id', roomId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { email, role = 'viewer', name } = body

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['viewer', 'collaborator', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if member already exists in this group
    const { data: existingMember } = await supabaseAdmin
      .from('send_dataroom_viewer_group_members')
      .select('id')
      .eq('viewer_group_id', groupId)
      .eq('email', email.trim().toLowerCase())
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'Member already exists in this group' },
        { status: 400 }
      )
    }

    // Add member to group
    const { data: member, error: memberError } = await supabaseAdmin
      .from('send_dataroom_viewer_group_members')
      .insert({
        viewer_group_id: groupId,
        email: email.trim().toLowerCase(),
        name: name?.trim() || null,
        role,
        added_by: userId
      })
      .select()
      .single()

    if (memberError) {
      console.error('Error adding group member:', memberError)
      return NextResponse.json(
        { error: 'Failed to add member to group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      member
    })
  } catch (error: any) {
    console.error('Add group member error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

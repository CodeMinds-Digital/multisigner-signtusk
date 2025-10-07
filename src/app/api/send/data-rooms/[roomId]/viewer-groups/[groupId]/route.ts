import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/viewer-groups/[groupId] - Get viewer group details
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

    // Verify user owns the dataroom and group exists
    const { data: viewerGroup, error: groupError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select(`
        *,
        data_room:send_data_rooms!inner(id, user_id)
      `)
      .eq('id', groupId)
      .eq('data_room_id', roomId)
      .single()

    if (groupError || !viewerGroup || viewerGroup.data_room.user_id !== userId) {
      return NextResponse.json(
        { error: 'Viewer group not found' },
        { status: 404 }
      )
    }

    // Get group members
    const { data: members, error: membersError } = await supabaseAdmin
      .from('send_dataroom_viewer_group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (membersError) {
      console.error('Error fetching group members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch group members' },
        { status: 500 }
      )
    }

    // Get group permissions
    const { data: permissions, error: permissionsError } = await supabaseAdmin
      .from('send_dataroom_permissions')
      .select('*')
      .eq('viewer_group_id', groupId)
      .order('created_at', { ascending: false })

    if (permissionsError) {
      console.error('Error fetching group permissions:', permissionsError)
      return NextResponse.json(
        { error: 'Failed to fetch group permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      viewer_group: {
        ...viewerGroup,
        members: members || [],
        permissions: permissions || []
      }
    })

  } catch (error) {
    console.error('Get viewer group API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/data-rooms/[roomId]/viewer-groups/[groupId] - Update viewer group
export async function PATCH(
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

    // Verify user owns the dataroom and group exists
    const { data: existingGroup, error: verifyError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select(`
        id,
        data_room:send_data_rooms!inner(id, user_id)
      `)
      .eq('id', groupId)
      .eq('data_room_id', roomId)
      .single()

    if (verifyError || !existingGroup || existingGroup.data_room.user_id !== userId) {
      return NextResponse.json(
        { error: 'Viewer group not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, color, is_default } = body

    // Update viewer group
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color
    if (is_default !== undefined) updateData.is_default = is_default

    const { data: updatedGroup, error: updateError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .update(updateData)
      .eq('id', groupId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating viewer group:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A viewer group with this name already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update viewer group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      viewer_group: updatedGroup
    })

  } catch (error) {
    console.error('Update viewer group API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/data-rooms/[roomId]/viewer-groups/[groupId] - Delete viewer group
export async function DELETE(
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

    // Verify user owns the dataroom and group exists
    const { data: existingGroup, error: verifyError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .select(`
        id,
        data_room:send_data_rooms!inner(id, user_id)
      `)
      .eq('id', groupId)
      .eq('data_room_id', roomId)
      .single()

    if (verifyError || !existingGroup || existingGroup.data_room.user_id !== userId) {
      return NextResponse.json(
        { error: 'Viewer group not found' },
        { status: 404 }
      )
    }

    // Delete viewer group (cascade will handle members and permissions)
    const { error: deleteError } = await supabaseAdmin
      .from('send_dataroom_viewer_groups')
      .delete()
      .eq('id', groupId)

    if (deleteError) {
      console.error('Error deleting viewer group:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete viewer group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Delete viewer group API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

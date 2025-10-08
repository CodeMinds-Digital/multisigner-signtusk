import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/permissions - Get permissions for dataroom
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const viewerEmail = searchParams.get('viewer_email')
    const viewerGroupId = searchParams.get('viewer_group_id')
    const resourceType = searchParams.get('resource_type')
    const resourceId = searchParams.get('resource_id')

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

    // Build query filters
    let query = supabaseAdmin
      .from('send_dataroom_permissions')
      .select(`
        *,
        viewer_group:send_dataroom_viewer_groups(id, name, color)
      `)
      .eq('data_room_id', roomId)

    if (viewerEmail) {
      query = query.eq('viewer_email', viewerEmail)
    }

    if (viewerGroupId) {
      query = query.eq('viewer_group_id', viewerGroupId)
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId)
    }

    const { data: permissions, error: permissionsError } = await query
      .order('created_at', { ascending: false })

    if (permissionsError) {
      console.error('Error fetching permissions:', permissionsError)
      return NextResponse.json(
        { error: 'Failed to fetch permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      permissions: permissions || []
    })

  } catch (error) {
    console.error('Permissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/permissions - Create or update permissions
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
      permissions // Array of permission objects
    } = body

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: 'Permissions array is required' },
        { status: 400 }
      )
    }

    const results = []

    for (const permission of permissions) {
      const {
        viewer_group_id,
        viewer_email,
        resource_type,
        resource_id,
        can_view = true,
        can_download = false,
        can_print = false,
        can_share = false,
        can_comment = false,
        access_starts_at,
        access_expires_at
      } = permission

      // Validate required fields
      if (!resource_type || !resource_id) {
        return NextResponse.json(
          { error: 'resource_type and resource_id are required' },
          { status: 400 }
        )
      }

      if (!viewer_group_id && !viewer_email) {
        return NextResponse.json(
          { error: 'Either viewer_group_id or viewer_email is required' },
          { status: 400 }
        )
      }

      if (viewer_group_id && viewer_email) {
        return NextResponse.json(
          { error: 'Cannot specify both viewer_group_id and viewer_email' },
          { status: 400 }
        )
      }

      // Check if permission already exists
      let query = supabaseAdmin
        .from('send_dataroom_permissions')
        .select('id')
        .eq('data_room_id', roomId)
        .eq('resource_type', resource_type)
        .eq('resource_id', resource_id)

      if (viewer_group_id) {
        query = query.eq('viewer_group_id', viewer_group_id)
      } else {
        query = query.eq('viewer_email', viewer_email)
      }

      const { data: existingPermission } = await query.single()

      const permissionData = {
        data_room_id: roomId,
        viewer_group_id: viewer_group_id || null,
        viewer_email: viewer_email || null,
        resource_type,
        resource_id,
        can_view,
        can_download,
        can_print,
        can_share,
        can_comment,
        access_starts_at: access_starts_at || null,
        access_expires_at: access_expires_at || null,
        granted_by: userId
      }

      if (existingPermission) {
        // Update existing permission
        const { data: updatedPermission, error: updateError } = await supabaseAdmin
          .from('send_dataroom_permissions')
          .update(permissionData)
          .eq('id', existingPermission.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating permission:', updateError)
          return NextResponse.json(
            { error: 'Failed to update permission' },
            { status: 500 }
          )
        }

        results.push(updatedPermission)
      } else {
        // Create new permission
        const { data: newPermission, error: createError } = await supabaseAdmin
          .from('send_dataroom_permissions')
          .insert(permissionData)
          .select()
          .single()

        if (createError) {
          console.error('Error creating permission:', createError)
          return NextResponse.json(
            { error: 'Failed to create permission' },
            { status: 500 }
          )
        }

        results.push(newPermission)
      }
    }

    return NextResponse.json({
      success: true,
      permissions: results
    })

  } catch (error) {
    console.error('Create permissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/data-rooms/[roomId]/permissions - Delete permissions
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const permissionIds = searchParams.get('ids')?.split(',') || []

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

    if (permissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Permission IDs are required' },
        { status: 400 }
      )
    }

    // Delete permissions
    const { error: deleteError } = await supabaseAdmin
      .from('send_dataroom_permissions')
      .delete()
      .eq('data_room_id', roomId)
      .in('id', permissionIds)

    if (deleteError) {
      console.error('Error deleting permissions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete permissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      deleted_count: permissionIds.length
    })

  } catch (error) {
    console.error('Delete permissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

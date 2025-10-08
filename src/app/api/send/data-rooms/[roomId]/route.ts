import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Fetch data room with documents
    const { data: dataRoom, error } = await supabaseAdmin
      .from('send_data_rooms')
      .select(`
        *,
        documents:send_data_room_documents(
          *,
          document:send_shared_documents(*)
        )
      `)
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (error || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      dataRoom
    })
  } catch (error) {
    console.error('Data room fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Parse request body
    const body = await request.json()
    const allowedFields = ['name', 'description', 'is_active', 'folder_structure']
    const updateData: any = {}

    // Only include allowed fields
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // Update data room
    const { data: dataRoom, error } = await supabaseAdmin
      .from('send_data_rooms')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !dataRoom) {
      console.error('Data room update error:', error)
      return NextResponse.json(
        { error: 'Failed to update data room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dataRoom
    })
  } catch (error) {
    console.error('Update data room API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Delete data room (this will cascade delete documents due to foreign key)
    const { error } = await supabaseAdmin
      .from('send_data_rooms')
      .delete()
      .eq('id', roomId)
      .eq('user_id', userId)

    if (error) {
      console.error('Data room deletion error:', error)
      return NextResponse.json(
        { error: 'Failed to delete data room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Data room deleted successfully'
    })
  } catch (error) {
    console.error('Delete data room API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

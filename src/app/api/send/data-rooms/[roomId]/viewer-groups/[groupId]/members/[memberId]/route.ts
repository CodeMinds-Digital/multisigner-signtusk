import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// DELETE /api/send/data-rooms/[roomId]/viewer-groups/[groupId]/members/[memberId] - Remove member from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; groupId: string; memberId: string }> }
) {
  try {
    const { roomId, groupId, memberId } = await params
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

    // Remove member from group
    const { error: deleteError } = await supabaseAdmin
      .from('send_dataroom_viewer_group_members')
      .delete()
      .eq('id', memberId)
      .eq('viewer_group_id', groupId)

    if (deleteError) {
      console.error('Error removing group member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member from group' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed from group successfully'
    })
  } catch (error: any) {
    console.error('Remove group member error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

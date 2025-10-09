import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/collaborators - Get all collaborators
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

    // Get collaborators
    const { data: collaborators, error: collaboratorsError } = await supabaseAdmin
      .from('send_dataroom_collaborators')
      .select('*')
      .eq('data_room_id', roomId)
      .order('invited_at', { ascending: false })

    if (collaboratorsError) {
      console.error('Error fetching collaborators:', collaboratorsError)
      return NextResponse.json(
        { error: 'Failed to fetch collaborators' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      collaborators: collaborators || []
    })

  } catch (error: any) {
    console.error('Get collaborators error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface CreateDataRoomRequest {
  name: string
  description?: string
  folderStructure?: any
}

export async function GET(request: NextRequest) {
  try {
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

    // Fetch user's data rooms with document counts
    const { data: dataRooms, error } = await supabaseAdmin
      .from('send_data_rooms')
      .select(`
        *,
        document_count:send_data_room_documents(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Data rooms fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch data rooms' },
        { status: 500 }
      )
    }

    // Transform the data to include document count
    const transformedDataRooms = dataRooms?.map(room => ({
      ...room,
      document_count: room.document_count?.[0]?.count || 0,
      total_views: 0 // TODO: Calculate from analytics
    })) || []

    return NextResponse.json({
      success: true,
      dataRooms: transformedDataRooms
    })
  } catch (error) {
    console.error('Data rooms API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const body: CreateDataRoomRequest = await request.json()
    const { name, description, folderStructure } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Data room name is required' },
        { status: 400 }
      )
    }

    // Create data room
    const { data: dataRoom, error: dataRoomError } = await supabaseAdmin
      .from('send_data_rooms')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || null,
        folder_structure: folderStructure || {
          '/': {
            name: 'Root',
            documents: [],
            subfolders: []
          }
        },
        is_active: true
      })
      .select()
      .single()

    if (dataRoomError) {
      console.error('Data room creation error:', dataRoomError)
      return NextResponse.json(
        { error: 'Failed to create data room' },
        { status: 500 }
      )
    }

    // Add document count for consistency
    const dataRoomWithCount = {
      ...dataRoom,
      document_count: 0,
      total_views: 0
    }

    return NextResponse.json({
      success: true,
      dataRoom: dataRoomWithCount
    })
  } catch (error) {
    console.error('Create data room API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

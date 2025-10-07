import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * POST /api/send/data-rooms/[roomId]/folders
 * Create a new folder in a data room
 */
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

    // Verify data room exists and user has access
    const { data: dataRoom, error: dataRoomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id, user_id, folder_structure')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataRoomError || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found or access denied' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { folder_path, name } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    if (!folder_path) {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      )
    }

    // Get current folder structure
    const folderStructure = dataRoom.folder_structure || {}

    // Check if folder already exists
    if (folderStructure[folder_path]) {
      return NextResponse.json(
        { error: 'Folder already exists at this path' },
        { status: 409 }
      )
    }

    // Create new folder in structure
    const updatedFolderStructure = {
      ...folderStructure,
      [folder_path]: {
        name: name.trim(),
        documents: [],
        subfolders: []
      }
    }

    // Update parent folder to include this subfolder
    const parentPath = folder_path.substring(0, folder_path.lastIndexOf('/')) || '/'

    // For root level folders, we don't need to update a parent folder structure
    // since the root folder doesn't exist as an entry in the folder structure
    if (parentPath !== '/' && updatedFolderStructure[parentPath]) {
      updatedFolderStructure[parentPath].subfolders = [
        ...(updatedFolderStructure[parentPath].subfolders || []),
        folder_path
      ]
    }

    // Update data room with new folder structure
    const { error: updateError } = await supabaseAdmin
      .from('send_data_rooms')
      .update({
        folder_structure: updatedFolderStructure,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Error updating data room folder structure:', updateError)
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folder: {
        path: folder_path,
        name: name.trim(),
        documents: [],
        subfolders: []
      }
    })

  } catch (error) {
    console.error('Create data room folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/send/data-rooms/[roomId]/folders
 * Get folders in a data room
 */
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

    // Verify data room exists and user has access
    const { data: dataRoom, error: dataRoomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id, folder_structure')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataRoomError || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found or access denied' },
        { status: 404 }
      )
    }

    const folderStructure = dataRoom.folder_structure || {}

    // Convert folder structure to array format, excluding the root folder
    const folders = Object.entries(folderStructure)
      .filter(([path]) => path !== '/') // Exclude root folder
      .map(([path, folder]: [string, any]) => ({
        path,
        name: folder.name,
        document_count: folder.documents?.length || 0,
        subfolder_count: folder.subfolders?.length || 0
      }))



    return NextResponse.json({
      success: true,
      folders
    })

  } catch (error) {
    console.error('Get data room folders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

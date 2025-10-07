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

/**
 * PATCH /api/send/data-rooms/[roomId]/folders
 * Rename a folder in a data room
 */
export async function PATCH(
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

    const body = await request.json()
    const { folder_path, new_name } = body

    if (!folder_path || !new_name) {
      return NextResponse.json(
        { error: 'Folder path and new name are required' },
        { status: 400 }
      )
    }

    // Validate folder name
    if (new_name.includes('/') || new_name.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid folder name' },
        { status: 400 }
      )
    }

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

    const folderStructure = dataRoom.folder_structure || {}

    // Check if folder exists
    if (!folderStructure[folder_path]) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Generate new path
    const pathParts = folder_path.split('/')
    pathParts[pathParts.length - 1] = new_name
    const new_path = pathParts.join('/')

    // Check if new path already exists
    if (folderStructure[new_path]) {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 409 }
      )
    }

    // Update folder structure
    const updatedFolderStructure = { ...folderStructure }

    // Copy folder to new path with updated name
    updatedFolderStructure[new_path] = {
      ...updatedFolderStructure[folder_path],
      name: new_name
    }

    // Remove old folder
    delete updatedFolderStructure[folder_path]

    // Update all subfolders and their parent references
    Object.keys(updatedFolderStructure).forEach(path => {
      if (path.startsWith(folder_path + '/')) {
        const newSubPath = path.replace(folder_path, new_path)
        updatedFolderStructure[newSubPath] = updatedFolderStructure[path]
        delete updatedFolderStructure[path]
      }

      // Update parent folder references
      if (updatedFolderStructure[path].subfolders) {
        updatedFolderStructure[path].subfolders = updatedFolderStructure[path].subfolders.map((subPath: string) =>
          subPath === folder_path ? new_path : subPath.startsWith(folder_path + '/') ? subPath.replace(folder_path, new_path) : subPath
        )
      }
    })

    // Update parent folder's subfolder reference
    const parentPath = folder_path.substring(0, folder_path.lastIndexOf('/')) || '/'
    if (parentPath !== '/' && updatedFolderStructure[parentPath]) {
      updatedFolderStructure[parentPath].subfolders = updatedFolderStructure[parentPath].subfolders?.map((subPath: string) =>
        subPath === folder_path ? new_path : subPath
      ) || []
    }

    // Save updated folder structure
    const { error: updateError } = await supabaseAdmin
      .from('send_data_rooms')
      .update({ folder_structure: updatedFolderStructure })
      .eq('id', roomId)

    if (updateError) {
      console.error('Update folder structure error:', updateError)
      return NextResponse.json(
        { error: 'Failed to rename folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Folder renamed successfully',
      old_path: folder_path,
      new_path: new_path
    })

  } catch (error) {
    console.error('Rename folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/send/data-rooms/[roomId]/folders
 * Delete a folder in a data room
 */
export async function DELETE(
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

    const body = await request.json()
    const { folder_path } = body

    if (!folder_path) {
      return NextResponse.json(
        { error: 'Folder path is required' },
        { status: 400 }
      )
    }

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

    const folderStructure = dataRoom.folder_structure || {}

    // Check if folder exists
    if (!folderStructure[folder_path]) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Update folder structure
    const updatedFolderStructure = { ...folderStructure }

    // Remove the folder and all its subfolders
    Object.keys(updatedFolderStructure).forEach(path => {
      if (path === folder_path || path.startsWith(folder_path + '/')) {
        delete updatedFolderStructure[path]
      }
    })

    // Update parent folder's subfolder reference
    const parentPath = folder_path.substring(0, folder_path.lastIndexOf('/')) || '/'
    if (parentPath !== '/' && updatedFolderStructure[parentPath]) {
      updatedFolderStructure[parentPath].subfolders = updatedFolderStructure[parentPath].subfolders?.filter((subPath: string) =>
        subPath !== folder_path && !subPath.startsWith(folder_path + '/')
      ) || []
    }

    // Update all other folders' subfolder references
    Object.keys(updatedFolderStructure).forEach(path => {
      if (updatedFolderStructure[path].subfolders) {
        updatedFolderStructure[path].subfolders = updatedFolderStructure[path].subfolders.filter((subPath: string) =>
          subPath !== folder_path && !subPath.startsWith(folder_path + '/')
        )
      }
    })

    // Save updated folder structure
    const { error: updateError } = await supabaseAdmin
      .from('send_data_rooms')
      .update({ folder_structure: updatedFolderStructure })
      .eq('id', roomId)

    if (updateError) {
      console.error('Update folder structure error:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully',
      deleted_path: folder_path
    })

  } catch (error) {
    console.error('Delete folder error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

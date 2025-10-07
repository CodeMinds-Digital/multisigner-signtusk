import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/folders - Get user's folder tree
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get folder tree using the custom function
    const { data: folders, error } = await supabaseAdmin
      .rpc('get_folder_tree', { user_id_param: userId })

    if (error) {
      console.error('Error fetching folder tree:', error)
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folders: folders || []
    })

  } catch (error) {
    console.error('Folders API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/folders - Create new folder
export async function POST(request: NextRequest) {
  try {
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
    const { name, parent_id, color, description } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    // Validate parent folder exists and belongs to user
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabaseAdmin
        .from('send_folders')
        .select('id')
        .eq('id', parent_id)
        .eq('user_id', userId)
        .single()

      if (parentError || !parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        )
      }
    }

    // Create folder
    const { data: folder, error: createError } = await supabaseAdmin
      .from('send_folders')
      .insert({
        name: name.trim(),
        parent_id: parent_id || null,
        user_id: userId,
        color: color || '#3B82F6',
        description: description?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating folder:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A folder with this name already exists in the same location' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folder
    })

  } catch (error) {
    console.error('Create folder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/folders - Move documents to folder
export async function PATCH(request: NextRequest) {
  try {
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
    const { document_ids, target_folder_id } = body

    if (!Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      )
    }

    // Move documents using the custom function
    const { data: movedCount, error } = await supabaseAdmin
      .rpc('move_documents_to_folder', {
        document_ids,
        target_folder_id: target_folder_id || null,
        user_id_param: userId
      })

    if (error) {
      console.error('Error moving documents:', error)
      return NextResponse.json(
        { error: 'Failed to move documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      moved_count: movedCount
    })

  } catch (error) {
    console.error('Move documents API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

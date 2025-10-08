import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/folders/[id] - Get folder details with documents
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get folder details
    const { data: folder, error: folderError } = await supabaseAdmin
      .from('send_folders')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Get documents in this folder
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('folder_id', id)
      .eq('user_id', userId)
      .eq('is_primary', true) // Only show primary versions
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('Error fetching folder documents:', docsError)
      return NextResponse.json(
        { error: 'Failed to fetch folder documents' },
        { status: 500 }
      )
    }

    // Get subfolders
    const { data: subfolders, error: subfoldersError } = await supabaseAdmin
      .from('send_folders')
      .select('*')
      .eq('parent_id', id)
      .eq('user_id', userId)
      .order('order_index', { ascending: true })

    if (subfoldersError) {
      console.error('Error fetching subfolders:', subfoldersError)
      return NextResponse.json(
        { error: 'Failed to fetch subfolders' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folder,
      documents: documents || [],
      subfolders: subfolders || []
    })

  } catch (error) {
    console.error('Get folder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/folders/[id] - Update folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { name, color, description, parent_id } = body

    // Verify folder exists and belongs to user
    const { data: existingFolder, error: verifyError } = await supabaseAdmin
      .from('send_folders')
      .select('id, parent_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (verifyError || !existingFolder) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      )
    }

    // Validate new parent folder if provided
    if (parent_id && parent_id !== existingFolder.parent_id) {
      // Check if new parent exists and belongs to user
      const { data: parentFolder, error: parentError } = await supabaseAdmin
        .from('send_folders')
        .select('id, path')
        .eq('id', parent_id)
        .eq('user_id', userId)
        .single()

      if (parentError || !parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found' },
          { status: 404 }
        )
      }

      // Prevent moving folder into its own subtree
      const { data: currentFolder } = await supabaseAdmin
        .from('send_folders')
        .select('path')
        .eq('id', id)
        .single()

      if (currentFolder && parentFolder.path.startsWith(currentFolder.path)) {
        return NextResponse.json(
          { error: 'Cannot move folder into its own subtree' },
          { status: 400 }
        )
      }
    }

    // Update folder
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (color !== undefined) updateData.color = color
    if (description !== undefined) updateData.description = description?.trim() || null
    if (parent_id !== undefined) updateData.parent_id = parent_id || null

    const { data: updatedFolder, error: updateError } = await supabaseAdmin
      .from('send_folders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating folder:', updateError)
      
      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A folder with this name already exists in the same location' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to update folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folder: updatedFolder
    })

  } catch (error) {
    console.error('Update folder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/folders/[id] - Delete folder
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Check if folder has documents or subfolders
    const { data: documents } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('folder_id', id)
      .eq('user_id', userId)
      .limit(1)

    const { data: subfolders } = await supabaseAdmin
      .from('send_folders')
      .select('id')
      .eq('parent_id', id)
      .eq('user_id', userId)
      .limit(1)

    if ((documents && documents.length > 0) || (subfolders && subfolders.length > 0)) {
      return NextResponse.json(
        { error: 'Cannot delete folder that contains documents or subfolders' },
        { status: 400 }
      )
    }

    // Delete folder
    const { error: deleteError } = await supabaseAdmin
      .from('send_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting folder:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Delete folder API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

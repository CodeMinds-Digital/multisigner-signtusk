import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/documents/[id]/versions - Get all versions of a document
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

    // Get document versions using the custom function
    const { data: versions, error } = await supabaseAdmin
      .rpc('get_document_version_tree', { doc_id: id })

    if (error) {
      console.error('Error fetching document versions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch document versions' },
        { status: 500 }
      )
    }

    // Verify user owns the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('created_by')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.created_by !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      versions: versions || []
    })

  } catch (error) {
    console.error('Document versions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/documents/[id]/versions - Create new version
export async function POST(
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
    const {
      title,
      file_url,
      file_name,
      file_size,
      file_type,
      version_notes
    } = body

    // Verify user owns the original document
    const { data: originalDoc, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (docError || !originalDoc) {
      return NextResponse.json(
        { error: 'Original document not found' },
        { status: 404 }
      )
    }

    if (originalDoc.created_by !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create new version document
    const { data: newVersion, error: versionError } = await supabaseAdmin
      .from('send_shared_documents')
      .insert({
        title: title || originalDoc.title,
        file_name,
        file_url,
        file_size,
        file_type,
        created_by: userId,
        parent_document_id: originalDoc.parent_document_id || id,
        version_notes,
        status: 'active'
      })
      .select()
      .single()

    if (versionError) {
      console.error('Error creating document version:', versionError)
      return NextResponse.json(
        { error: 'Failed to create document version' },
        { status: 500 }
      )
    }

    // Create version history record
    const { error: historyError } = await supabaseAdmin
      .from('send_document_versions')
      .insert({
        document_id: newVersion.id,
        version_number: newVersion.version_number,
        file_url,
        file_name,
        file_size,
        file_type,
        version_notes,
        created_by: userId
      })

    if (historyError) {
      console.error('Error creating version history:', historyError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      version: newVersion
    })

  } catch (error) {
    console.error('Create document version API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/documents/[id]/versions - Set primary version or update notes
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
    const { primary_version_id, action, version_notes } = body

    // Verify user owns the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('created_by, parent_document_id, storage_path')
      .eq('id', id)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (document.created_by !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Handle update notes action
    if (action === 'update_notes') {
      const { error: updateError } = await supabaseAdmin
        .from('send_shared_documents')
        .update({ version_notes })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        message: 'Version notes updated successfully'
      })
    }

    // Handle set primary version action
    // Get the root document ID
    const rootId = document.parent_document_id || id

    // Update all versions to non-primary
    const { error: updateError1 } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ is_primary: false })
      .or(`id.eq.${rootId},parent_document_id.eq.${rootId}`)

    if (updateError1) {
      console.error('Error updating versions:', updateError1)
      return NextResponse.json(
        { error: 'Failed to update versions' },
        { status: 500 }
      )
    }

    // Set the specified version as primary
    const { data: updatedDoc, error: updateError2 } = await supabaseAdmin
      .from('send_shared_documents')
      .update({ is_primary: true })
      .eq('id', primary_version_id)
      .select()
      .single()

    if (updateError2) {
      console.error('Error setting primary version:', updateError2)
      return NextResponse.json(
        { error: 'Failed to set primary version' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      primary_version: updatedDoc
    })

  } catch (error) {
    console.error('Set primary version API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/documents/[id]/versions - Delete a version (non-primary only)
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

    // Get version details
    const { data: version, error: fetchError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (version.created_by !== userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Cannot delete primary version
    if (version.is_primary) {
      return NextResponse.json(
        { error: 'Cannot delete primary version' },
        { status: 400 }
      )
    }

    // Delete from storage
    if (version.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('send-documents')
        .remove([version.storage_path])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('send_shared_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Version deleted successfully'
    })

  } catch (error) {
    console.error('Delete version API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

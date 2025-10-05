import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

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
 * GET /api/send/documents/[documentId]
 * Get document details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = params

    // Fetch document
    const { data: document, error } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document
    })
  } catch (error: any) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/send/documents/[documentId]
 * Update document (status, title, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = params
    const body = await request.json()
    const { status, title, description } = body

    // Verify ownership
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update document
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updates.status = status
    if (title) updates.title = title
    if (description !== undefined) updates.description = description

    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('send_shared_documents')
      .update(updates)
      .eq('id', documentId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument
    })
  } catch (error: any) {
    console.error('Document update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/send/documents/[documentId]
 * Delete document and associated files
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { documentId } = params

    // Fetch document to get file path
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or unauthorized' },
        { status: 404 }
      )
    }

    // Delete file from storage
    if (document.file_url) {
      try {
        // Extract file path from URL
        const url = new URL(document.file_url)
        const pathParts = url.pathname.split('/')
        const bucketIndex = pathParts.findIndex(part => part === 'send-documents')
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/')
          
          const { error: deleteFileError } = await supabaseAdmin.storage
            .from('send-documents')
            .remove([filePath])

          if (deleteFileError) {
            console.error('File deletion error:', deleteFileError)
          }
        }
      } catch (err) {
        console.error('Error parsing file URL:', err)
      }
    }

    // Delete thumbnail if exists
    if (document.thumbnail_url) {
      try {
        const url = new URL(document.thumbnail_url)
        const pathParts = url.pathname.split('/')
        const bucketIndex = pathParts.findIndex(part => part === 'send-thumbnails')
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/')
          
          await supabaseAdmin.storage
            .from('send-thumbnails')
            .remove([filePath])
        }
      } catch (err) {
        console.error('Error deleting thumbnail:', err)
      }
    }

    // Delete all associated links (cascade will handle related records)
    await supabaseAdmin
      .from('send_document_links')
      .delete()
      .eq('document_id', documentId)

    // Delete document record
    const { error: deleteError } = await supabaseAdmin
      .from('send_shared_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error: any) {
    console.error('Document deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}


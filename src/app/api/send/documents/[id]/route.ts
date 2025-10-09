import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/documents/[id]
 * Get document details and file URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Fetch document details
    const { data: document, error } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Generate signed URL for file access
    let signedUrl = null
    if (document.file_url) {
      try {
        // Extract file path from URL
        const urlParts = document.file_url.split('/')
        const bucketPath = urlParts.slice(-2).join('/') // Get userId/filename part
        
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('send-documents')
          .createSignedUrl(bucketPath, 3600) // 1 hour expiry

        if (!signedUrlError && signedUrlData) {
          signedUrl = signedUrlData.signedUrl
        }
      } catch (signedUrlError) {
        console.warn('Failed to generate signed URL:', signedUrlError)
        // Fallback to original URL
        signedUrl = document.file_url
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        signed_url: signedUrl
      }
    })

  } catch (error: any) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/send/documents/[id]
 * Update document details
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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
    const { title, description, status } = body

    // Verify document ownership
    const { data: existingDoc, error: checkError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (checkError || !existingDoc) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Update document
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status

    const { data: updatedDocument, error: updateError } = await supabaseAdmin
      .from('send_shared_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Update document error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      document: updatedDocument
    })

  } catch (error: any) {
    console.error('Update document error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/send/documents/[id]
 * Delete document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify document ownership and get file info
    const { data: document, error: checkError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, user_id, file_url')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (checkError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Delete file from storage
    if (document.file_url) {
      try {
        const urlParts = document.file_url.split('/')
        const bucketPath = urlParts.slice(-2).join('/') // Get userId/filename part
        
        await supabaseAdmin.storage
          .from('send-documents')
          .remove([bucketPath])
      } catch (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete document record
    const { error: deleteError } = await supabaseAdmin
      .from('send_shared_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete document error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

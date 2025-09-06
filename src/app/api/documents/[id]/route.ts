import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const documentId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get document details first
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('file_url')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching document:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract file path from public URL
    const urlParts = document.file_url.split('/')
    const filePath = `public/${urlParts[urlParts.length - 1]}`

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('files')
      .remove([filePath])

    if (storageError) {
      console.warn('Error deleting file from storage:', storageError)
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting document from database:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete document' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting document:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

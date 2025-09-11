import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const documentId = resolvedParams.id

    console.log('🔍 Fetching document with ID:', documentId)

    // Get document details from documents table (no auth required for PDF preview)
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, file_url, pdf_url, template_url, status, document_type, category')
      .eq('id', documentId)
      .single()

    if (error) {
      console.error('❌ Error fetching document:', error)
      return NextResponse.json(
        { error: 'Document not found', details: error.message },
        { status: 404 }
      )
    }

    if (!document) {
      console.log('📋 Document not found with ID:', documentId)
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    console.log('✅ Document found:', {
      id: document.id,
      title: document.title,
      file_url: document.file_url,
      pdf_url: document.pdf_url,
      template_url: document.template_url
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('❌ Error in document GET API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

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
    const requestId = resolvedParams.id

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

    console.log('🗑️ Deleting signature request:', requestId, 'by user:', userId)

    // First, verify the user owns this request
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signing_requests')
      .select('id, title, initiated_by')
      .eq('id', requestId)
      .eq('initiated_by', userId)
      .single()

    if (fetchError || !signatureRequest) {
      return new Response(
        JSON.stringify({ error: 'Signature request not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete related signers first (foreign key constraint)
    const { error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .delete()
      .eq('signing_request_id', requestId)

    if (signersError) {
      console.error('Error deleting signers:', signersError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signature request signers' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete the signature request
    const { error: deleteError } = await supabaseAdmin
      .from('signing_requests')
      .delete()
      .eq('id', requestId)
      .eq('initiated_by', userId)

    if (deleteError) {
      console.error('Error deleting signature request:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signature request' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully deleted signature request:', requestId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Signature request "${signatureRequest.title}" has been deleted successfully` 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting signature request:', error)
    
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const requestId = resolvedParams.id

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
    const userEmail = payload.email

    console.log('📋 Fetching signature request details:', requestId)

    // Get signature request with all related data
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        signers:signing_request_signers(*),
        document:documents!document_template_id(id, title, pdf_url, file_url)
      `)
      .eq('id', requestId)
      .single()

    if (fetchError || !signatureRequest) {
      return new Response(
        JSON.stringify({ error: 'Signature request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has access (either sender or signer)
    const isOwner = signatureRequest.initiated_by === userId
    const isSigner = signatureRequest.signers?.some((s: any) => s.signer_email === userEmail)

    if (!isOwner && !isSigner) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: signatureRequest }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching signature request:', error)
    
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

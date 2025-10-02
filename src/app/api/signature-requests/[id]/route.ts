import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RedisCacheService } from '@/lib/redis-cache-service'
import { UpstashAnalytics } from '@/lib/upstash-analytics'

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

    // First, check if the request exists and get its details
    const { data: signatureRequest, error: fetchError } = await supabaseAdmin
      .from('signing_requests')
      .select('id, title, initiated_by')
      .eq('id', requestId)
      .single()

    if (fetchError || !signatureRequest) {
      console.log('❌ Signature request not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Signature request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user owns this request (only creators can delete)
    if (signatureRequest.initiated_by !== userId) {
      console.log('❌ Access denied: User', userId, 'is not the creator of request', requestId)
      console.log('Request creator:', signatureRequest.initiated_by)
      return new Response(
        JSON.stringify({ error: 'Access denied. Only the request creator can delete this signature request.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ User authorized to delete request:', signatureRequest.title)

    // Delete related signers first (foreign key constraint)
    console.log('🗑️ Deleting signers for request:', requestId)
    const { data: deletedSigners, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .delete()
      .eq('signing_request_id', requestId)
      .select()

    if (signersError) {
      console.error('❌ Error deleting signers:', signersError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signature request signers' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Deleted', deletedSigners?.length || 0, 'signers')

    // Delete the signature request
    console.log('🗑️ Deleting signature request:', requestId)
    const { data: deletedRequest, error: deleteError } = await supabaseAdmin
      .from('signing_requests')
      .delete()
      .eq('id', requestId)
      .select()

    if (deleteError) {
      console.error('❌ Error deleting signature request:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signature request' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!deletedRequest || deletedRequest.length === 0) {
      console.error('❌ No signature request was deleted')
      return new Response(
        JSON.stringify({ error: 'Signature request could not be deleted' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Successfully deleted signature request:', requestId)
    console.log('🎯 Deletion summary:', {
      requestId,
      requestTitle: signatureRequest.title,
      deletedSigners: deletedSigners?.length || 0,
      deletedRequest: deletedRequest?.length || 0,
      note: 'This request has been removed from all signers\' inboxes as well'
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Signature request "${signatureRequest.title}" has been deleted successfully. It has been removed from all signers' inboxes.`,
        deletedSigners: deletedSigners?.length || 0
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

    // Try to get from cache first (non-blocking, with fallback)
    let signatureRequest = null
    try {
      signatureRequest = await RedisCacheService.getDocument(requestId)
      if (signatureRequest) {
        console.log('✅ Cache hit for signature request:', requestId)
      }
    } catch (cacheError) {
      console.warn('⚠️ Cache read failed (non-critical), fetching from database:', cacheError)
    }

    // If not in cache, fetch from database
    if (!signatureRequest) {
      const { data, error: fetchError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*),
          document:documents!document_template_id(id, title, pdf_url, file_url)
        `)
        .eq('id', requestId)
        .single()

      if (fetchError || !data) {
        return new Response(
          JSON.stringify({ error: 'Signature request not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }

      signatureRequest = data

      // Cache for future requests (non-blocking)
      try {
        await RedisCacheService.cacheDocument(requestId, signatureRequest)
        console.log('✅ Cached signature request:', requestId)
      } catch (cacheError) {
        console.warn('⚠️ Cache write failed (non-critical):', cacheError)
      }
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

    // Track document view analytics (non-blocking)
    try {
      await UpstashAnalytics.trackDocumentView(requestId, userId)
      console.log('✅ Tracked document view for:', requestId)
    } catch (analyticsError) {
      console.warn('⚠️ Analytics tracking failed (non-critical):', analyticsError)
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

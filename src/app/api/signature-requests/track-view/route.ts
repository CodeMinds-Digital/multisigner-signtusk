import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MultiSignatureWorkflowService } from '@/lib/multi-signature-workflow-service'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
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

    // Get request body
    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 Tracking document view for request:', requestId, 'by user:', userId)

    // Check if user is a signer for this request
    const { data: signer, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)
      .eq('signer_email', payload.email)
      .single()

    if (signerError || !signer) {
      console.log('❌ User is not a signer for this request:', signerError)
      return new Response(
        JSON.stringify({ error: 'User is not authorized to view this document' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Track document view using the new multi-signature workflow service
    const viewTracked = await MultiSignatureWorkflowService.trackDocumentView(
      requestId,
      payload.email
    )

    if (!viewTracked) {
      return new Response(
        JSON.stringify({ error: 'Failed to track document view' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signing request details for notification
    try {
      const { data: signingRequest } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      if (signingRequest && signingRequest.initiated_by) {
        // Notify the document owner that someone viewed the document
        await NotificationService.notifyDocumentViewed(
          signingRequest.initiated_by,
          payload.email,
          signingRequest.title || 'Document',
          requestId
        )
        console.log('📧 Document view notification sent to requester')
      }
    } catch (error) {
      console.error('❌ Error sending document view notification:', error)
      // Don't fail the request if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document view tracked successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error tracking document view:', error)

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

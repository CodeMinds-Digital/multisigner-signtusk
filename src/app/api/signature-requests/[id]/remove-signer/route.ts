import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NotificationService } from '@/lib/notification-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Get request body
    const { signerEmail } = await request.json()

    if (!signerEmail) {
      return new Response(
        JSON.stringify({ error: 'Signer email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('➖ Removing signer from request:', requestId, 'signer:', signerEmail)

    // Verify user owns this signature request
    const { data: signingRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .select('*')
      .eq('id', requestId)
      .eq('initiated_by', userId)
      .single()

    if (requestError || !signingRequest) {
      return new Response(
        JSON.stringify({ error: 'Signature request not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if request is still in progress
    if (signingRequest.status === 'completed' || signingRequest.status === 'declined') {
      return new Response(
        JSON.stringify({ error: 'Cannot remove signers from completed or declined requests' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Find the signer to remove
    const { data: signerToRemove, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)
      .eq('signer_email', signerEmail)
      .single()

    if (signerError || !signerToRemove) {
      return new Response(
        JSON.stringify({ error: 'Signer not found in this request' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if signer has already signed
    if (signerToRemove.status === 'signed' || signerToRemove.signer_status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'Cannot remove signer who has already signed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Remove the signer
    const { error: deleteError } = await supabaseAdmin
      .from('signing_request_signers')
      .delete()
      .eq('id', signerToRemove.id)

    if (deleteError) {
      console.error('❌ Error removing signer:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to remove signer' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update total signers count
    const { data: remainingSigners } = await supabaseAdmin
      .from('signing_request_signers')
      .select('id')
      .eq('signing_request_id', requestId)

    await supabaseAdmin
      .from('signing_requests')
      .update({
        total_signers: remainingSigners?.length || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    // Send notifications
    try {
      await NotificationService.notifySignerRemoved(
        requestId,
        signingRequest.title || 'Document',
        signerEmail,
        signerToRemove.signer_name || signerEmail,
        userId
      )
      console.log('📧 Signer removed notifications sent successfully')
    } catch (notificationError) {
      console.error('❌ Error sending signer removed notifications:', notificationError)
    }

    console.log('✅ Signer removed successfully:', signerEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signer removed successfully',
        removedSigner: {
          email: signerEmail,
          name: signerToRemove.signer_name
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error removing signer:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

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
    const { signerEmail, signerName, signingOrder } = await request.json()

    if (!signerEmail || !signerName) {
      return new Response(
        JSON.stringify({ error: 'Signer email and name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('➕ Adding signer to request:', requestId, 'signer:', signerEmail)

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
        JSON.stringify({ error: 'Cannot add signers to completed or declined requests' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if signer already exists
    const { data: existingSigner } = await supabaseAdmin
      .from('signing_request_signers')
      .select('id')
      .eq('signing_request_id', requestId)
      .eq('signer_email', signerEmail)
      .single()

    if (existingSigner) {
      return new Response(
        JSON.stringify({ error: 'Signer already exists in this request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get current max signing order
    const { data: maxOrderResult } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signing_order')
      .eq('signing_request_id', requestId)
      .order('signing_order', { ascending: false })
      .limit(1)

    const nextOrder = signingOrder || ((maxOrderResult?.[0]?.signing_order || 0) + 1)

    // Add the new signer
    const { data: newSigner, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .insert([{
        signing_request_id: requestId,
        signer_email: signerEmail,
        signer_name: signerName,
        signing_order: nextOrder,
        status: 'initiated',
        signer_status: 'initiated',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (signerError) {
      console.error('❌ Error adding signer:', signerError)
      return new Response(
        JSON.stringify({ error: 'Failed to add signer' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update total signers count
    const { data: allSigners } = await supabaseAdmin
      .from('signing_request_signers')
      .select('id')
      .eq('signing_request_id', requestId)

    await supabaseAdmin
      .from('signing_requests')
      .update({
        total_signers: allSigners?.length || 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    // Send notifications
    try {
      await NotificationService.notifySignerAdded(
        requestId,
        signingRequest.title || 'Document',
        signerEmail,
        signerName,
        userId
      )
      console.log('📧 Signer added notifications sent successfully')
    } catch (notificationError) {
      console.error('❌ Error sending signer added notifications:', notificationError)
    }

    console.log('✅ Signer added successfully:', signerEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signer added successfully',
        signer: newSigner
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error adding signer:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

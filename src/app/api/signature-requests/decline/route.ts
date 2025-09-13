import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const userEmail = payload.email

    // Get request body
    const { requestId, reason } = await request.json()

    if (!requestId || !reason) {
      return new Response(
        JSON.stringify({ error: 'Request ID and decline reason are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('❌ Processing decline for request:', requestId, 'by user:', userEmail)

    // Check if user is a signer for this request
    const { data: signer, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)
      .eq('signer_email', userEmail)
      .single()

    if (signerError || !signer) {
      console.log('❌ User is not a signer for this request:', signerError)
      return new Response(
        JSON.stringify({ error: 'User is not authorized to decline this document' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if already processed (check both status fields)
    if (signer.status === 'declined' || signer.signer_status === 'declined' ||
      signer.status === 'signed' || signer.signer_status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'Document already processed by this user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Update the declining signer's record
    const { error: updateSignerError } = await supabaseAdmin
      .from('signing_request_signers')
      .update({
        status: 'declined',
        signer_status: 'declined',
        decline_reason: reason,
        declined_at: new Date().toISOString(),
        ip_address: clientIP,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    if (updateSignerError) {
      console.error('❌ Error updating declining signer:', updateSignerError)
      return new Response(
        JSON.stringify({ error: 'Failed to record decline' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all signers for this request
    const { data: allSigners, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', requestId)

    if (signersError) {
      console.error('❌ Error fetching all signers:', signersError)
      return new Response(
        JSON.stringify({ error: 'Failed to update other signers' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update all other signers to declined status (if not already signed)
    const updatePromises = allSigners
      .filter(s => s.id !== signer.id &&
        s.status !== 'signed' && s.signer_status !== 'signed')
      .map(s =>
        supabaseAdmin
          .from('signing_request_signers')
          .update({
            status: 'declined',
            signer_status: 'declined',
            decline_reason: `Document declined by ${signer.signer_name || userEmail}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', s.id)
      )

    await Promise.all(updatePromises)

    // Update the signing request status to declined
    const { error: requestUpdateError } = await supabaseAdmin
      .from('signing_requests')
      .update({
        status: 'declined',
        document_status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: reason,
        declined_by: userEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (requestUpdateError) {
      console.error('❌ Error updating signing request status:', requestUpdateError)
    }

    console.log('✅ Document declined successfully by:', userEmail)

    // TODO: Send notification emails to all signers about the decline
    // await sendDeclineNotifications(requestId, reason, userEmail)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document declined successfully',
        reason,
        declined_by: userEmail
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error processing decline:', error)

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

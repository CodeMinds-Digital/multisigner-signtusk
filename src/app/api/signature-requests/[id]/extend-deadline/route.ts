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
    const { newExpiryDate } = await request.json()

    if (!newExpiryDate) {
      return new Response(
        JSON.stringify({ error: 'New expiry date is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate the new expiry date
    const newExpiry = new Date(newExpiryDate)
    const now = new Date()

    if (newExpiry <= now) {
      return new Response(
        JSON.stringify({ error: 'New expiry date must be in the future' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📅 Extending deadline for request:', requestId, 'to:', newExpiryDate)

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
        JSON.stringify({ error: 'Cannot extend deadline for completed or declined requests' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if new deadline is actually an extension
    const currentExpiry = new Date(signingRequest.expires_at)
    if (newExpiry <= currentExpiry) {
      return new Response(
        JSON.stringify({ error: 'New expiry date must be later than current expiry date' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update the expiry date
    const { error: updateError } = await supabaseAdmin
      .from('signing_requests')
      .update({
        expires_at: newExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('❌ Error extending deadline:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to extend deadline' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all signers for notifications
    const { data: allSigners } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signer_email')
      .eq('signing_request_id', requestId)

    const signerEmails = allSigners?.map(s => s.signer_email) || []

    // Send notifications
    try {
      await NotificationService.notifyDeadlineExtended(
        requestId,
        signingRequest.title || 'Document',
        newExpiry.toISOString(),
        userId,
        signerEmails
      )
      console.log('📧 Deadline extended notifications sent successfully')
    } catch (notificationError) {
      console.error('❌ Error sending deadline extended notifications:', notificationError)
    }

    console.log('✅ Deadline extended successfully to:', newExpiryDate)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deadline extended successfully',
        oldExpiryDate: signingRequest.expires_at,
        newExpiryDate: newExpiry.toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error extending deadline:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

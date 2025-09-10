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

    // Update signer's viewed_at timestamp and status if not already viewed
    if (!signer.viewed_at) {
      const { error: updateError } = await supabaseAdmin
        .from('signing_request_signers')
        .update({ 
          viewed_at: new Date().toISOString(),
          signer_status: 'viewed',
          updated_at: new Date().toISOString()
        })
        .eq('id', signer.id)

      if (updateError) {
        console.error('❌ Error updating signer viewed_at:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to track document view' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Update the signing request's viewed_count
      const { data: allSigners, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('viewed_at')
        .eq('signing_request_id', requestId)

      if (!signersError && allSigners) {
        const viewedCount = allSigners.filter(s => s.viewed_at).length

        const { error: requestUpdateError } = await supabaseAdmin
          .from('signing_requests')
          .update({ 
            viewed_count: viewedCount,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        if (requestUpdateError) {
          console.error('❌ Error updating signing request viewed count:', requestUpdateError)
        } else {
          console.log('✅ Updated viewed count to:', viewedCount)
        }
      }

      console.log('✅ Document view tracked successfully for signer:', signer.signer_email)
    } else {
      console.log('📊 Document already viewed by this signer')
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

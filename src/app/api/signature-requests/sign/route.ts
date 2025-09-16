import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MultiSignatureWorkflowService } from '@/lib/multi-signature-workflow-service'

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
    const { requestId, signatureData } = await request.json()

    if (!requestId || !signatureData) {
      return new Response(
        JSON.stringify({ error: 'Request ID and signature data are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🖊️ Processing signature for request:', requestId, 'by user:', userEmail)

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
        JSON.stringify({ error: 'User is not authorized to sign this document' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if already signed (check both status and signer_status fields)
    if (signer.status === 'signed' || signer.signer_status === 'signed') {
      return new Response(
        JSON.stringify({ error: 'Document already signed by this user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signing request with document info to check signing mode
    const { data: signingRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .select(`
        *,
        document:documents!document_template_id(*)
      `)
      .eq('id', requestId)
      .single()

    if (requestError || !signingRequest) {
      console.error('❌ Error fetching signing request:', requestError)
      return new Response(
        JSON.stringify({ error: 'Signing request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signing mode from signature request metadata (better approach)
    let signingMode = 'sequential' // default to sequential

    // First try: Check signature request metadata field
    if (signingRequest?.metadata) {
      try {
        const metadata = typeof signingRequest.metadata === 'string'
          ? JSON.parse(signingRequest.metadata)
          : signingRequest.metadata

        if (metadata.signing_mode) {
          signingMode = metadata.signing_mode
          console.log('✅ Parsed signing mode from signature request metadata:', signingMode)
        } else {
          // Fallback to document settings for backward compatibility
          if (signingRequest?.document?.settings) {
            try {
              const settings = typeof signingRequest.document.settings === 'string'
                ? JSON.parse(signingRequest.document.settings)
                : signingRequest.document.settings
              signingMode = settings.signing_order || 'sequential'
              console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
            } catch {
              console.log('⚠️ Could not parse document settings, using sequential mode (default)')
            }
          }
        }
      } catch {
        console.log('⚠️ Could not parse signature request metadata, trying document settings fallback')
        // Fallback to document settings
        if (signingRequest?.document?.settings) {
          try {
            const settings = typeof signingRequest.document.settings === 'string'
              ? JSON.parse(signingRequest.document.settings)
              : signingRequest.document.settings
            signingMode = settings.signing_order || 'sequential'
            console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
          } catch {
            console.log('⚠️ Could not parse document settings, using sequential mode (default)')
          }
        }
      }
    } else {
      // Fallback to document settings for backward compatibility
      if (signingRequest?.document?.settings) {
        try {
          const settings = typeof signingRequest.document.settings === 'string'
            ? JSON.parse(signingRequest.document.settings)
            : signingRequest.document.settings
          signingMode = settings.signing_order || 'sequential'
          console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
        } catch {
          console.log('⚠️ Could not parse document settings, using sequential mode (default)')
        }
      }
    }

    console.log(`📋 Signing mode for request ${requestId}: ${signingMode}`)

    // For sequential signing, validate signing order (strict order enforcement)
    if (signingMode === 'sequential') {
      console.log('🔄 Sequential mode: Enforcing strict signing order...')

      // Get all signers ordered by signing_order
      const { data: allSigners, error: allSignersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order', { ascending: true })

      if (allSignersError || !allSigners) {
        console.error('❌ Error fetching signers for sequential validation:', allSignersError)
        return new Response(
          JSON.stringify({ error: 'Failed to validate signing order' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Find current signer's position in the signing order
      const currentSignerIndex = allSigners.findIndex(s => s.signer_email === userEmail)

      if (currentSignerIndex === -1) {
        return new Response(
          JSON.stringify({ error: 'Signer not found in signing order' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // SEQUENTIAL MODE: Check if ALL previous signers have completed their signatures
      const previousSigners = allSigners.slice(0, currentSignerIndex)
      const incompletePreviousSigners = previousSigners.filter(s =>
        s.status !== 'signed' && s.signer_status !== 'signed'
      )

      if (incompletePreviousSigners.length > 0) {
        const pendingSignerNames = incompletePreviousSigners.map(s => s.signer_name || s.signer_email).join(', ')
        console.log(`❌ Sequential signing blocked: Previous signers must complete first: ${pendingSignerNames}`)

        return new Response(
          JSON.stringify({
            error: `Sequential signing: Please wait for previous signers to complete first: ${pendingSignerNames}`,
            signingMode: 'sequential',
            currentSignerOrder: signer.signing_order,
            pendingSigners: incompletePreviousSigners.map(s => ({
              name: s.signer_name,
              email: s.signer_email,
              order: s.signing_order
            }))
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.log(`✅ Sequential validation passed: Signer ${currentSignerIndex + 1} of ${allSigners.length} can sign`)
    } else if (signingMode === 'parallel') {
      console.log('🔄 Parallel mode: All signers can sign in any order')
      // No order validation needed for parallel mode - any signer can sign at any time
    }

    // Get current location if not provided
    let locationData = signatureData.location
    if (!locationData) {
      // In a real app, you'd get this from the client's geolocation
      locationData = {
        timestamp: new Date().toISOString(),
        note: 'Location captured at signing time'
      }
    }

    // Get client IP and user agent for audit trail
    const clientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Prepare signature data with timestamp and location
    const completeSignatureData = {
      ...signatureData,
      signed_at: new Date().toISOString(),
      location: locationData,
      ip_address: clientIP,
      user_agent: userAgent
    }

    // Update signer record with both status fields for compatibility
    const { error: updateError } = await supabaseAdmin
      .from('signing_request_signers')
      .update({
        status: 'signed',
        signer_status: 'signed',
        signed_at: new Date().toISOString(),
        viewed_at: signer.viewed_at || new Date().toISOString(), // Set viewed_at if not already set
        signature_data: JSON.stringify(completeSignatureData),
        location: locationData,
        ip_address: clientIP,
        user_agent: userAgent,
        updated_at: new Date().toISOString()
      })
      .eq('id', signer.id)

    if (updateError) {
      console.error('❌ Error updating signer record:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to save signature' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get all signers to check completion status
    const { data: allSigners, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('status, signer_status')
      .eq('signing_request_id', requestId)

    if (signersError) {
      console.error('❌ Error fetching all signers:', signersError)
      return new Response(
        JSON.stringify({ error: 'Failed to check completion status' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate completion status (check both status fields for compatibility)
    const signedCount = allSigners.filter(s =>
      s.status === 'signed' || s.signer_status === 'signed'
    ).length
    const totalSigners = allSigners.length

    // Also calculate viewed count (signers who have viewed_at timestamp)
    console.log('✅ Signature saved successfully. Signed:', signedCount, 'Total:', totalSigners)

    // Handle signer completion using the new multi-signature workflow service
    const completionResult = await MultiSignatureWorkflowService.handleSignerCompletion(
      requestId,
      userEmail
    )

    if (!completionResult.success) {
      console.error('❌ Failed to handle signer completion')
      return new Response(
        JSON.stringify({ error: 'Failed to process signature completion' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📊 Signer completion result:', completionResult)



    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signature saved successfully',
        signedCount,
        totalSigners,
        allSignersCompleted: completionResult.allCompleted,
        finalPdfUrl: completionResult.finalPdfUrl,
        nextSignerEmail: completionResult.nextSignerEmail
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error processing signature:', error)

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

import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { PDFGenerationService } from '@/lib/pdf-generation-service'

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
    const allSignersCompleted = signedCount === totalSigners

    // Update signing request status
    let documentStatus = 'pending'
    let requestStatus = 'in_progress'

    if (allSignersCompleted) {
      documentStatus = 'completed'
      requestStatus = 'completed'
    } else if (signedCount > 0) {
      documentStatus = 'partially_signed'
      requestStatus = 'in_progress'
    }

    const { error: requestUpdateError } = await supabaseAdmin
      .from('signing_requests')
      .update({
        status: requestStatus,
        signed_count: signedCount,
        document_status: documentStatus,
        updated_at: new Date().toISOString(),
        ...(allSignersCompleted && { completed_at: new Date().toISOString() })
      })
      .eq('id', requestId)

    if (requestUpdateError) {
      console.error('❌ Error updating signing request:', requestUpdateError)
    }

    console.log('✅ Signature saved successfully. Signed:', signedCount, 'Total:', totalSigners)

    // If all signers completed, trigger PDF generation
    if (allSignersCompleted) {
      console.log('🎉 All signers completed! Triggering PDF generation...')

      // Trigger PDF generation in background
      console.log('🎉 All signers completed! Triggering PDF generation...')
      PDFGenerationService.triggerPDFGeneration(requestId)
        .then(result => {
          if (result.success) {
            console.log('✅ PDF generation initiated successfully')
          } else {
            console.error('❌ PDF generation failed:', result.error)
          }
        })
        .catch(error => {
          console.error('❌ Error triggering PDF generation:', error)
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signature saved successfully',
        signedCount,
        totalSigners,
        allSignersCompleted,
        documentStatus
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

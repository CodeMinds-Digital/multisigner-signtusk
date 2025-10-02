import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MultiSignatureWorkflowService } from '@/lib/multi-signature-workflow-service'
import { NotificationService } from '@/lib/notification-service'
import { RealTimeStatusService } from '@/lib/real-time-status-service'
import { UpstashAnalytics } from '@/lib/upstash-analytics'
import { RedisCacheService } from '@/lib/redis-cache-service'

export async function POST(request: NextRequest) {
  let requestId: string | undefined
  let payload: any

  try {
    // Environment validation for production debugging
    const requestTrackingId = Math.random().toString(36).substring(2, 15)
    console.log(`🚀 [${requestTrackingId}] SIGNING REQUEST STARTED - Environment check:`, {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    })
    // Get access token from cookies
    console.log('🔐 Extracting authentication tokens...')
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      console.log('❌ No access token found in request')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔑 Access token found, verifying...')
    // Verify access token
    let userEmail: string
    try {
      payload = await verifyAccessToken(accessToken)
      userEmail = payload.email
      console.log('✅ Token verified for user:', userEmail)
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError)
      console.error('❌ Token error details:', {
        message: tokenError instanceof Error ? tokenError.message : 'Unknown',
        hasJwtSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        tokenPrefix: accessToken.substring(0, 20) + '...'
      })
      return new Response(
        JSON.stringify({
          error: 'Authentication failed',
          details: 'Invalid or expired authentication token',
          debugInfo: {
            hasJwtSecret: !!process.env.JWT_SECRET,
            jwtSecretLength: process.env.JWT_SECRET?.length || 0,
            tokenError: tokenError instanceof Error ? tokenError.message : 'Unknown'
          }
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const requestBody = await request.json()
    requestId = requestBody.requestId
    const signatureData = requestBody.signatureData

    if (!requestId || !signatureData) {
      return new Response(
        JSON.stringify({ error: 'Request ID and signature data are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🖊️ Processing signature for request:', requestId, 'by user:', userEmail)

    // Check if user is a signer for this request
    console.log('🔍 Querying signing_request_signers table...')
    let signer: any
    let signerError: any

    try {
      const result = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .eq('signer_email', userEmail)
        .single()

      signer = result.data
      signerError = result.error

      console.log('📊 Signer query result:', {
        found: !!signer,
        error: signerError?.message || 'none',
        signerData: signer ? { id: signer.id, email: signer.signer_email, status: signer.status } : null
      })
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError)
      console.error('❌ Database error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown',
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
      })
      return new Response(
        JSON.stringify({
          error: 'Database connection failed',
          details: 'Unable to connect to database',
          debugInfo: {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            dbError: dbError instanceof Error ? dbError.message : 'Unknown'
          }
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (signerError || !signer) {
      console.log('❌ User is not a signer for this request:', signerError)
      return new Response(
        JSON.stringify({
          error: 'User is not authorized to sign this document',
          details: signerError?.message || 'Signer not found',
          debugInfo: {
            requestId,
            userEmail,
            signerError: signerError?.message || 'Signer not found'
          }
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if already signed (check both status and signer_status fields)
    console.log(`🔍 [${requestTrackingId}] Checking signer status:`, {
      status: signer.status,
      signer_status: signer.signer_status,
      totp_verified: signer.totp_verified,
      signerId: signer.id,
      signerEmail: signer.signer_email,
      requestId: requestId,
      timestamp: new Date().toISOString()
    })

    if (signer.status === 'signed' || signer.signer_status === 'signed') {
      console.log(`❌ [${requestTrackingId}] Document already signed by this user`)
      return new Response(
        JSON.stringify({
          error: 'Document already signed by this user',
          debugInfo: {
            status: signer.status,
            signer_status: signer.signer_status,
            requestId: requestId,
            userEmail: userEmail
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // EARLY TOTP CHECK - Do this BEFORE any signature processing
    console.log(`🔍 [${requestTrackingId}] Performing early TOTP check before signature processing...`)

    // First, get the signing request to check if it requires TOTP
    const { data: signingRequestForTotp, error: requestErrorForTotp } = await supabaseAdmin
      .from('signing_requests')
      .select('require_totp')
      .eq('id', requestId)
      .single()

    if (requestErrorForTotp) {
      console.error('❌ Error fetching signing request for TOTP check:', requestErrorForTotp)
      return new Response(
        JSON.stringify({ error: 'Signing request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check TOTP requirements early
    const requestRequiresTotp = signingRequestForTotp?.require_totp || false

    // FIXED LOGIC: Document-level TOTP setting completely controls TOTP requirement
    // If "Require TOTP Authentication for Signing" checkbox is checked → TOTP required
    // If "Require TOTP Authentication for Signing" checkbox is unchecked → NO TOTP required (ignores user settings)
    // This ensures the checkbox in Request Signature Step 2 is the authoritative control
    const totpRequired = requestRequiresTotp

    console.log(`🔐 [${requestTrackingId}] Early TOTP Requirements Analysis (FIXED):`, {
      requestRequiresTotp,
      finalTotpRequired: totpRequired,
      totpVerified: signer.totp_verified,
      userEmail,
      requestId,
      logic: requestRequiresTotp ? 'Document checkbox requires TOTP' : 'Document checkbox allows signing without TOTP'
    })

    if (totpRequired && !signer.totp_verified) {
      console.log(`❌ [${requestTrackingId}] EARLY TOTP CHECK (FIXED): TOTP verification required but not completed`)
      return new Response(
        JSON.stringify({
          error: 'TOTP verification required before signing',
          requiresTOTP: true,
          requestId: requestId,
          reason: 'Document requires TOTP authentication for signing'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ [${requestTrackingId}] Early TOTP check passed - proceeding with signature processing`)

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

    // TOTP check was already performed earlier - proceeding with signature processing

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

    // Handle single signature mode
    if (signingMode === 'single') {
      console.log('📝 Single signature mode: Only one signer, no validation needed')
    }

    // For sequential signing, validate signing order (strict order enforcement)
    else if (signingMode === 'sequential') {
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
    const rawClientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'

    // Extract first IP if there are multiple (x-forwarded-for can have multiple IPs)
    const clientIP = rawClientIP.split(',')[0].trim()

    // Validate IP format for inet type (PostgreSQL inet type requires valid IP)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
    const validIP = ipRegex.test(clientIP) ? clientIP : '127.0.0.1'

    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Prepare signature data with timestamp and location
    const completeSignatureData = {
      ...signatureData,
      signed_at: new Date().toISOString(),
      location: locationData,
      ip_address: validIP,
      user_agent: userAgent
    }

    // Update signer record with both status fields for compatibility
    console.log('💾 Updating signer record with signature data...')
    const updateData = {
      status: 'signed',
      signer_status: 'signed',
      signed_at: new Date().toISOString(),
      viewed_at: signer.viewed_at || new Date().toISOString(), // Set viewed_at if not already set
      signature_data: JSON.stringify(completeSignatureData),
      location: locationData,
      ip_address: validIP,
      user_agent: userAgent,
      updated_at: new Date().toISOString()
    }

    console.log('📝 Update data prepared:', {
      signerId: signer.id,
      status: updateData.status,
      hasSignatureData: !!updateData.signature_data,
      hasLocation: !!updateData.location
    })

    const { error: updateError } = await supabaseAdmin
      .from('signing_request_signers')
      .update(updateData)
      .eq('id', signer.id)

    if (updateError) {
      console.error('❌ Error updating signer record:', updateError)
      console.error('❌ Update error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return new Response(
        JSON.stringify({ error: 'Failed to save signature' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Signer record updated successfully')

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

    // ✅ PERFORMANCE FIX: Publish real-time status update
    try {
      await RealTimeStatusService.publishDocumentSigned(
        requestId,
        userEmail,
        signedCount,
        totalSigners
      )
      console.log('📡 Real-time status update published')
    } catch (error) {
      console.error('❌ Error publishing real-time update:', error)
    }

    // Send signature completion notifications
    try {
      // Get signing request details for notifications
      const { data: signingRequest } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (signingRequest && signingRequest.initiated_by) {
        // Notify the requester that someone signed
        await NotificationService.notifySignatureCompleted(
          requestId,
          signingRequest.title || 'Document',
          userEmail,
          signingRequest.initiated_by
        )
        console.log('📧 Signature completion notification sent to requester')

        // Get all signers for this request to notify other signers
        const { data: allSigners } = await supabaseAdmin
          .from('signing_request_signers')
          .select('signer_email, signer_name')
          .eq('signing_request_id', requestId)

        if (allSigners) {
          // Get other signers who haven't signed yet (excluding current signer)
          const otherSignerEmails = allSigners
            .filter(s => s.signer_email !== userEmail)
            .map(s => s.signer_email)

          // Get current signer's name
          const currentSigner = allSigners.find(s => s.signer_email === userEmail)
          const signerName = currentSigner?.signer_name || userEmail

          // Notify other signers about this signature
          if (otherSignerEmails.length > 0) {
            await NotificationService.notifyOtherSignersOfSignature(
              requestId,
              signingRequest.title || 'Document',
              userEmail,
              signerName,
              otherSignerEmails
            )
            console.log('📧 Signature progress notifications sent to other signers:', otherSignerEmails)
          }
        }
      }
    } catch (notificationError) {
      console.error('❌ Error sending signature completion notifications:', notificationError)
      // Don't fail the signing operation if notifications fail
    }

    // Handle signer completion using the new multi-signature workflow service
    let completionResult
    try {
      completionResult = await MultiSignatureWorkflowService.handleSignerCompletion(
        requestId,
        userEmail
      )

      if (!completionResult.success) {
        console.error('❌ Failed to handle signer completion - service returned failure')
        return new Response(
          JSON.stringify({ error: 'Failed to process signature completion' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } catch (completionError) {
      console.error('❌ Exception in handleSignerCompletion:', completionError)
      console.error('❌ Completion error stack:', completionError instanceof Error ? completionError.stack : 'No stack trace')

      // Continue without completion handling to avoid blocking the signature save
      completionResult = { success: true, allCompleted: false }
      console.log('⚠️ Continuing without completion handling due to error')
    }

    console.log('📊 Signer completion result:', completionResult)

    // Track signature completion analytics (non-blocking)
    try {
      // Use email as identifier since userId might not be available for all signers
      await UpstashAnalytics.trackSignatureCompletion(requestId, userEmail)
      console.log('✅ Tracked signature completion for:', requestId, 'by', userEmail)
    } catch (analyticsError) {
      console.warn('⚠️ Analytics tracking failed (non-critical):', analyticsError)
    }

    // Invalidate cache for this document (non-blocking)
    try {
      await RedisCacheService.invalidateDocument(requestId)
      console.log('✅ Invalidated cache for:', requestId)
    } catch (cacheError) {
      console.warn('⚠️ Cache invalidation failed (non-critical):', cacheError)
    }

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
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      requestId,
      userEmail: payload?.email || 'Unknown',
      timestamp: new Date().toISOString()
    })

    // Check for specific error types
    if (error instanceof Error) {
      // Authentication/token errors
      if (error.message.includes('token') || error.message.includes('JWT') || error.message.includes('auth')) {
        return new Response(
          JSON.stringify({
            error: 'Authentication failed',
            details: 'Invalid or expired authentication token'
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Database connection errors
      if (error.message.includes('connect') || error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        return new Response(
          JSON.stringify({
            error: 'Database connection failed',
            details: 'Unable to connect to database. Please try again.'
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Permission/authorization errors
      if (error.message.includes('permission') || error.message.includes('unauthorized') || error.message.includes('forbidden')) {
        return new Response(
          JSON.stringify({
            error: 'Permission denied',
            details: 'Insufficient permissions to perform this action'
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // Validation errors
      if (error.message.includes('validation') || error.message.includes('invalid') || error.message.includes('required')) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: error.message
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generic server error with more details for debugging
    return new Response(
      JSON.stringify({
        error: 'Failed to save signature',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
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

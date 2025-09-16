import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
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
    const { requestId } = await request.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔍 Validating sequential signing permissions for:', requestId, 'by user:', userEmail)

    // Validate sequential signing permissions
    const validation = await MultiSignatureWorkflowService.validateSequentialSigningPermission(
      requestId,
      userEmail
    )

    console.log('✅ Sequential validation result:', validation)
    console.log('🔍 Validation details:', {
      requestId,
      userEmail,
      signingMode: validation.signingMode,
      canSign: validation.canSign,
      error: validation.error,
      fullValidationJSON: JSON.stringify(validation, null, 2)
    })

    // CRITICAL DEBUG: Log the exact mode detection
    if (validation.signingMode === 'parallel') {
      console.log('🔵 SERVER DETECTED: PARALLEL MODE')
    } else if (validation.signingMode === 'sequential') {
      console.log('🟡 SERVER DETECTED: SEQUENTIAL MODE')
    } else {
      console.log('❓ SERVER DETECTED: UNKNOWN MODE -', validation.signingMode)
    }

    return new Response(
      JSON.stringify(validation),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error validating sequential signing permissions:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to validate signing permissions',
        canSign: true, // Default to allowing signing if validation fails
        signingMode: 'sequential' // default to sequential to match creation default
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

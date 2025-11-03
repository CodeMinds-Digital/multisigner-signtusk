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
      allowed: validation.allowed,
      reason: validation.reason,
      fullValidationJSON: JSON.stringify(validation, null, 2)
    })

    // CRITICAL DEBUG: Log the exact mode detection
    if (validation.allowed) {
      console.log('🔵 SERVER DETECTED: ALLOWED TO SIGN')
    } else {
      console.log('🟡 SERVER DETECTED: NOT ALLOWED - ' + validation.reason)
    }

    return new Response(
      JSON.stringify(validation),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('❌ Error validating sequential signing permissions:', error)
    return new Response(
      JSON.stringify({
        allowed: true, // Default to allowing signing if validation fails
        reason: 'Validation error - defaulting to allow'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { TOTPService } from '@/lib/totp-service'

export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get request body
    const { 
      token, 
      enableLogin = false, 
      enableSigning = false,
      context = 'setup'
    } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    console.log('🔐 Verifying TOTP for user:', userId, 'context:', context)

    let result

    if (context === 'setup') {
      // Initial setup verification
      result = await TOTPService.verifyAndEnableTOTP(
        userId, 
        token, 
        enableLogin, 
        enableSigning
      )
    } else {
      // Regular verification for login/signing
      result = await TOTPService.verifyTOTP(userId, token, context)
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'TOTP verified successfully',
        usedBackupCode: result.usedBackupCode || false
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error verifying TOTP:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'TOTP verification failed' },
      { status: 500 }
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

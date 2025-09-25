import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { TOTPServiceSpeakeasy } from '@/lib/totp-service-speakeasy'

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
    const userEmail = payload.email

    // Get request body
    const { requestId, token } = await request.json()

    if (!requestId || !token) {
      return NextResponse.json(
        { error: 'Request ID and verification code are required' },
        { status: 400 }
      )
    }

    console.log('🔐 Verifying TOTP for signing request:', requestId, 'by user:', userEmail)

    // Get client IP for audit trail
    const rawClientIP = request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const clientIP = rawClientIP.split(',')[0].trim()

    // Verify TOTP for signing using Speakeasy
    const result = await TOTPServiceSpeakeasy.verifySigningTOTP(
      userId,
      requestId,
      token,
      clientIP
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'TOTP verified successfully for signing',
        usedBackupCode: (result as any).usedBackupCode || false
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ Error verifying signing TOTP:', error)

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

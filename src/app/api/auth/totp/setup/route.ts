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
    const userEmail = payload.email

    console.log('🔐 Setting up TOTP for user:', userEmail)

    // Setup TOTP for the user
    const totpSetup = await TOTPService.setupTOTP(userId, userEmail)

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: totpSetup.qrCodeUrl,
        manualEntryKey: totpSetup.manualEntryKey,
        backupCodes: totpSetup.backupCodes
      }
    })

  } catch (error) {
    console.error('❌ Error setting up TOTP:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to setup TOTP authentication' },
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

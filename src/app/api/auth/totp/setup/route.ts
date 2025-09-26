import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { TOTPServiceSpeakeasy } from '@/lib/totp-service-speakeasy'

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 TOTP Setup API called')

    // Check environment variables
    const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL']
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])

    if (missingEnvVars.length > 0) {
      console.error('❌ Missing environment variables:', missingEnvVars)
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      console.log('❌ No access token found in request')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🔍 Verifying access token...')

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    const userEmail = payload.email

    if (!userId || !userEmail) {
      console.error('❌ Invalid token payload:', { userId: !!userId, userEmail: !!userEmail })
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('🔐 Setting up TOTP for user:', userEmail)

    // Setup TOTP for the user using Speakeasy
    const totpSetup = await TOTPServiceSpeakeasy.setupTOTP(userId, userEmail)

    console.log('✅ TOTP setup completed successfully')

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: totpSetup.qrCodeUrl,
        manualEntryKey: totpSetup.manualEntryKey,
        backupCodes: totpSetup.backupCodes
      }
    })

  } catch (error) {
    console.error('❌ Error setting up TOTP:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes('token') || error.message.includes('jwt') || error.message.includes('JWT')) {
        return NextResponse.json(
          { error: 'Invalid or expired authentication token' },
          { status: 401 }
        )
      }

      if (error.message.includes('database') || error.message.includes('supabase')) {
        return NextResponse.json(
          { error: 'Database connection error' },
          { status: 503 }
        )
      }

      if (error.message.includes('speakeasy') || error.message.includes('secret')) {
        return NextResponse.json(
          { error: 'TOTP generation error' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to setup TOTP authentication',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
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

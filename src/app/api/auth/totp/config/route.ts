import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { TOTPService } from '@/lib/totp-service'

// GET - Get user's TOTP configuration
export async function GET(request: NextRequest) {
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

    // Get TOTP configuration
    const config = await TOTPService.getTOTPConfig(userId)

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          loginMFAEnabled: false,
          signingMFAEnabled: false,
          defaultRequireTOTP: false,
          backupCodesCount: 0
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled,
        loginMFAEnabled: config.login_mfa_enabled,
        signingMFAEnabled: config.signing_mfa_enabled,
        defaultRequireTOTP: config.default_require_totp,
        backupCodesCount: config.backup_codes?.length || 0,
        lastUsedAt: config.last_used_at,
        createdAt: config.created_at
      }
    })

  } catch (error) {
    console.error('❌ Error getting TOTP config:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get TOTP configuration' },
      { status: 500 }
    )
  }
}

// PUT - Update TOTP settings
export async function PUT(request: NextRequest) {
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
      loginMFA, 
      signingMFA, 
      defaultRequireTOTP 
    } = await request.json()

    console.log('🔐 Updating TOTP settings for user:', userId)

    // Update MFA settings
    const success = await TOTPService.updateMFASettings(userId, {
      loginMFA,
      signingMFA,
      defaultRequireTOTP
    })

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'TOTP settings updated successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to update TOTP settings' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error updating TOTP settings:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update TOTP settings' },
      { status: 500 }
    )
  }
}

// DELETE - Disable TOTP
export async function DELETE(request: NextRequest) {
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

    console.log('🔐 Disabling TOTP for user:', userId)

    // Disable MFA
    const success = await TOTPService.disableMFA(userId)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'TOTP authentication disabled successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to disable TOTP authentication' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error disabling TOTP:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to disable TOTP authentication' },
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
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

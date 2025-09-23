import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { TOTPService } from '@/lib/totp-service'

// GET - Get current backup codes count
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

    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: 'TOTP not configured or enabled' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        backupCodesCount: config.backup_codes?.length || 0,
        hasBackupCodes: (config.backup_codes?.length || 0) > 0
      }
    })

  } catch (error) {
    console.error('❌ Error getting backup codes info:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get backup codes information' },
      { status: 500 }
    )
  }
}

// POST - Generate new backup codes
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

    console.log('🔐 Generating new backup codes for user:', userId)

    // Generate new backup codes
    const newBackupCodes = await TOTPService.generateNewBackupCodes(userId)

    if (!newBackupCodes) {
      return NextResponse.json(
        { error: 'Failed to generate backup codes' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        backupCodes: newBackupCodes,
        message: 'New backup codes generated successfully. Please save them securely.'
      }
    })

  } catch (error) {
    console.error('❌ Error generating backup codes:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate backup codes' },
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

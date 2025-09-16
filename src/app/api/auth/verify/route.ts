import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

export async function GET(request: NextRequest) {
  try {
    // Get tokens from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token found' },
        { status: 401 }
      )
    }

    // Verify the access token
    const payload = await verifyAccessToken(accessToken)

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      )
    }

    // Return user information from the token
    return NextResponse.json({
      success: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role
      },
      authenticated: true
    })
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json(
      { error: 'Authentication verification failed' },
      { status: 401 }
    )
  }
}

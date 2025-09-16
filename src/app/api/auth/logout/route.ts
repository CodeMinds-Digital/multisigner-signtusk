import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, clearAuthCookies } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { revokeSession } from '@/lib/session-store'

export async function POST(request: NextRequest) {
  try {
    // Get access token from HttpOnly cookie
    const { accessToken } = getAuthTokensFromRequest(request)

    if (accessToken) {
      try {
        // Verify access token to get session ID
        const payload = await verifyAccessToken(accessToken)
        
        // Revoke the session
        await revokeSession(payload.sessionId)
      } catch (error) {
        // Token might be expired, but we still want to clear cookies
        console.warn('Could not verify token during logout:', error)
      }
    }

    // Clear auth cookies
    const response = NextResponse.json({ success: true })
    clearAuthCookies(response)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    
    // Even if there's an error, clear cookies
    const response = NextResponse.json({ success: true })
    clearAuthCookies(response)
    
    return response
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

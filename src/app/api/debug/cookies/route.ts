import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'

export async function GET(request: NextRequest) {
  try {
    // Get all cookies from the request
    const allCookies = request.cookies.getAll()
    
    // Get auth tokens specifically
    const { accessToken, refreshToken } = getAuthTokensFromRequest(request)
    
    // Get request headers for debugging
    const userAgent = request.headers.get('user-agent')
    const host = request.headers.get('host')
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    return new Response(
      JSON.stringify({
        success: true,
        debug: {
          host,
          origin,
          referer,
          userAgent,
          cookieCount: allCookies.length,
          allCookies: allCookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value.substring(0, 20) + '...' // Truncate for security
          })),
          authTokens: {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length || 0,
            refreshTokenLength: refreshToken?.length || 0
          }
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Cookie debug error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to debug cookies',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
}

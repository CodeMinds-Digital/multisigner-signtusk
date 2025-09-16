import { serialize, parse } from 'cookie'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_CONFIG } from './auth-config'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Set authentication cookies in HTTP response
 * Follows security best practices with HttpOnly, Secure, SameSite
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: AuthTokens
): NextResponse {
  const { accessToken, refreshToken, expiresAt } = tokens

  // Calculate actual expiry times
  const accessTokenExpiry = new Date(Date.now() + AUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000)
  const refreshTokenExpiry = new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_LIFETIME * 1000)

  // Set access token cookie
  const accessCookie = serialize(AUTH_CONFIG.COOKIES.ACCESS_TOKEN.name, accessToken, {
    ...AUTH_CONFIG.COOKIES.ACCESS_TOKEN,
    expires: accessTokenExpiry,
  })

  // Set refresh token cookie  
  const refreshCookie = serialize(AUTH_CONFIG.COOKIES.REFRESH_TOKEN.name, refreshToken, {
    ...AUTH_CONFIG.COOKIES.REFRESH_TOKEN,
    expires: refreshTokenExpiry,
  })

  // Set both cookies
  response.headers.set('Set-Cookie', [accessCookie, refreshCookie].join(', '))

  return response
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const accessCookie = serialize(AUTH_CONFIG.COOKIES.ACCESS_TOKEN.name, '', {
    ...AUTH_CONFIG.COOKIES.ACCESS_TOKEN,
    maxAge: 0,
    expires: new Date(0),
  })

  const refreshCookie = serialize(AUTH_CONFIG.COOKIES.REFRESH_TOKEN.name, '', {
    ...AUTH_CONFIG.COOKIES.REFRESH_TOKEN,
    maxAge: 0,
    expires: new Date(0),
  })

  response.headers.set('Set-Cookie', [accessCookie, refreshCookie].join(', '))

  return response
}

/**
 * Get authentication tokens from request cookies
 */
export function getAuthTokensFromRequest(request: NextRequest): {
  accessToken: string | null
  refreshToken: string | null
} {
  const cookies = request.cookies

  return {
    accessToken: cookies.get(AUTH_CONFIG.COOKIES.ACCESS_TOKEN.name)?.value || null,
    refreshToken: cookies.get(AUTH_CONFIG.COOKIES.REFRESH_TOKEN.name)?.value || null,
  }
}

/**
 * Get authentication tokens from cookie string
 */
export function getAuthTokensFromCookies(cookieString: string): {
  accessToken: string | null
  refreshToken: string | null
} {
  const cookies = parse(cookieString || '')

  return {
    accessToken: cookies[AUTH_CONFIG.COOKIES.ACCESS_TOKEN.name] || null,
    refreshToken: cookies[AUTH_CONFIG.COOKIES.REFRESH_TOKEN.name] || null,
  }
}

/**
 * Create response with auth cookies for API routes
 */
export function createAuthResponse(
  data: any,
  tokens: AuthTokens,
  status: number = 200
): Response {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Set cookies using Response headers
  const { accessToken, refreshToken } = tokens

  const accessCookie = serialize(AUTH_CONFIG.COOKIES.ACCESS_TOKEN.name, accessToken, {
    ...AUTH_CONFIG.COOKIES.ACCESS_TOKEN,
    expires: new Date(Date.now() + AUTH_CONFIG.ACCESS_TOKEN_LIFETIME * 1000),
  })

  const refreshCookie = serialize(AUTH_CONFIG.COOKIES.REFRESH_TOKEN.name, refreshToken, {
    ...AUTH_CONFIG.COOKIES.REFRESH_TOKEN,
    expires: new Date(Date.now() + AUTH_CONFIG.REFRESH_TOKEN_LIFETIME * 1000),
  })

  response.headers.set('Set-Cookie', [accessCookie, refreshCookie].join(', '))

  return response
}

/**
 * Validate cookie security settings
 */
export function validateCookieConfig(): boolean {
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction) {
    // In production, ensure secure settings
    return (
      AUTH_CONFIG.COOKIES.ACCESS_TOKEN.secure &&
      AUTH_CONFIG.COOKIES.REFRESH_TOKEN.secure &&
      AUTH_CONFIG.COOKIES.ACCESS_TOKEN.httpOnly &&
      AUTH_CONFIG.COOKIES.REFRESH_TOKEN.httpOnly &&
      AUTH_CONFIG.COOKIES.ACCESS_TOKEN.sameSite === 'lax' &&
      AUTH_CONFIG.COOKIES.REFRESH_TOKEN.sameSite === 'lax'
    )
  }

  return true // Allow non-secure in development
}

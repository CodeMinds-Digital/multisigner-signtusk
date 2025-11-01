import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest as getTokensFromCookies } from './auth-cookies'
import { verifyToken, TokenPayload } from './jwt-utils'

/**
 * Get authentication tokens from request cookies
 * Re-exports the function from auth-cookies for consistency
 */
export function getAuthTokensFromRequest(request: NextRequest): {
  accessToken: string | null
  refreshToken: string | null
} {
  return getTokensFromCookies(request)
}

/**
 * Verify access token and return payload
 * Wrapper around verifyToken from jwt-utils with proper error handling
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  try {
    const payload = await verifyToken(token)
    
    // Ensure it's an access token
    if (payload.type !== 'access') {
      throw new Error('Invalid token type')
    }
    
    return payload
  } catch (error) {
    throw new Error('Invalid or expired access token')
  }
}

/**
 * Extract user ID from request using access token
 * Convenience function for common auth pattern
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return null
    }
    
    const payload = await verifyAccessToken(accessToken)
    return payload.userId
  } catch (error) {
    return null
  }
}

/**
 * Check if request has valid authentication
 * Returns boolean for quick auth checks
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    const userId = await getUserIdFromRequest(request)
    return userId !== null
  } catch (error) {
    return false
  }
}

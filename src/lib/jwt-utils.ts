import { SignJWT, jwtVerify, JWTPayload } from 'jose'
import { JWT_CONFIG, AUTH_CONFIG } from './auth-config'

export interface TokenPayload extends JWTPayload {
  userId: string
  email: string
  role?: string
  sessionId: string
  type: 'access' | 'refresh'
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Generate JWT tokens (access + refresh pair)
 */
export async function generateTokenPair(
  userId: string,
  email: string,
  sessionId: string,
  role?: string
): Promise<TokenPair> {
  const secret = new TextEncoder().encode(JWT_CONFIG.secret)
  const now = Math.floor(Date.now() / 1000)

  // Generate access token (short-lived)
  const accessToken = await new SignJWT({
    userId,
    email,
    role,
    sessionId,
    type: 'access',
  })
    .setProtectedHeader({ alg: JWT_CONFIG.algorithm })
    .setIssuedAt(now)
    .setExpirationTime(now + AUTH_CONFIG.ACCESS_TOKEN_LIFETIME)
    .setIssuer(JWT_CONFIG.issuer)
    .setAudience(JWT_CONFIG.audience)
    .sign(secret)

  // Generate refresh token (long-lived)
  const refreshToken = await new SignJWT({
    userId,
    email,
    sessionId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: JWT_CONFIG.algorithm })
    .setIssuedAt(now)
    .setExpirationTime(now + AUTH_CONFIG.REFRESH_TOKEN_LIFETIME)
    .setIssuer(JWT_CONFIG.issuer)
    .setAudience(JWT_CONFIG.audience)
    .sign(secret)

  return {
    accessToken,
    refreshToken,
    expiresAt: now + AUTH_CONFIG.ACCESS_TOKEN_LIFETIME,
  }
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const secret = new TextEncoder().encode(JWT_CONFIG.secret)

    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    })

    return payload as TokenPayload
  } catch {
    throw new Error('Invalid or expired token')
  }
}

/**
 * Verify access token specifically
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const payload = await verifyToken(token)

  if (payload.type !== 'access') {
    throw new Error('Invalid token type')
  }

  return payload
}

/**
 * Verify refresh token specifically
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const payload = await verifyToken(token)

  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type')
  }

  return payload
}

/**
 * Check if token is expired
 */
export function isTokenExpired(payload: TokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  return !payload.exp || payload.exp <= now
}

/**
 * Check if token should be refreshed
 */
export function shouldRefreshToken(payload: TokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  if (!payload.exp) return true

  const timeUntilExpiry = payload.exp - now
  return timeUntilExpiry <= AUTH_CONFIG.REFRESH_THRESHOLD
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7)
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return crypto.randomUUID()
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeTokenUnsafe(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

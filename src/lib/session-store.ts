// Session storage using Upstash Redis for high performance
// Fallback to Supabase for critical session data

import { supabaseAdmin } from './supabase-admin'
import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from './upstash-config'

interface SessionData {
  userId: string
  email: string
  refreshToken: string
  createdAt: number
  lastUsedAt: number
  userAgent?: string
  ipAddress?: string
  totpVerified?: boolean
  totpVerifiedAt?: number
  totpContext?: 'login' | 'signing' | 'both'
}

// In-memory store for development fallback
const sessionStore = new Map<string, SessionData>()

// Use Redis for primary session storage with database backup
const USE_REDIS_SESSIONS = true
const USE_DATABASE_SESSIONS = true // For fallback when Redis is unavailable

/**
 * Store a new session with refresh token
 */
export async function storeSession(
  sessionId: string,
  userId: string,
  email: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const now = Date.now()

  const sessionData: SessionData = {
    userId,
    email,
    refreshToken: await hashToken(refreshToken),
    createdAt: now,
    lastUsedAt: now,
    userAgent,
    ipAddress,
  }

  if (USE_REDIS_SESSIONS) {
    try {
      console.log('📝 Storing session in Redis:', sessionId)

      // Store session in Redis with TTL
      const sessionKey = RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
      await RedisUtils.setWithTTL(sessionKey, sessionData, CACHE_TTL.SESSION)

      // Track user sessions for security (multiple device management)
      const userSessionsKey = RedisUtils.buildKey(CACHE_KEYS.USER_SESSIONS, userId)
      await redis.sadd(userSessionsKey, sessionId)
      await redis.expire(userSessionsKey, CACHE_TTL.SESSION)

      // Store backup in database for critical data
      await supabaseAdmin
        .from('user_sessions')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          email,
          refresh_token_hash: sessionData.refreshToken,
          created_at: new Date(now).toISOString(),
          last_used_at: new Date(now).toISOString(),
          user_agent: userAgent,
          ip_address: ipAddress
        })

      console.log('✅ Session stored in Redis and database successfully')
    } catch (error) {
      console.error('❌ Redis session store error:', error)
      // Fallback to in-memory store
      console.log('🔄 Falling back to in-memory session store')
      sessionStore.set(sessionId, sessionData)
    }
  } else {
    // Use in-memory store
    sessionStore.set(sessionId, sessionData)
  }
}

/**
 * Get session data by session ID
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    if (USE_DATABASE_SESSIONS) {
      try {
        const { data, error } = await supabaseAdmin
          .from('user_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .single()

        if (error || !data) {
          // Fallback to in-memory store
          const session = sessionStore.get(sessionId)
          if (session) {
            session.lastUsedAt = Date.now()
            sessionStore.set(sessionId, session)
            return session
          }
          return null
        }

        // Update last used time in database
        const now = new Date().toISOString()
        await supabaseAdmin
          .from('user_sessions')
          .update({ last_used_at: now })
          .eq('session_id', sessionId)

        return {
          userId: data.user_id,
          email: data.email,
          refreshToken: data.refresh_token_hash,
          createdAt: new Date(data.created_at).getTime(),
          lastUsedAt: new Date(now).getTime(),
          userAgent: data.user_agent,
          ipAddress: data.ip_address
        }
      } catch (error) {
        console.error('Database session get error:', error)
        // Fallback to in-memory store
        const session = sessionStore.get(sessionId)
        if (session) {
          session.lastUsedAt = Date.now()
          sessionStore.set(sessionId, session)
          return session
        }
        return null
      }
    } else {
      const session = sessionStore.get(sessionId)

      if (!session) {
        return null
      }

      // Update last used time
      session.lastUsedAt = Date.now()
      sessionStore.set(sessionId, session)

      return session
    }
  } catch (error) {
    console.error('❌ Critical error in getSession:', error)
    return null
  }
}

/**
 * Validate refresh token for a session
 */
export async function validateRefreshToken(
  sessionId: string,
  refreshToken: string
): Promise<boolean> {
  try {
    const session = await getSession(sessionId)

    if (!session) {
      return false
    }

    // Compare hashed tokens properly
    return await compareTokens(refreshToken, session.refreshToken)
  } catch (error) {
    console.error('❌ Error validating refresh token:', error)
    return false
  }
}

/**
 * Update refresh token for a session (rotation)
 */
export async function rotateRefreshToken(
  sessionId: string,
  newRefreshToken: string
): Promise<void> {
  if (USE_DATABASE_SESSIONS) {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({
          refresh_token_hash: await hashToken(newRefreshToken),
          last_used_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('Failed to rotate refresh token in database:', error)
        // Fallback to in-memory store
        const session = sessionStore.get(sessionId)
        if (session) {
          session.refreshToken = await hashToken(newRefreshToken)
          session.lastUsedAt = Date.now()
          sessionStore.set(sessionId, session)
        }
        return
      }
    } catch (error) {
      console.error('Database session rotate error:', error)
      // Fallback to in-memory store
      const session = sessionStore.get(sessionId)
      if (session) {
        session.refreshToken = await hashToken(newRefreshToken)
        session.lastUsedAt = Date.now()
        sessionStore.set(sessionId, session)
      }
      return
    }
  } else {
    const session = sessionStore.get(sessionId)

    if (!session) {
      throw new Error('Session not found')
    }

    // Update with new refresh token
    session.refreshToken = await hashToken(newRefreshToken)
    session.lastUsedAt = Date.now()
    sessionStore.set(sessionId, session)
  }
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(sessionId: string): Promise<void> {
  if (USE_DATABASE_SESSIONS) {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('session_id', sessionId)

      if (error) {
        console.error('Failed to revoke session in database:', error)
      }
    } catch (error) {
      console.error('Database session revoke error:', error)
    }
  }

  sessionStore.delete(sessionId)
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  // Find and delete all sessions for the user
  for (const [sessionId, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      sessionStore.delete(sessionId)
    }
  }

  // In production, delete from database:
  // await db.sessions.deleteMany({
  //   where: { userId }
  // })
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now()
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

  for (const [sessionId, session] of sessionStore.entries()) {
    if (now - session.lastUsedAt > maxAge) {
      sessionStore.delete(sessionId)
    }
  }

  // In production, delete from database:
  // await db.sessions.deleteMany({
  //   where: {
  //     lastUsedAt: {
  //       lt: new Date(now - maxAge)
  //     }
  //   }
  // })
}

/**
 * Update TOTP verification status for a session
 */
export async function updateSessionTOTPStatus(
  sessionId: string,
  totpVerified: boolean,
  context: 'login' | 'signing' | 'both' = 'login'
): Promise<void> {
  const now = Date.now()

  if (USE_DATABASE_SESSIONS) {
    try {
      const { error } = await supabaseAdmin
        .from('user_sessions')
        .update({
          totp_verified: totpVerified,
          totp_verified_at: totpVerified ? new Date(now).toISOString() : null,
          totp_context: context,
          last_used_at: new Date(now).toISOString()
        })
        .eq('session_id', sessionId)

      if (error) {
        console.error('Failed to update TOTP status in database:', error)
        // Fallback to in-memory store
        const session = sessionStore.get(sessionId)
        if (session) {
          session.totpVerified = totpVerified
          session.totpVerifiedAt = totpVerified ? now : undefined
          session.totpContext = context
          session.lastUsedAt = now
          sessionStore.set(sessionId, session)
        }
      }
    } catch (error) {
      console.error('Database TOTP status update error:', error)
      // Fallback to in-memory store
      const session = sessionStore.get(sessionId)
      if (session) {
        session.totpVerified = totpVerified
        session.totpVerifiedAt = totpVerified ? now : undefined
        session.totpContext = context
        session.lastUsedAt = now
        sessionStore.set(sessionId, session)
      }
    }
  } else {
    const session = sessionStore.get(sessionId)
    if (session) {
      session.totpVerified = totpVerified
      session.totpVerifiedAt = totpVerified ? now : undefined
      session.totpContext = context
      session.lastUsedAt = now
      sessionStore.set(sessionId, session)
    }
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const userSessions: SessionData[] = []

  for (const [, session] of sessionStore.entries()) {
    if (session.userId === userId) {
      userSessions.push(session)
    }
  }

  return userSessions

  // In production, query from database:
  // return await db.sessions.findMany({
  //   where: { userId },
  //   orderBy: { lastUsedAt: 'desc' }
  // })
}

/**
 * Hash token for secure storage (production use)
 */
async function hashToken(token: string): Promise<string> {
  // Use bcrypt or similar in production
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compare token with hash (production use)
 */
async function compareTokens(token: string, hash: string): Promise<boolean> {
  const tokenHash = await hashToken(token)
  return tokenHash === hash
}

// Start cleanup interval (run every hour)
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000)
}

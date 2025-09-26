// Redis-based session storage for high performance
// Fallback to Supabase for critical session data

import { supabaseAdmin } from './supabase-admin'
import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from './upstash-config'
import crypto from 'crypto'

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

/**
 * Hash token for secure storage
 */
async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Store a new session with refresh token using Redis
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
}

/**
 * Get session data by session ID using Redis
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  try {
    // Try Redis first for fast access
    const sessionKey = RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
    const cachedSession = await RedisUtils.get<SessionData>(sessionKey)
    
    if (cachedSession) {
      // Update last used time
      cachedSession.lastUsedAt = Date.now()
      await RedisUtils.setWithTTL(sessionKey, cachedSession, CACHE_TTL.SESSION)
      return cachedSession
    }

    // Fallback to database if not in Redis
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error || !data) {
      // Final fallback to in-memory store
      const session = sessionStore.get(sessionId)
      if (session) {
        session.lastUsedAt = Date.now()
        sessionStore.set(sessionId, session)
        return session
      }
      return null
    }

    // Reconstruct session from database and cache in Redis
    const sessionData: SessionData = {
      userId: data.user_id,
      email: data.email,
      refreshToken: data.refresh_token_hash,
      createdAt: new Date(data.created_at).getTime(),
      lastUsedAt: Date.now(),
      userAgent: data.user_agent,
      ipAddress: data.ip_address,
      totpVerified: data.totp_verified,
      totpVerifiedAt: data.totp_verified_at ? new Date(data.totp_verified_at).getTime() : undefined,
      totpContext: data.totp_context
    }

    // Cache in Redis for future requests
    await RedisUtils.setWithTTL(sessionKey, sessionData, CACHE_TTL.SESSION)
    
    // Update last used time in database
    await supabaseAdmin
      .from('user_sessions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('session_id', sessionId)

    return sessionData
  } catch (error) {
    console.error('❌ Redis session get error:', error)
    // Fallback to in-memory store
    const session = sessionStore.get(sessionId)
    if (session) {
      session.lastUsedAt = Date.now()
      sessionStore.set(sessionId, session)
      return session
    }
    return null
  }
}

/**
 * Update refresh token for session rotation
 */
export async function updateSessionRefreshToken(
  sessionId: string,
  newRefreshToken: string
): Promise<void> {
  try {
    const sessionKey = RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
    const session = await RedisUtils.get<SessionData>(sessionKey)
    
    if (session) {
      session.refreshToken = await hashToken(newRefreshToken)
      session.lastUsedAt = Date.now()
      await RedisUtils.setWithTTL(sessionKey, session, CACHE_TTL.SESSION)
    }

    // Update in database
    await supabaseAdmin
      .from('user_sessions')
      .update({
        refresh_token_hash: await hashToken(newRefreshToken),
        last_used_at: new Date().toISOString()
      })
      .eq('session_id', sessionId)
  } catch (error) {
    console.error('❌ Error updating session refresh token:', error)
  }
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    // Remove from Redis
    const sessionKey = RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
    await RedisUtils.del(sessionKey)
    
    // Get session to find user ID for cleanup
    const session = await getSession(sessionId)
    if (session) {
      const userSessionsKey = RedisUtils.buildKey(CACHE_KEYS.USER_SESSIONS, session.userId)
      await redis.srem(userSessionsKey, sessionId)
    }

    // Remove from database
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('session_id', sessionId)
    
    // Remove from in-memory store
    sessionStore.delete(sessionId)
  } catch (error) {
    console.error('❌ Error revoking session:', error)
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string): Promise<string[]> {
  try {
    const userSessionsKey = RedisUtils.buildKey(CACHE_KEYS.USER_SESSIONS, userId)
    return await RedisUtils.smembers(userSessionsKey)
  } catch (error) {
    console.error('❌ Error getting user sessions:', error)
    return []
  }
}

/**
 * Revoke all sessions for a user (security action)
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    const sessions = await getUserSessions(userId)
    
    // Remove all sessions from Redis
    if (sessions.length > 0) {
      const sessionKeys = sessions.map(sessionId => 
        RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
      )
      await redis.del(...sessionKeys)
    }
    
    // Remove user sessions set
    const userSessionsKey = RedisUtils.buildKey(CACHE_KEYS.USER_SESSIONS, userId)
    await RedisUtils.del(userSessionsKey)
    
    // Remove from database
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
    
    // Remove from in-memory store
    sessions.forEach(sessionId => sessionStore.delete(sessionId))
  } catch (error) {
    console.error('❌ Error revoking all user sessions:', error)
  }
}

/**
 * Update TOTP verification status for session
 */
export async function updateSessionTOTPStatus(
  sessionId: string,
  totpVerified: boolean,
  totpContext: 'login' | 'signing' | 'both' = 'login'
): Promise<void> {
  try {
    const now = Date.now()
    const sessionKey = RedisUtils.buildKey(CACHE_KEYS.SESSION, sessionId)
    const session = await RedisUtils.get<SessionData>(sessionKey)
    
    if (session) {
      session.totpVerified = totpVerified
      session.totpVerifiedAt = totpVerified ? now : undefined
      session.totpContext = totpContext
      session.lastUsedAt = now
      await RedisUtils.setWithTTL(sessionKey, session, CACHE_TTL.SESSION)
    }

    // Update in database
    await supabaseAdmin
      .from('user_sessions')
      .update({
        totp_verified: totpVerified,
        totp_verified_at: totpVerified ? new Date(now).toISOString() : null,
        totp_context: totpContext,
        last_used_at: new Date(now).toISOString()
      })
      .eq('session_id', sessionId)
  } catch (error) {
    console.error('❌ Error updating session TOTP status:', error)
  }
}

/**
 * Clean up expired sessions (called by background job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const expiredTime = new Date(Date.now() - CACHE_TTL.SESSION * 1000).toISOString()
    
    // Get expired sessions from database
    const { data: expiredSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('session_id, user_id')
      .lt('last_used_at', expiredTime)
    
    if (!expiredSessions || expiredSessions.length === 0) {
      return 0
    }
    
    // Remove from Redis
    const sessionKeys = expiredSessions.map(session => 
      RedisUtils.buildKey(CACHE_KEYS.SESSION, session.session_id)
    )
    await redis.del(...sessionKeys)
    
    // Remove from user sessions sets
    for (const session of expiredSessions) {
      const userSessionsKey = RedisUtils.buildKey(CACHE_KEYS.USER_SESSIONS, session.user_id)
      await redis.srem(userSessionsKey, session.session_id)
    }
    
    // Remove from database
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .lt('last_used_at', expiredTime)
    
    console.log(`🧹 Cleaned up ${expiredSessions.length} expired sessions`)
    return expiredSessions.length
  } catch (error) {
    console.error('❌ Error cleaning up expired sessions:', error)
    return 0
  }
}

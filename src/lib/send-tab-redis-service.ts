/**
 * Send Tab Redis Service
 * Handles real-time analytics caching, active viewer tracking, and session management
 */

import { redis } from './upstash-config'

export class SendTabRedisService {
  // Key prefixes
  private static readonly PREFIX = 'send'
  
  // TTL values (in seconds)
  private static readonly TTL = {
    VIEWER_SESSION: 300, // 5 minutes
    ACCESS_TOKEN: 3600, // 1 hour
    DOCUMENT_CACHE: 300, // 5 minutes
    ANALYTICS_CACHE: 3600, // 1 hour
    SESSION_DATA: 1800, // 30 minutes
  }

  // =====================================================
  // VIEW TRACKING
  // =====================================================

  /**
   * Increment view count for a link (daily)
   */
  static async incrementDailyViews(linkId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const key = `${this.PREFIX}:views:${linkId}:${today}`
    return await redis.incr(key)
  }

  /**
   * Increment view count for a link (hourly)
   */
  static async incrementHourlyViews(linkId: string): Promise<number> {
    const now = new Date()
    const hour = `${now.toISOString().split('T')[0]}-${now.getHours()}`
    const key = `${this.PREFIX}:views:${linkId}:${hour}`
    return await redis.incr(key)
  }

  /**
   * Get daily view count for a link
   */
  static async getDailyViews(linkId: string, date?: string): Promise<number> {
    const targetDate = date || new Date().toISOString().split('T')[0]
    const key = `${this.PREFIX}:views:${linkId}:${targetDate}`
    const count = await redis.get(key)
    return count ? parseInt(count as string) : 0
  }

  /**
   * Get view counts for multiple days
   */
  static async getViewsForDateRange(
    linkId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ date: string; views: number }[]> {
    const results: { date: string; views: number }[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const views = await this.getDailyViews(linkId, dateStr)
      results.push({ date: dateStr, views })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return results
  }

  // =====================================================
  // ACTIVE VIEWER TRACKING
  // =====================================================

  /**
   * Add active viewer to a link
   */
  static async addActiveViewer(linkId: string, sessionId: string): Promise<void> {
    const key = `${this.PREFIX}:active_viewers:${linkId}`
    await redis.sadd(key, sessionId)
    await redis.expire(key, this.TTL.VIEWER_SESSION)
  }

  /**
   * Remove active viewer from a link
   */
  static async removeActiveViewer(linkId: string, sessionId: string): Promise<void> {
    const key = `${this.PREFIX}:active_viewers:${linkId}`
    await redis.srem(key, sessionId)
  }

  /**
   * Get count of active viewers for a link
   */
  static async getActiveViewerCount(linkId: string): Promise<number> {
    const key = `${this.PREFIX}:active_viewers:${linkId}`
    return await redis.scard(key)
  }

  /**
   * Get all active viewer session IDs for a link
   */
  static async getActiveViewers(linkId: string): Promise<string[]> {
    const key = `${this.PREFIX}:active_viewers:${linkId}`
    const members = await redis.smembers(key)
    return members as string[]
  }

  /**
   * Update viewer heartbeat (keep session alive)
   */
  static async updateViewerHeartbeat(linkId: string, sessionId: string): Promise<void> {
    await this.addActiveViewer(linkId, sessionId)
  }

  // =====================================================
  // VIEWER SESSION DATA
  // =====================================================

  /**
   * Store viewer session data
   */
  static async setViewerSession(
    sessionId: string,
    data: {
      linkId: string
      viewerEmail?: string
      viewerName?: string
      ipAddress?: string
      userAgent?: string
      startTime: number
    }
  ): Promise<void> {
    const key = `${this.PREFIX}:viewer:${sessionId}`
    await redis.setex(key, this.TTL.VIEWER_SESSION, JSON.stringify(data))
  }

  /**
   * Get viewer session data
   */
  static async getViewerSession(sessionId: string): Promise<any | null> {
    const key = `${this.PREFIX}:viewer:${sessionId}`
    const data = await redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Update viewer session data
   */
  static async updateViewerSession(
    sessionId: string,
    updates: Partial<any>
  ): Promise<void> {
    const existing = await this.getViewerSession(sessionId)
    if (existing) {
      const updated = { ...existing, ...updates }
      await this.setViewerSession(sessionId, updated)
    }
  }

  // =====================================================
  // ACCESS TOKENS
  // =====================================================

  /**
   * Create temporary access token for a link
   */
  static async createAccessToken(linkId: string, token: string): Promise<void> {
    const key = `${this.PREFIX}:access:${token}`
    await redis.setex(key, this.TTL.ACCESS_TOKEN, linkId)
  }

  /**
   * Verify and get link ID from access token
   */
  static async verifyAccessToken(token: string): Promise<string | null> {
    const key = `${this.PREFIX}:access:${token}`
    const linkId = await redis.get(key)
    return linkId as string | null
  }

  /**
   * Revoke access token
   */
  static async revokeAccessToken(token: string): Promise<void> {
    const key = `${this.PREFIX}:access:${token}`
    await redis.del(key)
  }

  // =====================================================
  // DOCUMENT CACHING
  // =====================================================

  /**
   * Cache document metadata
   */
  static async cacheDocument(documentId: string, data: any): Promise<void> {
    const key = `${this.PREFIX}:doc:${documentId}`
    await redis.setex(key, this.TTL.DOCUMENT_CACHE, JSON.stringify(data))
  }

  /**
   * Get cached document metadata
   */
  static async getCachedDocument(documentId: string): Promise<any | null> {
    const key = `${this.PREFIX}:doc:${documentId}`
    const data = await redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Invalidate document cache
   */
  static async invalidateDocumentCache(documentId: string): Promise<void> {
    const key = `${this.PREFIX}:doc:${documentId}`
    await redis.del(key)
  }

  // =====================================================
  // ANALYTICS AGGREGATION
  // =====================================================

  /**
   * Increment analytics counter
   */
  static async incrementAnalytics(
    linkId: string,
    field: 'total_views' | 'unique_visitors' | 'total_downloads'
  ): Promise<void> {
    const key = `${this.PREFIX}:analytics:${linkId}`
    await redis.hincrby(key, field, 1)
    await redis.expire(key, this.TTL.ANALYTICS_CACHE)
  }

  /**
   * Get analytics data for a link
   */
  static async getAnalytics(linkId: string): Promise<{
    total_views: number
    unique_visitors: number
    total_downloads: number
  }> {
    const key = `${this.PREFIX}:analytics:${linkId}`
    const data = await redis.hgetall(key)
    
    return {
      total_views: parseInt((data?.total_views as string) || '0'),
      unique_visitors: parseInt((data?.unique_visitors as string) || '0'),
      total_downloads: parseInt((data?.total_downloads as string) || '0'),
    }
  }

  /**
   * Reset analytics cache for a link
   */
  static async resetAnalytics(linkId: string): Promise<void> {
    const key = `${this.PREFIX}:analytics:${linkId}`
    await redis.del(key)
  }

  // =====================================================
  // SESSION MANAGEMENT
  // =====================================================

  /**
   * Store session data
   */
  static async setSession(sessionId: string, data: any): Promise<void> {
    const key = `${this.PREFIX}:session:${sessionId}`
    await redis.setex(key, this.TTL.SESSION_DATA, JSON.stringify(data))
  }

  /**
   * Get session data
   */
  static async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.PREFIX}:session:${sessionId}`
    const data = await redis.get(key)
    return data ? JSON.parse(data as string) : null
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.PREFIX}:session:${sessionId}`
    await redis.del(key)
  }

  // =====================================================
  // RATE LIMITING
  // =====================================================

  /**
   * Check and increment rate limit for IP address
   */
  static async checkRateLimit(
    ipAddress: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `${this.PREFIX}:ratelimit:${ipAddress}`
    const current = await redis.incr(key)
    
    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }
    
    const allowed = current <= maxRequests
    const remaining = Math.max(0, maxRequests - current)
    
    return { allowed, remaining }
  }

  // =====================================================
  // REALTIME PUBLISHING
  // =====================================================

  /**
   * Publish viewer update to channel
   */
  static async publishViewerUpdate(
    linkId: string,
    data: {
      type: 'join' | 'leave' | 'update'
      sessionId: string
      viewerEmail?: string
      timestamp: number
    }
  ): Promise<void> {
    const channel = `${this.PREFIX}:link:${linkId}:viewers`
    await redis.publish(channel, JSON.stringify(data))
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  /**
   * Cleanup expired viewer sessions
   */
  static async cleanupExpiredViewers(linkId: string): Promise<void> {
    const activeViewers = await this.getActiveViewers(linkId)
    
    for (const sessionId of activeViewers) {
      const session = await this.getViewerSession(sessionId)
      if (!session) {
        await this.removeActiveViewer(linkId, sessionId)
      }
    }
  }

  /**
   * Get all keys matching a pattern (for debugging)
   */
  static async getKeys(pattern: string): Promise<string[]> {
    const keys = await redis.keys(`${this.PREFIX}:${pattern}`)
    return keys as string[]
  }
}


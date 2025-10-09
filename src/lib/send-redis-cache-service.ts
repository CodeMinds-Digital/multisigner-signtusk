// Redis Caching Service for Send Module
// Optimizes performance by caching frequently accessed data

import { redis, RedisUtils, CACHE_TTL } from './upstash-config'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface CachedDocument {
  id: string
  title: string
  file_path: string
  file_size: number
  file_type: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface CachedLink {
  id: string
  document_id: string
  name: string
  slug: string
  password_protected: boolean
  email_required: boolean
  expires_at: string | null
  is_active: boolean
  view_count: number
  unique_visitors: number
}

export interface CachedAnalytics {
  document_id: string
  total_views: number
  unique_visitors: number
  average_duration: number
  completion_rate: number
  last_viewed: string
  top_countries: Array<{ country: string; count: number }>
  hourly_views: Array<{ hour: number; views: number }>
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  totalRequests: number
}

export class SendRedisCacheService {
  private static readonly CACHE_PREFIX = 'send_cache'
  private static readonly STATS_PREFIX = 'send_cache_stats'

  // =====================================================
  // DOCUMENT CACHING
  // =====================================================

  /**
   * Get cached document or fetch from database
   */
  static async getDocument(documentId: string): Promise<CachedDocument | null> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'document', documentId)

    try {
      // Try cache first
      const cached = await RedisUtils.get(cacheKey)
      if (cached) {
        await this.recordCacheHit('document')
        return cached as CachedDocument
      }

      // Cache miss - fetch from database
      await this.recordCacheMiss('document')

      const { data: document } = await supabaseAdmin
        .from('send_shared_documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (document) {
        // Cache for 1 hour
        await RedisUtils.setWithTTL(cacheKey, document, CACHE_TTL.DOCUMENT_METADATA)
        return document as CachedDocument
      }

      return null
    } catch (error) {
      console.error('Error getting cached document:', error)
      return null
    }
  }

  /**
   * Cache document data
   */
  static async cacheDocument(document: CachedDocument): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'document', document.id)
    await RedisUtils.setWithTTL(cacheKey, document, CACHE_TTL.DOCUMENT_METADATA)
  }

  /**
   * Invalidate document cache
   */
  static async invalidateDocument(documentId: string): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'document', documentId)
    await redis.del(cacheKey)
  }

  // =====================================================
  // LINK CACHING
  // =====================================================

  /**
   * Get cached link or fetch from database
   */
  static async getLink(linkId: string): Promise<CachedLink | null> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'link', linkId)

    try {
      // Try cache first
      const cached = await RedisUtils.get(cacheKey)
      if (cached) {
        await this.recordCacheHit('link')
        return cached as CachedLink
      }

      // Cache miss - fetch from database
      await this.recordCacheMiss('link')

      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('*')
        .eq('id', linkId)
        .single()

      if (link) {
        // Cache for 30 minutes
        await RedisUtils.setWithTTL(cacheKey, link, CACHE_TTL.DOCUMENT_METADATA)
        return link as CachedLink
      }

      return null
    } catch (error) {
      console.error('Error getting cached link:', error)
      return null
    }
  }

  /**
   * Cache link data
   */
  static async cacheLink(link: CachedLink): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'link', link.id)
    await RedisUtils.setWithTTL(cacheKey, link, CACHE_TTL.DOCUMENT_METADATA)
  }

  /**
   * Invalidate link cache
   */
  static async invalidateLink(linkId: string): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'link', linkId)
    await redis.del(cacheKey)
  }

  // =====================================================
  // ANALYTICS CACHING
  // =====================================================

  /**
   * Get cached analytics or compute from database
   */
  static async getAnalytics(documentId: string): Promise<CachedAnalytics | null> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'analytics', documentId)

    try {
      // Try cache first
      const cached = await RedisUtils.get(cacheKey)
      if (cached) {
        await this.recordCacheHit('analytics')
        return cached as CachedAnalytics
      }

      // Cache miss - compute from database
      await this.recordCacheMiss('analytics')

      const analytics = await this.computeAnalytics(documentId)
      if (analytics) {
        // Cache for 5 minutes (analytics change frequently)
        await RedisUtils.setWithTTL(cacheKey, analytics, 300)
        return analytics
      }

      return null
    } catch (error) {
      console.error('Error getting cached analytics:', error)
      return null
    }
  }

  /**
   * Compute analytics from database
   */
  private static async computeAnalytics(documentId: string): Promise<CachedAnalytics | null> {
    try {
      // Get basic view stats
      const { data: views } = await supabaseAdmin
        .from('send_document_views')
        .select('*')
        .eq('document_id', documentId)

      if (!views || views.length === 0) {
        return null
      }

      // Get unique visitors
      const uniqueVisitors = new Set(views.map(v => v.viewer_email || v.session_id)).size

      // Calculate average duration
      const totalDuration = views.reduce((sum, v) => sum + (v.duration_seconds || 0), 0)
      const averageDuration = totalDuration / views.length

      // Calculate completion rate (views that reached the end)
      const completedViews = views.filter(v => v.completion_percentage >= 90).length
      const completionRate = (completedViews / views.length) * 100

      // Get last viewed
      const lastViewed = views.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]?.created_at

      // Get top countries (mock data for now)
      const topCountries = [
        { country: 'United States', count: Math.floor(views.length * 0.4) },
        { country: 'Canada', count: Math.floor(views.length * 0.2) },
        { country: 'United Kingdom', count: Math.floor(views.length * 0.15) }
      ]

      // Get hourly views for last 24 hours
      const hourlyViews = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        views: views.filter(v => {
          const viewHour = new Date(v.created_at).getHours()
          return viewHour === hour
        }).length
      }))

      return {
        document_id: documentId,
        total_views: views.length,
        unique_visitors: uniqueVisitors,
        average_duration: averageDuration,
        completion_rate: completionRate,
        last_viewed: lastViewed,
        top_countries: topCountries,
        hourly_views: hourlyViews
      }
    } catch (error) {
      console.error('Error computing analytics:', error)
      return null
    }
  }

  /**
   * Invalidate analytics cache
   */
  static async invalidateAnalytics(documentId: string): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'analytics', documentId)
    await redis.del(cacheKey)
  }

  // =====================================================
  // USER DATA CACHING
  // =====================================================

  /**
   * Cache user's documents list
   */
  static async cacheUserDocuments(userId: string, documents: any[]): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'user_documents', userId)
    await RedisUtils.setWithTTL(cacheKey, documents, CACHE_TTL.USER_PROFILE)
  }

  /**
   * Get cached user documents
   */
  static async getUserDocuments(userId: string): Promise<any[] | null> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'user_documents', userId)

    try {
      const cached = await RedisUtils.get(cacheKey)
      if (cached) {
        await this.recordCacheHit('user_documents')
        return cached as any[]
      }

      await this.recordCacheMiss('user_documents')
      return null
    } catch (error) {
      console.error('Error getting cached user documents:', error)
      return null
    }
  }

  /**
   * Invalidate user documents cache
   */
  static async invalidateUserDocuments(userId: string): Promise<void> {
    const cacheKey = RedisUtils.buildKey(this.CACHE_PREFIX, 'user_documents', userId)
    await redis.del(cacheKey)
  }

  // =====================================================
  // CACHE STATISTICS
  // =====================================================

  /**
   * Record cache hit
   */
  private static async recordCacheHit(type: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey(this.STATS_PREFIX, today)

    await redis.hincrby(statsKey, `${type}_hits`, 1)
    await redis.hincrby(statsKey, `${type}_total`, 1)
    await redis.expire(statsKey, 86400) // 24 hours
  }

  /**
   * Record cache miss
   */
  private static async recordCacheMiss(type: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey(this.STATS_PREFIX, today)

    await redis.hincrby(statsKey, `${type}_misses`, 1)
    await redis.hincrby(statsKey, `${type}_total`, 1)
    await redis.expire(statsKey, 86400) // 24 hours
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<Record<string, CacheStats>> {
    const today = new Date().toISOString().split('T')[0]
    const statsKey = RedisUtils.buildKey(this.STATS_PREFIX, today)

    const stats = await redis.hgetall(statsKey) || {}
    const result: Record<string, CacheStats> = {}

    // Parse stats for each cache type
    const types = ['document', 'link', 'analytics', 'user_documents']

    for (const type of types) {
      const hits = parseInt((stats as any)[`${type}_hits`] || '0')
      const misses = parseInt((stats as any)[`${type}_misses`] || '0')
      const total = hits + misses

      result[type] = {
        hits,
        misses,
        hitRate: total > 0 ? (hits / total) * 100 : 0,
        totalRequests: total
      }
    }

    return result
  }

  /**
   * Clear all cache for a user
   */
  static async clearUserCache(userId: string): Promise<void> {
    const patterns = [
      RedisUtils.buildKey(this.CACHE_PREFIX, 'user_documents', userId),
      RedisUtils.buildKey(this.CACHE_PREFIX, 'document', '*'), // Clear all documents (user might own some)
      RedisUtils.buildKey(this.CACHE_PREFIX, 'link', '*'), // Clear all links (user might own some)
    ]

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        // For wildcard patterns, we'd need to scan and delete
        // For now, just delete the specific user cache
        continue
      }
      await redis.del(pattern)
    }
  }
}

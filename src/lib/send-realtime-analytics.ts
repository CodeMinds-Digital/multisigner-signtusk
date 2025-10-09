/**
 * Send Real-time Analytics Service
 * Uses Upstash Redis for real-time view counts, active viewers, and live metrics
 */

import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface ActiveViewer {
  sessionId: string
  fingerprint: string
  email?: string
  joinedAt: number
  lastActivity: number
  currentPage?: number
}

export interface RealtimeMetrics {
  activeViewers: number
  totalViews: number
  viewsToday: number
  viewsThisWeek: number
  viewsThisMonth: number
  peakConcurrentViewers: number
  avgViewDuration: number
}

export class SendRealtimeAnalytics {
  // Redis key prefixes
  private static readonly ACTIVE_VIEWERS_PREFIX = 'send:active:'
  private static readonly VIEW_COUNT_PREFIX = 'send:views:'
  private static readonly DAILY_VIEWS_PREFIX = 'send:daily:'
  private static readonly WEEKLY_VIEWS_PREFIX = 'send:weekly:'
  private static readonly MONTHLY_VIEWS_PREFIX = 'send:monthly:'
  private static readonly PEAK_VIEWERS_PREFIX = 'send:peak:'
  private static readonly DURATION_PREFIX = 'send:duration:'

  /**
   * Add active viewer
   */
  static async addActiveViewer(
    linkId: string,
    viewer: ActiveViewer
  ): Promise<void> {
    try {
      const key = `${this.ACTIVE_VIEWERS_PREFIX}${linkId}`

      // Store viewer data with 5-minute expiration
      await redis.hset(key, {
        [viewer.sessionId]: JSON.stringify(viewer)
      })

      // Set expiration on the hash key
      await redis.expire(key, 300) // 5 minutes

      // Update peak concurrent viewers
      await this.updatePeakViewers(linkId)
    } catch (error) {
      console.error('Failed to add active viewer:', error)
    }
  }

  /**
   * Remove active viewer
   */
  static async removeActiveViewer(
    linkId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const key = `${this.ACTIVE_VIEWERS_PREFIX}${linkId}`
      await redis.hdel(key, sessionId)
    } catch (error) {
      console.error('Failed to remove active viewer:', error)
    }
  }

  /**
   * Update viewer activity
   */
  static async updateViewerActivity(
    linkId: string,
    sessionId: string,
    currentPage?: number
  ): Promise<void> {
    try {
      const key = `${this.ACTIVE_VIEWERS_PREFIX}${linkId}`

      // Get current viewer data
      const viewerData = await redis.hget(key, sessionId)

      if (viewerData) {
        let viewer
        try {
          // Handle both string and object data
          viewer = typeof viewerData === 'string' ? JSON.parse(viewerData) : viewerData
        } catch (error) {
          console.error('Failed to parse viewer data:', error)
          return
        }

        viewer.lastActivity = Date.now()
        if (currentPage !== undefined) {
          viewer.currentPage = currentPage
        }

        await redis.hset(key, {
          [sessionId]: JSON.stringify(viewer)
        })
      }
    } catch (error) {
      console.error('Failed to update viewer activity:', error)
    }
  }

  /**
   * Get active viewers
   */
  static async getActiveViewers(linkId: string): Promise<ActiveViewer[]> {
    try {
      const key = `${this.ACTIVE_VIEWERS_PREFIX}${linkId}`
      const viewersData = await redis.hgetall(key)

      if (!viewersData) return []

      const now = Date.now()
      const activeViewers: ActiveViewer[] = []

      // Filter out inactive viewers (no activity in last 5 minutes)
      for (const [sessionId, data] of Object.entries(viewersData)) {
        let viewer
        try {
          // Handle both string and object data
          viewer = typeof data === 'string' ? JSON.parse(data) : data
        } catch (error) {
          console.error('Failed to parse viewer data:', error)
          continue
        }

        // Remove if inactive for more than 5 minutes
        if (now - viewer.lastActivity > 300000) {
          await redis.hdel(key, sessionId)
        } else {
          activeViewers.push(viewer)
        }
      }

      return activeViewers
    } catch (error) {
      console.error('Failed to get active viewers:', error)
      return []
    }
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(linkId: string): Promise<number> {
    try {
      const key = `${this.VIEW_COUNT_PREFIX}${linkId}`
      const count = await redis.incr(key)

      // Also increment daily, weekly, monthly counts
      await this.incrementDailyViews(linkId)
      await this.incrementWeeklyViews(linkId)
      await this.incrementMonthlyViews(linkId)

      return count
    } catch (error) {
      console.error('Failed to increment view count:', error)
      return 0
    }
  }

  /**
   * Get view count
   */
  static async getViewCount(linkId: string): Promise<number> {
    try {
      const key = `${this.VIEW_COUNT_PREFIX}${linkId}`
      const count = await redis.get(key)
      return count ? parseInt(count as string) : 0
    } catch (error) {
      console.error('Failed to get view count:', error)
      return 0
    }
  }

  /**
   * Increment daily views
   */
  private static async incrementDailyViews(linkId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const key = `${this.DAILY_VIEWS_PREFIX}${linkId}:${today}`
      await redis.incr(key)
      await redis.expire(key, 86400 * 7) // Keep for 7 days
    } catch (error) {
      console.error('Failed to increment daily views:', error)
    }
  }

  /**
   * Increment weekly views
   */
  private static async incrementWeeklyViews(linkId: string): Promise<void> {
    try {
      const week = this.getWeekNumber(new Date())
      const key = `${this.WEEKLY_VIEWS_PREFIX}${linkId}:${week}`
      await redis.incr(key)
      await redis.expire(key, 86400 * 30) // Keep for 30 days
    } catch (error) {
      console.error('Failed to increment weekly views:', error)
    }
  }

  /**
   * Increment monthly views
   */
  private static async incrementMonthlyViews(linkId: string): Promise<void> {
    try {
      const month = new Date().toISOString().substring(0, 7) // YYYY-MM
      const key = `${this.MONTHLY_VIEWS_PREFIX}${linkId}:${month}`
      await redis.incr(key)
      await redis.expire(key, 86400 * 365) // Keep for 1 year
    } catch (error) {
      console.error('Failed to increment monthly views:', error)
    }
  }

  /**
   * Get views today
   */
  static async getViewsToday(linkId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const key = `${this.DAILY_VIEWS_PREFIX}${linkId}:${today}`
      const count = await redis.get(key)
      return count ? parseInt(count as string) : 0
    } catch (error) {
      console.error('Failed to get views today:', error)
      return 0
    }
  }

  /**
   * Get views this week
   */
  static async getViewsThisWeek(linkId: string): Promise<number> {
    try {
      const week = this.getWeekNumber(new Date())
      const key = `${this.WEEKLY_VIEWS_PREFIX}${linkId}:${week}`
      const count = await redis.get(key)
      return count ? parseInt(count as string) : 0
    } catch (error) {
      console.error('Failed to get views this week:', error)
      return 0
    }
  }

  /**
   * Get views this month
   */
  static async getViewsThisMonth(linkId: string): Promise<number> {
    try {
      const month = new Date().toISOString().substring(0, 7)
      const key = `${this.MONTHLY_VIEWS_PREFIX}${linkId}:${month}`
      const count = await redis.get(key)
      return count ? parseInt(count as string) : 0
    } catch (error) {
      console.error('Failed to get views this month:', error)
      return 0
    }
  }

  /**
   * Update peak concurrent viewers
   */
  private static async updatePeakViewers(linkId: string): Promise<void> {
    try {
      const activeViewers = await this.getActiveViewers(linkId)
      const currentCount = activeViewers.length

      const key = `${this.PEAK_VIEWERS_PREFIX}${linkId}`
      const peak = await redis.get(key)
      const peakCount = peak ? parseInt(peak as string) : 0

      if (currentCount > peakCount) {
        await redis.set(key, currentCount)
      }
    } catch (error) {
      console.error('Failed to update peak viewers:', error)
    }
  }

  /**
   * Get peak concurrent viewers
   */
  static async getPeakViewers(linkId: string): Promise<number> {
    try {
      const key = `${this.PEAK_VIEWERS_PREFIX}${linkId}`
      const peak = await redis.get(key)
      return peak ? parseInt(peak as string) : 0
    } catch (error) {
      console.error('Failed to get peak viewers:', error)
      return 0
    }
  }

  /**
   * Track view duration
   */
  static async trackViewDuration(linkId: string, duration: number): Promise<void> {
    try {
      const key = `${this.DURATION_PREFIX}${linkId}`

      // Store duration in a list (keep last 100 durations)
      await redis.lpush(key, duration)
      await redis.ltrim(key, 0, 99)
    } catch (error) {
      console.error('Failed to track view duration:', error)
    }
  }

  /**
   * Get average view duration
   */
  static async getAvgViewDuration(linkId: string): Promise<number> {
    try {
      const key = `${this.DURATION_PREFIX}${linkId}`
      const durations = await redis.lrange(key, 0, -1)

      if (!durations || durations.length === 0) return 0

      const total = durations.reduce((sum, d) => sum + parseInt(d as string), 0)
      return Math.round(total / durations.length)
    } catch (error) {
      console.error('Failed to get avg view duration:', error)
      return 0
    }
  }

  /**
   * Get real-time metrics
   */
  static async getRealtimeMetrics(linkId: string): Promise<RealtimeMetrics> {
    try {
      const [
        activeViewers,
        totalViews,
        viewsToday,
        viewsThisWeek,
        viewsThisMonth,
        peakConcurrentViewers,
        avgViewDuration
      ] = await Promise.all([
        this.getActiveViewers(linkId),
        this.getViewCount(linkId),
        this.getViewsToday(linkId),
        this.getViewsThisWeek(linkId),
        this.getViewsThisMonth(linkId),
        this.getPeakViewers(linkId),
        this.getAvgViewDuration(linkId)
      ])

      return {
        activeViewers: activeViewers.length,
        totalViews,
        viewsToday,
        viewsThisWeek,
        viewsThisMonth,
        peakConcurrentViewers,
        avgViewDuration
      }
    } catch (error) {
      console.error('Failed to get realtime metrics:', error)
      return {
        activeViewers: 0,
        totalViews: 0,
        viewsToday: 0,
        viewsThisWeek: 0,
        viewsThisMonth: 0,
        peakConcurrentViewers: 0,
        avgViewDuration: 0
      }
    }
  }

  /**
   * Get week number
   */
  private static getWeekNumber(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`
  }
}


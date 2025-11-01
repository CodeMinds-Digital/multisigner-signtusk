// Real-time Pub/Sub Service for Send Module
// Implements Redis pub/sub for live updates and notifications

import { redis, RedisUtils } from './upstash-config'

export interface RealtimeEvent {
  type: 'document_viewed' | 'document_downloaded' | 'link_created' | 'analytics_updated' | 'visitor_joined' | 'visitor_left'
  documentId?: string
  linkId?: string
  userId?: string
  data: any
  timestamp: number
}

export interface VisitorActivity {
  sessionId: string
  linkId: string
  documentId: string
  visitorEmail?: string
  currentPage: number
  joinedAt: number
  lastActivity: number
  location?: string
  userAgent?: string
}

export interface LiveAnalytics {
  documentId: string
  activeViewers: number
  totalViews: number
  recentViews: Array<{
    timestamp: number
    visitorEmail?: string
    location?: string
  }>
  pageViews: Record<number, number>
}

export class SendRealtimePubSubService {
  private static readonly CHANNEL_PREFIX = 'send_realtime'
  private static readonly ACTIVE_VIEWERS_PREFIX = 'send_active_viewers'
  private static readonly LIVE_ANALYTICS_PREFIX = 'send_live_analytics'

  // =====================================================
  // DOCUMENT EVENTS
  // =====================================================

  /**
   * Publish document viewed event
   */
  static async publishDocumentViewed(
    documentId: string,
    linkId: string,
    visitorData: {
      email?: string
      location?: string
      userAgent?: string
      sessionId: string
    }
  ): Promise<void> {
    const event: RealtimeEvent = {
      type: 'document_viewed',
      documentId,
      linkId,
      data: visitorData,
      timestamp: Date.now()
    }

    await this.publishEvent(`document:${documentId}`, event)
    await this.publishEvent(`link:${linkId}`, event)

    // Update live analytics
    await this.updateLiveAnalytics(documentId, 'view', visitorData)
  }

  /**
   * Publish document downloaded event
   */
  static async publishDocumentDownloaded(
    documentId: string,
    linkId: string,
    visitorData: {
      email?: string
      location?: string
      sessionId: string
    }
  ): Promise<void> {
    const event: RealtimeEvent = {
      type: 'document_downloaded',
      documentId,
      linkId,
      data: visitorData,
      timestamp: Date.now()
    }

    await this.publishEvent(`document:${documentId}`, event)
    await this.publishEvent(`link:${linkId}`, event)
  }

  /**
   * Publish visitor joined event
   */
  static async publishVisitorJoined(
    linkId: string,
    documentId: string,
    visitorActivity: VisitorActivity
  ): Promise<void> {
    const event: RealtimeEvent = {
      type: 'visitor_joined',
      documentId,
      linkId,
      data: visitorActivity,
      timestamp: Date.now()
    }

    await this.publishEvent(`link:${linkId}`, event)
    await this.addActiveViewer(linkId, visitorActivity)
  }

  /**
   * Publish visitor left event
   */
  static async publishVisitorLeft(
    linkId: string,
    documentId: string,
    sessionId: string
  ): Promise<void> {
    const event: RealtimeEvent = {
      type: 'visitor_left',
      documentId,
      linkId,
      data: { sessionId },
      timestamp: Date.now()
    }

    await this.publishEvent(`link:${linkId}`, event)
    await this.removeActiveViewer(linkId, sessionId)
  }

  /**
   * Publish analytics updated event
   */
  static async publishAnalyticsUpdated(
    documentId: string,
    analyticsData: any
  ): Promise<void> {
    const event: RealtimeEvent = {
      type: 'analytics_updated',
      documentId,
      data: analyticsData,
      timestamp: Date.now()
    }

    await this.publishEvent(`document:${documentId}`, event)
    await this.publishEvent(`analytics:${documentId}`, event)
  }

  // =====================================================
  // ACTIVE VIEWERS MANAGEMENT
  // =====================================================

  /**
   * Add active viewer
   */
  static async addActiveViewer(linkId: string, visitor: VisitorActivity): Promise<void> {
    const viewersKey = RedisUtils.buildKey(this.ACTIVE_VIEWERS_PREFIX, linkId)

    // Store visitor data with session ID as field
    await redis.hset(viewersKey, { [visitor.sessionId]: JSON.stringify(visitor) })

    // Set expiration for cleanup
    await redis.expire(viewersKey, 3600) // 1 hour

    // Update active viewer count
    const count = await redis.hlen(viewersKey)
    await this.updateActiveViewerCount(linkId, count)
  }

  /**
   * Remove active viewer
   */
  static async removeActiveViewer(linkId: string, sessionId: string): Promise<void> {
    const viewersKey = RedisUtils.buildKey(this.ACTIVE_VIEWERS_PREFIX, linkId)

    await redis.hdel(viewersKey, sessionId)

    // Update active viewer count
    const count = await redis.hlen(viewersKey)
    await this.updateActiveViewerCount(linkId, count)
  }

  /**
   * Get active viewers for a link
   */
  static async getActiveViewers(linkId: string): Promise<VisitorActivity[]> {
    const viewersKey = RedisUtils.buildKey(this.ACTIVE_VIEWERS_PREFIX, linkId)

    const viewers = await redis.hgetall(viewersKey) || {}

    return Object.values(viewers).map(data => {
      try {
        return typeof data === 'string' ? JSON.parse(data) : data
      } catch (error) {
        console.error('Failed to parse viewer data:', error)
        return null
      }
    }).filter(Boolean)
  }

  /**
   * Update active viewer count
   */
  private static async updateActiveViewerCount(linkId: string, count: number): Promise<void> {
    const countKey = RedisUtils.buildKey(this.ACTIVE_VIEWERS_PREFIX, 'count', linkId)
    await redis.set(countKey, count)
    await redis.expire(countKey, 3600) // 1 hour
  }

  /**
   * Get active viewer count
   */
  static async getActiveViewerCount(linkId: string): Promise<number> {
    const countKey = RedisUtils.buildKey(this.ACTIVE_VIEWERS_PREFIX, 'count', linkId)
    const count = await redis.get(countKey)
    return parseInt(count as string || '0')
  }

  // =====================================================
  // LIVE ANALYTICS
  // =====================================================

  /**
   * Update live analytics
   */
  private static async updateLiveAnalytics(
    documentId: string,
    eventType: 'view' | 'download',
    visitorData: any
  ): Promise<void> {
    const analyticsKey = RedisUtils.buildKey(this.LIVE_ANALYTICS_PREFIX, documentId)

    // Get current analytics
    const current = await redis.get(analyticsKey)
    let analytics: LiveAnalytics = current ? JSON.parse(current as string) : {
      documentId,
      activeViewers: 0,
      totalViews: 0,
      recentViews: [],
      pageViews: {}
    }

    // Update based on event type
    if (eventType === 'view') {
      analytics.totalViews++
      analytics.recentViews.unshift({
        timestamp: Date.now(),
        visitorEmail: visitorData.email,
        location: visitorData.location
      })

      // Keep only last 50 recent views
      analytics.recentViews = analytics.recentViews.slice(0, 50)
    }

    // Update page views if page number is provided
    if (visitorData.currentPage) {
      analytics.pageViews[visitorData.currentPage] = (analytics.pageViews[visitorData.currentPage] || 0) + 1
    }

    // Store updated analytics
    await redis.set(analyticsKey, JSON.stringify(analytics))
    await redis.expire(analyticsKey, 86400) // 24 hours

    // Publish analytics update
    await this.publishAnalyticsUpdated(documentId, analytics)
  }

  /**
   * Get live analytics
   */
  static async getLiveAnalytics(documentId: string): Promise<LiveAnalytics | null> {
    const analyticsKey = RedisUtils.buildKey(this.LIVE_ANALYTICS_PREFIX, documentId)

    const data = await redis.get(analyticsKey)
    if (!data) return null

    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      // Ensure the parsed data has the required LiveAnalytics structure
      if (parsed && typeof parsed === 'object' && 'documentId' in parsed) {
        return parsed as LiveAnalytics
      }
      return null
    } catch (error) {
      console.error('Failed to parse live analytics data:', error)
      return null
    }
  }

  // =====================================================
  // PUB/SUB CORE METHODS
  // =====================================================

  /**
   * Publish event to channel
   */
  private static async publishEvent(channel: string, event: RealtimeEvent): Promise<void> {
    const fullChannel = `${this.CHANNEL_PREFIX}:${channel}`

    try {
      await redis.publish(fullChannel, JSON.stringify(event))
      console.log(`📡 Published event ${event.type} to channel ${fullChannel}`)
    } catch (error) {
      console.error('Failed to publish event:', error)
    }
  }

  /**
   * Subscribe to channel (for server-side listeners)
   */
  static async subscribeToChannel(
    channel: string,
    callback: (event: RealtimeEvent) => void
  ): Promise<void> {
    const fullChannel = `${this.CHANNEL_PREFIX}:${channel}`

    // Note: This would typically be used in a separate process or worker
    // For Next.js API routes, we'd use Supabase Realtime instead
    console.log(`🔔 Subscribed to channel ${fullChannel}`)
  }

  /**
   * Get channel name for client-side subscriptions
   */
  static getChannelName(type: 'document' | 'link' | 'analytics', id: string): string {
    return `${this.CHANNEL_PREFIX}:${type}:${id}`
  }

  // =====================================================
  // CLEANUP METHODS
  // =====================================================

  /**
   * Clean up expired viewers
   */
  static async cleanupExpiredViewers(): Promise<void> {
    // This would be called by a cron job to remove inactive viewers
    const pattern = `${this.ACTIVE_VIEWERS_PREFIX}:*`

    // In a real implementation, we'd scan for keys and check last activity
    console.log('🧹 Cleaning up expired viewers...')
  }

  /**
   * Get realtime statistics
   */
  static async getRealtimeStats(): Promise<{
    activeChannels: number
    totalActiveViewers: number
    eventsPublishedToday: number
  }> {
    // Mock implementation - in production, you'd track these metrics
    return {
      activeChannels: 0,
      totalActiveViewers: 0,
      eventsPublishedToday: 0
    }
  }

  // =====================================================
  // USER PRESENCE
  // =====================================================

  /**
   * Update user presence
   */
  static async updateUserPresence(
    userId: string,
    linkId: string,
    status: 'online' | 'viewing' | 'idle' | 'offline'
  ): Promise<void> {
    const presenceKey = RedisUtils.buildKey('user_presence', userId)
    const presenceData = {
      userId,
      linkId,
      status,
      lastSeen: Date.now()
    }

    await redis.set(presenceKey, JSON.stringify(presenceData))
    await redis.expire(presenceKey, 300) // 5 minutes

    // Publish presence update
    const event: RealtimeEvent = {
      type: 'visitor_joined', // Reuse existing type
      linkId,
      userId,
      data: presenceData,
      timestamp: Date.now()
    }

    await this.publishEvent(`presence:${linkId}`, event)
  }

  /**
   * Get user presence
   */
  static async getUserPresence(userId: string): Promise<any | null> {
    const presenceKey = RedisUtils.buildKey('user_presence', userId)
    const data = await redis.get(presenceKey)
    if (!data) return null

    try {
      return typeof data === 'string' ? JSON.parse(data) : data
    } catch (error) {
      console.error('Failed to parse user presence data:', error)
      return null
    }
  }
}

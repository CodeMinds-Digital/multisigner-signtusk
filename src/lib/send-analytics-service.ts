/**
 * Send Analytics Service
 * Comprehensive analytics tracking for document views, page views, and engagement
 */

export interface PageViewData {
  linkId: string
  documentId: string
  pageNumber: number
  duration: number
  scrollDepth: number
  email?: string
}

export interface DocumentViewData {
  linkId: string
  documentId: string
  email?: string
  duration?: number
}

export interface AnalyticsEvent {
  linkId: string
  documentId: string
  eventType: 'view' | 'download' | 'print' | 'page_view' | 'scroll' | 'exit'
  email?: string
  pageNumber?: number
  duration?: number
  scrollDepth?: number
  metadata?: Record<string, any>
}

export interface EngagementMetrics {
  totalViews: number
  uniqueViewers: number
  avgDuration: number
  avgScrollDepth: number
  completionRate: number
  engagementScore: number
}

export class SendAnalyticsService {
  private static sessionId: string | null = null
  private static pageStartTimes: Map<number, number> = new Map()
  private static maxScrollDepths: Map<number, number> = new Map()

  /**
   * Initialize analytics session
   */
  static initSession(): string {
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId()
    }
    return this.sessionId
  }

  /**
   * Generate unique session ID
   */
  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Track document view
   */
  static async trackDocumentView(data: DocumentViewData): Promise<void> {
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: data.linkId,
          documentId: data.documentId,
          eventType: 'view',
          email: data.email,
          duration: data.duration || 0
        })
      })
    } catch (error) {
      console.error('Failed to track document view:', error)
    }
  }

  /**
   * Track page view with duration and scroll depth
   */
  static async trackPageView(data: PageViewData): Promise<void> {
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: data.linkId,
          documentId: data.documentId,
          eventType: 'page_view',
          pageNumber: data.pageNumber,
          duration: data.duration,
          scrollDepth: data.scrollDepth,
          email: data.email,
          metadata: {
            scrollDepth: data.scrollDepth,
            duration: data.duration
          }
        })
      })
    } catch (error) {
      console.error('Failed to track page view:', error)
    }
  }

  /**
   * Start tracking a page
   */
  static startPageTracking(pageNumber: number): void {
    this.pageStartTimes.set(pageNumber, Date.now())
    if (!this.maxScrollDepths.has(pageNumber)) {
      this.maxScrollDepths.set(pageNumber, 0)
    }
  }

  /**
   * End tracking a page and send analytics
   */
  static async endPageTracking(
    pageNumber: number,
    linkId: string,
    documentId: string,
    email?: string
  ): Promise<void> {
    const startTime = this.pageStartTimes.get(pageNumber)
    if (!startTime) return

    const duration = Math.floor((Date.now() - startTime) / 1000) // seconds
    const scrollDepth = this.maxScrollDepths.get(pageNumber) || 0

    await this.trackPageView({
      linkId,
      documentId,
      pageNumber,
      duration,
      scrollDepth,
      email
    })

    this.pageStartTimes.delete(pageNumber)
  }

  /**
   * Update scroll depth for current page
   */
  static updateScrollDepth(pageNumber: number, depth: number): void {
    const currentMax = this.maxScrollDepths.get(pageNumber) || 0
    if (depth > currentMax) {
      this.maxScrollDepths.set(pageNumber, depth)
    }
  }

  /**
   * Track generic analytics event
   */
  static async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  /**
   * Track download event
   */
  static async trackDownload(
    linkId: string,
    documentId: string,
    email?: string
  ): Promise<void> {
    await this.trackEvent({
      linkId,
      documentId,
      eventType: 'download',
      email
    })
  }

  /**
   * Track print event
   */
  static async trackPrint(
    linkId: string,
    documentId: string,
    email?: string
  ): Promise<void> {
    await this.trackEvent({
      linkId,
      documentId,
      eventType: 'print',
      email
    })
  }

  /**
   * Calculate engagement score (0-100)
   */
  static calculateEngagementScore(metrics: {
    viewDuration: number
    pagesViewed: number
    totalPages: number
    avgScrollDepth: number
    downloaded: boolean
  }): number {
    let score = 0

    // Duration score (0-30 points)
    // 0-30s = 0, 30s-1m = 10, 1m-3m = 20, 3m+ = 30
    if (metrics.viewDuration >= 180) score += 30
    else if (metrics.viewDuration >= 60) score += 20
    else if (metrics.viewDuration >= 30) score += 10

    // Page completion score (0-40 points)
    const completionRate = metrics.pagesViewed / metrics.totalPages
    score += Math.floor(completionRate * 40)

    // Scroll depth score (0-20 points)
    score += Math.floor(metrics.avgScrollDepth * 0.2)

    // Download bonus (0-10 points)
    if (metrics.downloaded) score += 10

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get analytics for a document
   */
  static async getDocumentAnalytics(
    documentId: string
  ): Promise<EngagementMetrics | null> {
    try {
      const response = await fetch(
        `/api/send/analytics/track?documentId=${documentId}`
      )
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.stats
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      return null
    }
  }

  /**
   * Get analytics for a link
   */
  static async getLinkAnalytics(
    linkId: string
  ): Promise<EngagementMetrics | null> {
    try {
      const response = await fetch(
        `/api/send/analytics/track?linkId=${linkId}`
      )
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.stats
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      return null
    }
  }

  /**
   * Track session exit
   */
  static async trackExit(
    linkId: string,
    documentId: string,
    totalDuration: number,
    email?: string
  ): Promise<void> {
    // End tracking for all active pages
    for (const [pageNumber] of this.pageStartTimes) {
      await this.endPageTracking(pageNumber, linkId, documentId, email)
    }

    // Track exit event
    await this.trackEvent({
      linkId,
      documentId,
      eventType: 'exit',
      duration: totalDuration,
      email
    })
  }

  /**
   * Setup automatic exit tracking
   */
  static setupExitTracking(
    linkId: string,
    documentId: string,
    email?: string
  ): void {
    const startTime = Date.now()

    // Track on page unload
    const handleUnload = () => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      // Use sendBeacon for reliable tracking on page unload
      const data = JSON.stringify({
        linkId,
        documentId,
        eventType: 'exit',
        duration,
        email
      })
      navigator.sendBeacon('/api/send/analytics/track', data)
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  /**
   * Format scroll depth for display
   */
  static formatScrollDepth(depth: number): string {
    return `${Math.round(depth)}%`
  }
}


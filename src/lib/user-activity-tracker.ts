// User activity tracking service - standalone analytics and behavior tracking

export interface UserActivity {
  id: string
  userId: string
  sessionId: string
  action: string
  category: 'navigation' | 'document' | 'signature' | 'auth' | 'settings' | 'other'
  details: any
  timestamp: number
  duration?: number
  userAgent: string
  ipAddress?: string
  referrer?: string
  pageUrl: string
}

export interface UserSession {
  id: string
  userId: string
  startTime: number
  endTime?: number
  duration?: number
  pageViews: number
  actions: number
  deviceInfo: DeviceInfo
  location?: GeolocationInfo
  exitPage?: string
}

export interface DeviceInfo {
  userAgent: string
  platform: string
  browser: string
  browserVersion: string
  screenResolution: string
  language: string
  timezone: string
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export interface GeolocationInfo {
  country?: string
  region?: string
  city?: string
  timezone?: string
  coordinates?: { lat: number; lng: number }
}

export interface ActivityMetrics {
  totalSessions: number
  totalActivities: number
  averageSessionDuration: number
  bounceRate: number
  mostActiveHours: number[]
  topPages: Array<{ page: string; views: number }>
  topActions: Array<{ action: string; count: number }>
  deviceBreakdown: { mobile: number; tablet: number; desktop: number }
  browserBreakdown: Record<string, number>
}

export class UserActivityTracker {
  private static activities: UserActivity[] = []
  private static sessions: UserSession[] = []
  private static currentSession: UserSession | null = null
  private static isInitialized = false
  private static trackingEnabled = true

  /**
   * Initialize activity tracker
   */
  static initialize(userId?: string): void {
    if (this.isInitialized) return

    this.isInitialized = true
    this.trackingEnabled = true

    // Start new session
    if (userId) {
      this.startSession(userId)
    }

    // Track page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.trackActivity('page_hidden', 'navigation', {})
        } else {
          this.trackActivity('page_visible', 'navigation', {})
        }
      })

      // Track page unload
      window.addEventListener('beforeunload', () => {
        this.endCurrentSession()
      })

      // Track clicks
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement
        this.trackActivity('click', 'navigation', {
          element: target.tagName,
          className: target.className,
          id: target.id,
          text: target.textContent?.substring(0, 100)
        })
      })
    }

    console.log('User Activity Tracker initialized')
  }

  /**
   * Start new user session
   */
  static startSession(userId: string): UserSession {
    // End current session if exists
    if (this.currentSession) {
      this.endCurrentSession()
    }

    const deviceInfo = this.getDeviceInfo()
    const session: UserSession = {
      id: this.generateId(),
      userId,
      startTime: Date.now(),
      pageViews: 0,
      actions: 0,
      deviceInfo
    }

    this.currentSession = session
    this.sessions.push(session)

    this.trackActivity('session_start', 'auth', { deviceInfo })

    return session
  }

  /**
   * End current session
   */
  static endCurrentSession(): void {
    if (!this.currentSession) return

    const now = Date.now()
    this.currentSession.endTime = now
    this.currentSession.duration = now - this.currentSession.startTime
    this.currentSession.exitPage = typeof window !== 'undefined' ? window.location.pathname : undefined

    this.trackActivity('session_end', 'auth', {
      duration: this.currentSession.duration,
      pageViews: this.currentSession.pageViews,
      actions: this.currentSession.actions
    })

    this.currentSession = null
  }

  /**
   * Track user activity
   */
  static trackActivity(
    action: string,
    category: UserActivity['category'],
    details: any = {},
    duration?: number
  ): void {
    if (!this.trackingEnabled || !this.currentSession) return

    const activity: UserActivity = {
      id: this.generateId(),
      userId: this.currentSession.userId,
      sessionId: this.currentSession.id,
      action,
      category,
      details,
      timestamp: Date.now(),
      duration,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      pageUrl: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    }

    this.activities.push(activity)
    this.currentSession.actions++

    // Track page views
    if (action === 'page_view') {
      this.currentSession.pageViews++
    }

    // Keep only last 10000 activities to prevent memory issues
    if (this.activities.length > 10000) {
      this.activities = this.activities.slice(-10000)
    }
  }

  /**
   * Track page view
   */
  static trackPageView(page: string, title?: string): void {
    this.trackActivity('page_view', 'navigation', {
      page,
      title,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined
    })
  }

  /**
   * Track document action
   */
  static trackDocumentAction(
    action: 'upload' | 'view' | 'download' | 'delete' | 'share',
    documentId: string,
    documentTitle?: string
  ): void {
    this.trackActivity(`document_${action}`, 'document', {
      documentId,
      documentTitle
    })
  }

  /**
   * Track signature action
   */
  static trackSignatureAction(
    action: 'request_sent' | 'request_viewed' | 'signed' | 'declined' | 'reminder_sent',
    requestId: string,
    documentId?: string
  ): void {
    this.trackActivity(`signature_${action}`, 'signature', {
      requestId,
      documentId
    })
  }

  /**
   * Track timed action (start)
   */
  static startTimedAction(actionId: string, action: string, category: UserActivity['category']): void {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(`timed_action_${actionId}`, JSON.stringify({
        action,
        category,
        startTime: Date.now()
      }))
    }
  }

  /**
   * Track timed action (end)
   */
  static endTimedAction(actionId: string, details: any = {}): void {
    if (typeof window === 'undefined') return

    const stored = window.sessionStorage.getItem(`timed_action_${actionId}`)
    if (!stored) return

    try {
      const { action, category, startTime } = JSON.parse(stored)
      const duration = Date.now() - startTime

      this.trackActivity(action, category, details, duration)
      window.sessionStorage.removeItem(`timed_action_${actionId}`)
    } catch (error) {
      console.error('Error ending timed action:', error)
    }
  }

  /**
   * Get user activities
   */
  static getUserActivities(
    userId: string,
    limit?: number,
    category?: UserActivity['category']
  ): UserActivity[] {
    let activities = this.activities.filter(a => a.userId === userId)

    if (category) {
      activities = activities.filter(a => a.category === category)
    }

    activities.sort((a, b) => b.timestamp - a.timestamp)

    if (limit) {
      activities = activities.slice(0, limit)
    }

    return activities
  }

  /**
   * Get user sessions
   */
  static getUserSessions(userId: string, limit?: number): UserSession[] {
    let sessions = this.sessions.filter(s => s.userId === userId)
    sessions.sort((a, b) => b.startTime - a.startTime)

    if (limit) {
      sessions = sessions.slice(0, limit)
    }

    return sessions
  }

  /**
   * Get activity metrics
   */
  static getActivityMetrics(userId?: string, timeRange?: { start: number; end: number }): ActivityMetrics {
    let activities = userId ? this.activities.filter(a => a.userId === userId) : this.activities
    let sessions = userId ? this.sessions.filter(s => s.userId === userId) : this.sessions

    if (timeRange) {
      activities = activities.filter(a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end)
      sessions = sessions.filter(s => s.startTime >= timeRange.start && s.startTime <= timeRange.end)
    }

    // Calculate metrics
    const totalSessions = sessions.length
    const totalActivities = activities.length
    const completedSessions = sessions.filter(s => s.duration)
    const averageSessionDuration = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
      : 0

    // Bounce rate (sessions with only 1 page view)
    const bounceRate = totalSessions > 0 
      ? (sessions.filter(s => s.pageViews <= 1).length / totalSessions) * 100
      : 0

    // Most active hours
    const hourCounts = new Array(24).fill(0)
    activities.forEach(a => {
      const hour = new Date(a.timestamp).getHours()
      hourCounts[hour]++
    })
    const mostActiveHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour)

    // Top pages
    const pageCounts: Record<string, number> = {}
    activities.filter(a => a.action === 'page_view').forEach(a => {
      const page = a.details.page || 'Unknown'
      pageCounts[page] = (pageCounts[page] || 0) + 1
    })
    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([page, views]) => ({ page, views }))

    // Top actions
    const actionCounts: Record<string, number> = {}
    activities.forEach(a => {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1
    })
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }))

    // Device breakdown
    const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 }
    sessions.forEach(s => {
      if (s.deviceInfo.isMobile) deviceBreakdown.mobile++
      else if (s.deviceInfo.isTablet) deviceBreakdown.tablet++
      else deviceBreakdown.desktop++
    })

    // Browser breakdown
    const browserBreakdown: Record<string, number> = {}
    sessions.forEach(s => {
      const browser = s.deviceInfo.browser
      browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1
    })

    return {
      totalSessions,
      totalActivities,
      averageSessionDuration: Math.round(averageSessionDuration),
      bounceRate: Math.round(bounceRate * 100) / 100,
      mostActiveHours,
      topPages,
      topActions,
      deviceBreakdown,
      browserBreakdown
    }
  }

  /**
   * Export activity data
   */
  static exportData(userId?: string): {
    activities: UserActivity[]
    sessions: UserSession[]
    metrics: ActivityMetrics
  } {
    const activities = userId ? this.getUserActivities(userId) : this.activities
    const sessions = userId ? this.getUserSessions(userId) : this.sessions
    const metrics = this.getActivityMetrics(userId)

    return { activities, sessions, metrics }
  }

  /**
   * Clear activity data
   */
  static clearData(userId?: string): void {
    if (userId) {
      this.activities = this.activities.filter(a => a.userId !== userId)
      this.sessions = this.sessions.filter(s => s.userId !== userId)
    } else {
      this.activities = []
      this.sessions = []
    }
  }

  /**
   * Enable/disable tracking
   */
  static setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabled = enabled
  }

  /**
   * Private helper methods
   */
  private static getDeviceInfo(): DeviceInfo {
    if (typeof navigator === 'undefined' || typeof window === 'undefined') {
      return {
        userAgent: 'Unknown',
        platform: 'Unknown',
        browser: 'Unknown',
        browserVersion: 'Unknown',
        screenResolution: 'Unknown',
        language: 'Unknown',
        timezone: 'Unknown',
        isMobile: false,
        isTablet: false,
        isDesktop: true
      }
    }

    const userAgent = navigator.userAgent
    const platform = navigator.platform
    const language = navigator.language
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const screenResolution = `${screen.width}x${screen.height}`

    // Simple browser detection
    let browser = 'Unknown'
    let browserVersion = 'Unknown'
    
    if (userAgent.includes('Chrome')) {
      browser = 'Chrome'
      const match = userAgent.match(/Chrome\/(\d+)/)
      browserVersion = match ? match[1] : 'Unknown'
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox'
      const match = userAgent.match(/Firefox\/(\d+)/)
      browserVersion = match ? match[1] : 'Unknown'
    } else if (userAgent.includes('Safari')) {
      browser = 'Safari'
      const match = userAgent.match(/Version\/(\d+)/)
      browserVersion = match ? match[1] : 'Unknown'
    }

    // Device type detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet

    return {
      userAgent,
      platform,
      browser,
      browserVersion,
      screenResolution,
      language,
      timezone,
      isMobile,
      isTablet,
      isDesktop
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

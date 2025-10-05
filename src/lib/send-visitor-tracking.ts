/**
 * Send Visitor Tracking Service
 * Device fingerprinting, session management, and visitor identification
 */

export interface DeviceFingerprint {
  userAgent: string
  language: string
  platform: string
  screenResolution: string
  timezone: string
  colorDepth: number
  cookiesEnabled: boolean
  doNotTrack: boolean
  plugins: string[]
  canvas: string
  webgl: string
  fonts: string[]
}

export interface VisitorSession {
  sessionId: string
  fingerprint: string
  deviceInfo: DeviceFingerprint
  ipAddress?: string
  country?: string
  city?: string
  isReturningVisitor: boolean
  previousVisits: number
  firstVisitAt?: string
  lastVisitAt?: string
}

export class SendVisitorTracking {
  private static fingerprint: string | null = null
  private static sessionId: string | null = null
  private static deviceInfo: DeviceFingerprint | null = null

  /**
   * Generate device fingerprint
   */
  static async generateFingerprint(): Promise<string> {
    if (this.fingerprint) {
      return this.fingerprint
    }

    const deviceInfo = await this.getDeviceInfo()
    
    // Create fingerprint from device characteristics
    const fingerprintData = [
      deviceInfo.userAgent,
      deviceInfo.language,
      deviceInfo.platform,
      deviceInfo.screenResolution,
      deviceInfo.timezone,
      deviceInfo.colorDepth.toString(),
      deviceInfo.cookiesEnabled.toString(),
      deviceInfo.canvas,
      deviceInfo.webgl,
      deviceInfo.fonts.join(',')
    ].join('|')

    // Simple hash function (in production, use a proper hash like SHA-256)
    this.fingerprint = await this.simpleHash(fingerprintData)
    return this.fingerprint
  }

  /**
   * Get comprehensive device information
   */
  static async getDeviceInfo(): Promise<DeviceFingerprint> {
    if (this.deviceInfo) {
      return this.deviceInfo
    }

    const deviceInfo: DeviceFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      colorDepth: screen.colorDepth,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      plugins: this.getPlugins(),
      canvas: await this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      fonts: await this.detectFonts()
    }

    this.deviceInfo = deviceInfo
    return deviceInfo
  }

  /**
   * Get browser plugins
   */
  private static getPlugins(): string[] {
    const plugins: string[] = []
    
    if (navigator.plugins) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        plugins.push(navigator.plugins[i].name)
      }
    }
    
    return plugins
  }

  /**
   * Generate canvas fingerprint
   */
  private static async getCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      if (!ctx) return 'no-canvas'
      
      canvas.width = 200
      canvas.height = 50
      
      // Draw text with various styles
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillStyle = '#f60'
      ctx.fillRect(125, 1, 62, 20)
      ctx.fillStyle = '#069'
      ctx.fillText('SendTusk', 2, 15)
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)'
      ctx.fillText('Fingerprint', 4, 17)
      
      return canvas.toDataURL()
    } catch (error) {
      return 'canvas-error'
    }
  }

  /**
   * Get WebGL fingerprint
   */
  private static getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      
      if (!gl) return 'no-webgl'
      
      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        return `${vendor}|${renderer}`
      }
      
      return 'webgl-available'
    } catch (error) {
      return 'webgl-error'
    }
  }

  /**
   * Detect installed fonts
   */
  private static async detectFonts(): Promise<string[]> {
    const baseFonts = ['monospace', 'sans-serif', 'serif']
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Bookman',
      'Comic Sans MS', 'Trebuchet MS', 'Impact'
    ]
    
    const detectedFonts: string[] = []
    
    // Simple font detection (in production, use a more robust method)
    for (const font of testFonts) {
      if (this.isFontAvailable(font, baseFonts)) {
        detectedFonts.push(font)
      }
    }
    
    return detectedFonts
  }

  /**
   * Check if font is available
   */
  private static isFontAvailable(font: string, baseFonts: string[]): boolean {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return false
    
    const text = 'mmmmmmmmmmlli'
    const baselineSize = 72
    
    ctx.font = `${baselineSize}px ${baseFonts[0]}`
    const baselineWidth = ctx.measureText(text).width
    
    ctx.font = `${baselineSize}px ${font}, ${baseFonts[0]}`
    const testWidth = ctx.measureText(text).width
    
    return testWidth !== baselineWidth
  }

  /**
   * Simple hash function
   */
  private static async simpleHash(str: string): Promise<string> {
    // Use Web Crypto API if available
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      try {
        const encoder = new TextEncoder()
        const data = encoder.encode(str)
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      } catch (error) {
        // Fallback to simple hash
      }
    }
    
    // Fallback: simple hash function
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Initialize visitor session
   */
  static async initSession(linkId: string, documentId: string, email?: string): Promise<VisitorSession> {
    const fingerprint = await this.generateFingerprint()
    const deviceInfo = await this.getDeviceInfo()
    
    // Generate session ID
    this.sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    // Get IP and location (from API)
    const locationData = await this.getLocationData()
    
    // Check if returning visitor
    const visitorData = await this.checkReturningVisitor(fingerprint, linkId)
    
    const session: VisitorSession = {
      sessionId: this.sessionId,
      fingerprint,
      deviceInfo,
      ipAddress: locationData.ip,
      country: locationData.country,
      city: locationData.city,
      isReturningVisitor: visitorData.isReturning,
      previousVisits: visitorData.previousVisits,
      firstVisitAt: visitorData.firstVisitAt,
      lastVisitAt: visitorData.lastVisitAt
    }
    
    // Create session in database
    await this.createSession(session, linkId, documentId, email)
    
    return session
  }

  /**
   * Get location data from IP
   */
  private static async getLocationData(): Promise<{ ip?: string; country?: string; city?: string }> {
    try {
      // In production, use a proper IP geolocation service
      // For now, return empty data
      return {}
    } catch (error) {
      return {}
    }
  }

  /**
   * Check if visitor is returning
   */
  private static async checkReturningVisitor(
    fingerprint: string,
    linkId: string
  ): Promise<{ isReturning: boolean; previousVisits: number; firstVisitAt?: string; lastVisitAt?: string }> {
    try {
      const response = await fetch('/api/send/visitors/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, linkId })
      })
      
      const data = await response.json()
      
      if (data.success && data.visitor) {
        return {
          isReturning: true,
          previousVisits: data.visitor.visitCount || 0,
          firstVisitAt: data.visitor.firstVisitAt,
          lastVisitAt: data.visitor.lastVisitAt
        }
      }
      
      return { isReturning: false, previousVisits: 0 }
    } catch (error) {
      return { isReturning: false, previousVisits: 0 }
    }
  }

  /**
   * Create session in database
   */
  private static async createSession(
    session: VisitorSession,
    linkId: string,
    documentId: string,
    email?: string
  ): Promise<void> {
    try {
      await fetch('/api/send/visitors/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          fingerprint: session.fingerprint,
          linkId,
          documentId,
          email,
          deviceInfo: session.deviceInfo,
          ipAddress: session.ipAddress,
          country: session.country,
          city: session.city,
          isReturningVisitor: session.isReturningVisitor,
          previousVisits: session.previousVisits
        })
      })
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      await fetch('/api/send/visitors/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  /**
   * Get current session ID
   */
  static getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Get current fingerprint
   */
  static getFingerprint(): string | null {
    return this.fingerprint
  }
}


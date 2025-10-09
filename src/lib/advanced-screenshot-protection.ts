// Advanced Screenshot Protection Service
// Provides comprehensive protection against screenshots, screen recording, and content theft

export interface AdvancedProtectionConfig {
  enabled: boolean
  screenshotDetection: {
    enabled: boolean
    methods: ('visibility' | 'keyboard' | 'devtools' | 'focus' | 'clipboard')[]
    sensitivity: 'low' | 'medium' | 'high'
    blockDuration: number // milliseconds to block content
  }
  screenRecordingDetection: {
    enabled: boolean
    methods: ('media_devices' | 'performance' | 'canvas_fingerprint')[]
    alertUser: boolean
    blockContent: boolean
  }
  devToolsProtection: {
    enabled: boolean
    detectMethods: ('debugger' | 'console' | 'timing' | 'function_toString')[]
    blockContent: boolean
    redirectOnDetection: boolean
  }
  contentProtection: {
    disableRightClick: boolean
    disableTextSelection: boolean
    disableDragDrop: boolean
    disablePrint: boolean
    disableCopy: boolean
    disableInspect: boolean
  }
  visualProtection: {
    blurOnSuspiciousActivity: boolean
    hideOnTabSwitch: boolean
    overlayOnDetection: boolean
    dynamicWatermarks: boolean
  }
  behaviorAnalysis: {
    enabled: boolean
    trackMousePatterns: boolean
    trackKeyboardPatterns: boolean
    detectAutomation: boolean
    suspiciousActivityThreshold: number
  }
}

export interface ProtectionEvent {
  type: string
  timestamp: number
  method: string
  severity: 'low' | 'medium' | 'high'
  metadata: Record<string, any>
  userAgent: string
  fingerprint: string
}

export class AdvancedScreenshotProtection {
  private config: AdvancedProtectionConfig
  private linkId: string
  private sessionId: string
  private eventListeners: Array<{ element: any; event: string; handler: any }> = []
  private protectionActive = false
  private suspiciousActivityCount = 0
  private lastActivityTime = Date.now()
  private mousePatterns: Array<{ x: number; y: number; timestamp: number }> = []
  private keyPatterns: Array<{ key: string; timestamp: number }> = []

  constructor(config: AdvancedProtectionConfig, linkId: string, sessionId: string) {
    this.config = config
    this.linkId = linkId
    this.sessionId = sessionId
  }

  /**
   * Initialize all protection mechanisms
   */
  initialize(): void {
    if (!this.config.enabled) return

    this.protectionActive = true

    if (this.config.screenshotDetection.enabled) {
      this.initializeScreenshotDetection()
    }

    if (this.config.screenRecordingDetection.enabled) {
      this.initializeScreenRecordingDetection()
    }

    if (this.config.devToolsProtection.enabled) {
      this.initializeDevToolsProtection()
    }

    if (this.config.contentProtection) {
      this.initializeContentProtection()
    }

    if (this.config.behaviorAnalysis.enabled) {
      this.initializeBehaviorAnalysis()
    }

    // Initialize visual protection
    this.initializeVisualProtection()
  }

  /**
   * Enhanced screenshot detection with multiple methods
   */
  private initializeScreenshotDetection(): void {
    const methods = this.config.screenshotDetection.methods

    // Visibility API detection
    if (methods.includes('visibility')) {
      const visibilityHandler = () => {
        if (document.hidden) {
          this.handleSuspiciousActivity('screenshot_attempt', 'visibility_change', 'medium')
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
      this.eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler })
    }

    // Keyboard shortcut detection
    if (methods.includes('keyboard')) {
      const keyHandler = (e: KeyboardEvent) => {
        const isScreenshotShortcut =
          (e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(e.key) ||
          e.key === 'PrintScreen' ||
          (e.altKey && e.key === 'PrintScreen') ||
          (e.metaKey && e.shiftKey && e.key === '4') // macOS screenshot

        if (isScreenshotShortcut) {
          e.preventDefault()
          this.handleSuspiciousActivity('screenshot_attempt', 'keyboard_shortcut', 'high', { key: e.key })
        }
      }
      document.addEventListener('keydown', keyHandler)
      this.eventListeners.push({ element: document, event: 'keydown', handler: keyHandler })
    }

    // Focus detection
    if (methods.includes('focus')) {
      const blurHandler = () => {
        this.handleSuspiciousActivity('focus_lost', 'window_blur', 'low')
      }
      window.addEventListener('blur', blurHandler)
      this.eventListeners.push({ element: window, event: 'blur', handler: blurHandler })
    }

    // Clipboard monitoring
    if (methods.includes('clipboard')) {
      const clipboardHandler = (e: ClipboardEvent) => {
        this.handleSuspiciousActivity('clipboard_access', 'copy_attempt', 'medium')
      }
      document.addEventListener('copy', clipboardHandler)
      this.eventListeners.push({ element: document, event: 'copy', handler: clipboardHandler })
    }
  }

  /**
   * Screen recording detection
   */
  private initializeScreenRecordingDetection(): void {
    const methods = this.config.screenRecordingDetection.methods

    // Media devices detection
    if (methods.includes('media_devices') && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoInputs = devices.filter(device => device.kind === 'videoinput')
        if (videoInputs.length > 1) {
          this.handleSuspiciousActivity('screen_recording', 'multiple_video_devices', 'medium')
        }
      })

      // Monitor for new media device connections
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.handleSuspiciousActivity('screen_recording', 'device_change', 'low')
      })
    }

    // Performance monitoring for recording indicators
    if (methods.includes('performance')) {
      setInterval(() => {
        const now = performance.now()
        const entries = performance.getEntriesByType('navigation')

        // Detect unusual performance patterns that might indicate recording
        if (entries.length > 0) {
          const entry = entries[0] as PerformanceNavigationTiming
          if (entry.loadEventEnd - entry.loadEventStart > 5000) {
            this.handleSuspiciousActivity('screen_recording', 'performance_anomaly', 'low')
          }
        }
      }, 10000)
    }

    // Canvas fingerprinting detection
    if (methods.includes('canvas_fingerprint')) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Screen recording detection', 2, 2)
        const fingerprint = canvas.toDataURL()

        // Store fingerprint and monitor for changes
        try {
          localStorage.setItem('canvas_fingerprint', fingerprint)
        } catch (e) {
          // Handle localStorage errors
        }
      }
    }
  }

  /**
   * Developer tools detection
   */
  private initializeDevToolsProtection(): void {
    const methods = this.config.devToolsProtection.detectMethods

    // Debugger detection
    if (methods.includes('debugger')) {
      setInterval(() => {
        const start = performance.now()
        debugger // This will pause if dev tools are open
        const end = performance.now()

        if (end - start > 100) {
          this.handleSuspiciousActivity('devtools_detected', 'debugger_timing', 'high')
        }
      }, 5000)
    }

    // Console detection
    if (methods.includes('console')) {
      let devtools = false
      const element = new Image()
      Object.defineProperty(element, 'id', {
        get: () => {
          devtools = true
          this.handleSuspiciousActivity('devtools_detected', 'console_access', 'high')
        }
      })

      setInterval(() => {
        devtools = false
        console.log(element)
        console.clear()
      }, 2000)
    }

    // Timing-based detection
    if (methods.includes('timing')) {
      setInterval(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > 160
        const heightThreshold = window.outerHeight - window.innerHeight > 160

        if (widthThreshold || heightThreshold) {
          this.handleSuspiciousActivity('devtools_detected', 'window_size_anomaly', 'medium')
        }
      }, 1000)
    }

    // Function toString detection
    if (methods.includes('function_toString')) {
      const originalToString = Function.prototype.toString
      Function.prototype.toString = function () {
        if (this === Function.prototype.toString) {
          this.handleSuspiciousActivity('devtools_detected', 'function_inspection', 'medium')
        }
        return originalToString.call(this)
      }.bind(this)
    }
  }

  /**
   * Content protection mechanisms
   */
  private initializeContentProtection(): void {
    const protection = this.config.contentProtection

    if (protection.disableRightClick) {
      const contextMenuHandler = (e: MouseEvent) => {
        e.preventDefault()
        this.handleSuspiciousActivity('content_protection', 'right_click_blocked', 'low')
      }
      document.addEventListener('contextmenu', contextMenuHandler)
      this.eventListeners.push({ element: document, event: 'contextmenu', handler: contextMenuHandler })
    }

    if (protection.disableTextSelection) {
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
    }

    if (protection.disableDragDrop) {
      const dragHandler = (e: DragEvent) => {
        e.preventDefault()
        this.handleSuspiciousActivity('content_protection', 'drag_blocked', 'low')
      }
      document.addEventListener('dragstart', dragHandler)
      this.eventListeners.push({ element: document, event: 'dragstart', handler: dragHandler })
    }

    if (protection.disablePrint) {
      window.print = () => {
        this.handleSuspiciousActivity('content_protection', 'print_blocked', 'medium')
      }
    }

    if (protection.disableCopy) {
      const copyHandler = (e: ClipboardEvent) => {
        e.preventDefault()
        this.handleSuspiciousActivity('content_protection', 'copy_blocked', 'medium')
      }
      document.addEventListener('copy', copyHandler)
      this.eventListeners.push({ element: document, event: 'copy', handler: copyHandler })
    }

    if (protection.disableInspect) {
      const keyHandler = (e: KeyboardEvent) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          e.preventDefault()
          this.handleSuspiciousActivity('content_protection', 'inspect_blocked', 'high')
        }
      }
      document.addEventListener('keydown', keyHandler)
      this.eventListeners.push({ element: document, event: 'keydown', handler: keyHandler })
    }
  }

  /**
   * Visual protection effects
   */
  private initializeVisualProtection(): void {
    const visual = this.config.visualProtection

    if (visual.hideOnTabSwitch) {
      const visibilityHandler = () => {
        if (document.hidden) {
          document.body.style.opacity = '0'
        } else {
          document.body.style.opacity = '1'
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
      this.eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler })
    }
  }

  /**
   * Behavior analysis for automation detection
   */
  private initializeBehaviorAnalysis(): void {
    const analysis = this.config.behaviorAnalysis

    if (analysis.trackMousePatterns) {
      const mouseHandler = (e: MouseEvent) => {
        this.mousePatterns.push({
          x: e.clientX,
          y: e.clientY,
          timestamp: Date.now()
        })

        // Keep only recent patterns
        this.mousePatterns = this.mousePatterns.filter(
          pattern => Date.now() - pattern.timestamp < 10000
        )

        // Detect suspicious patterns (too regular, too fast, etc.)
        this.analyzeMousePatterns()
      }
      document.addEventListener('mousemove', mouseHandler)
      this.eventListeners.push({ element: document, event: 'mousemove', handler: mouseHandler })
    }

    if (analysis.trackKeyboardPatterns) {
      const keyHandler = (e: KeyboardEvent) => {
        this.keyPatterns.push({
          key: e.key,
          timestamp: Date.now()
        })

        // Keep only recent patterns
        this.keyPatterns = this.keyPatterns.filter(
          pattern => Date.now() - pattern.timestamp < 10000
        )

        this.analyzeKeyboardPatterns()
      }
      document.addEventListener('keydown', keyHandler)
      this.eventListeners.push({ element: document, event: 'keydown', handler: keyHandler })
    }
  }

  /**
   * Analyze mouse patterns for automation detection
   */
  private analyzeMousePatterns(): void {
    if (this.mousePatterns.length < 10) return

    const recent = this.mousePatterns.slice(-10)
    const speeds = recent.slice(1).map((pattern, i) => {
      const prev = recent[i]
      const distance = Math.sqrt(
        Math.pow(pattern.x - prev.x, 2) + Math.pow(pattern.y - prev.y, 2)
      )
      const time = pattern.timestamp - prev.timestamp
      return time > 0 ? distance / time : 0
    })

    // Detect unnaturally consistent speeds (automation)
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length
    const variance = speeds.reduce((a, b) => a + Math.pow(b - avgSpeed, 2), 0) / speeds.length

    if (variance < 0.1 && avgSpeed > 0.5) {
      this.handleSuspiciousActivity('automation_detected', 'consistent_mouse_speed', 'high')
    }
  }

  /**
   * Analyze keyboard patterns for automation detection
   */
  private analyzeKeyboardPatterns(): void {
    if (this.keyPatterns.length < 5) return

    const recent = this.keyPatterns.slice(-5)
    const intervals = recent.slice(1).map((pattern, i) =>
      pattern.timestamp - recent[i].timestamp
    )

    // Detect unnaturally consistent timing (automation)
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length

    if (variance < 10 && avgInterval < 100) {
      this.handleSuspiciousActivity('automation_detected', 'consistent_key_timing', 'high')
    }
  }

  /**
   * Handle suspicious activity
   */
  private handleSuspiciousActivity(
    type: string,
    method: string,
    severity: 'low' | 'medium' | 'high',
    metadata: Record<string, any> = {}
  ): void {
    this.suspiciousActivityCount++

    const event: ProtectionEvent = {
      type,
      timestamp: Date.now(),
      method,
      severity,
      metadata,
      userAgent: navigator.userAgent,
      fingerprint: this.generateFingerprint()
    }

    // Log the event
    this.logProtectionEvent(event)

    // Apply protection measures based on severity
    if (severity === 'high' || this.suspiciousActivityCount >= this.config.behaviorAnalysis.suspiciousActivityThreshold) {
      this.applyProtectionMeasures(event)
    }
  }

  /**
   * Apply protection measures
   */
  private applyProtectionMeasures(event: ProtectionEvent): void {
    const visual = this.config.visualProtection

    if (visual.blurOnSuspiciousActivity) {
      document.body.style.filter = 'blur(10px)'
      setTimeout(() => {
        document.body.style.filter = 'none'
      }, this.config.screenshotDetection.blockDuration)
    }

    if (visual.overlayOnDetection) {
      this.showProtectionOverlay(event)
    }

    // Redirect if configured
    if (this.config.devToolsProtection.redirectOnDetection && event.severity === 'high') {
      window.location.href = '/protection-violation'
    }
  }

  /**
   * Show protection overlay
   */
  private showProtectionOverlay(event: ProtectionEvent): void {
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      font-family: Arial, sans-serif;
      font-size: 24px;
      text-align: center;
    `
    overlay.innerHTML = `
      <div>
        <h2>Security Alert</h2>
        <p>Suspicious activity detected: ${event.type}</p>
        <p>This incident has been logged.</p>
      </div>
    `

    document.body.appendChild(overlay)

    setTimeout(() => {
      document.body.removeChild(overlay)
    }, 3000)
  }

  /**
   * Generate browser fingerprint
   */
  private generateFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('fingerprint', 10, 10)

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')

    return btoa(fingerprint).substring(0, 16)
  }

  /**
   * Log protection event to server
   */
  private async logProtectionEvent(event: ProtectionEvent): Promise<void> {
    try {
      await fetch('/api/send/protection/advanced-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          linkId: this.linkId,
          sessionId: this.sessionId,
          event
        })
      })
    } catch (error) {
      console.error('Failed to log protection event:', error)
    }
  }

  /**
   * Cleanup all event listeners
   */
  destroy(): void {
    this.protectionActive = false
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler)
    })
    this.eventListeners = []
  }
}

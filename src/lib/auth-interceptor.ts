import { supabase } from './supabase'

// Token refresh tracking
interface TokenRefreshState {
  isRefreshing: boolean
  lastRefreshTime: number
  refreshPromise: Promise<boolean> | null
}

// Global auth error handler with silent token refresh
export class AuthInterceptor {
  private static isHandlingExpiredToken = false
  private static tokenRefreshState: TokenRefreshState = {
    isRefreshing: false,
    lastRefreshTime: 0,
    refreshPromise: null
  }

  // Token expiry threshold (5 minutes before actual expiry)
  private static readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000 // 5 minutes in ms
  private static readonly MIN_REFRESH_INTERVAL = 30 * 1000 // 30 seconds minimum between refresh attempts

  static isTokenExpiredError(error: any): boolean {
    if (!error) return false
    const message = error.message?.toLowerCase() || ''
    return (
      message.includes('refresh_token_not_found') ||
      message.includes('invalid refresh token') ||
      message.includes('refresh token not found') ||
      message.includes('jwt expired') ||
      message.includes('token expired') ||
      message.includes('session expired') ||
      message.includes('authapieerror') ||
      error.status === 401 ||
      error.code === 'invalid_token' ||
      error.code === 'token_expired'
    )
  }

  // Check if token needs refresh based on expiry time
  static async shouldRefreshToken(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.expires_at) return false

      const expiryTime = new Date(session.expires_at * 1000).getTime()
      const currentTime = Date.now()
      const timeUntilExpiry = expiryTime - currentTime

      // Refresh if token expires within the threshold
      return timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD
    } catch (error) {
      console.error('Error checking token expiry:', error)
      return false
    }
  }

  // Proactive token refresh
  static async proactiveTokenRefresh(): Promise<boolean> {
    const now = Date.now()

    // Prevent too frequent refresh attempts
    if (now - this.tokenRefreshState.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      console.log('🔄 Skipping token refresh - too soon since last attempt')
      return false
    }

    // If already refreshing, wait for the existing promise
    if (this.tokenRefreshState.isRefreshing && this.tokenRefreshState.refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...')
      return await this.tokenRefreshState.refreshPromise
    }

    // Check if refresh is needed
    const needsRefresh = await this.shouldRefreshToken()
    if (!needsRefresh) {
      return true // Token is still valid
    }

    console.log('🔄 Starting proactive token refresh...')
    this.tokenRefreshState.isRefreshing = true
    this.tokenRefreshState.lastRefreshTime = now

    this.tokenRefreshState.refreshPromise = this.performTokenRefresh()
    const result = await this.tokenRefreshState.refreshPromise

    this.tokenRefreshState.isRefreshing = false
    this.tokenRefreshState.refreshPromise = null

    return result
  }

  // Perform the actual token refresh
  private static async performTokenRefresh(): Promise<boolean> {
    try {
      console.log('🔄 Attempting silent token refresh...')
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('❌ Token refresh failed:', error)
        return false
      }

      if (data.session) {
        console.log('✅ Token refreshed successfully')
        return true
      }

      console.warn('⚠️ Token refresh returned no session')
      return false
    } catch (error) {
      console.error('❌ Token refresh exception:', error)
      return false
    }
  }

  // Silent token refresh with retry logic
  static async silentTokenRefresh(): Promise<boolean> {
    try {
      return await this.proactiveTokenRefresh()
    } catch (error) {
      console.error('❌ Silent token refresh failed:', error)
      return false
    }
  }

  static async handleExpiredToken(): Promise<void> {
    // Prevent multiple simultaneous token refresh attempts
    if (this.isHandlingExpiredToken) {
      return
    }

    this.isHandlingExpiredToken = true

    try {
      console.warn('🔄 AuthInterceptor: Attempting token refresh before logout...')

      // First try to refresh the token
      const refreshSuccess = await this.silentTokenRefresh()

      if (refreshSuccess) {
        console.log('✅ Token refreshed successfully, continuing...')
        return
      }

      console.warn('❌ Token refresh failed, proceeding with logout...')

      // Clear all auth storage
      this.clearAuthStorage()

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Force redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ AuthInterceptor: Error during token handling:', error)
      // Force redirect even if refresh fails
      window.location.href = '/login'
    } finally {
      this.isHandlingExpiredToken = false
    }
  }

  private static clearAuthStorage(): void {
    if (typeof window !== 'undefined') {
      // Clear localStorage
      const localKeysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('supabase.')) {
          localKeysToRemove.push(key)
        }
      }
      localKeysToRemove.forEach(key => {
        localStorage.removeItem(key)
      })

      // Clear sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('supabase.')) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key)
      })
    }
  }

  // Wrapper for Supabase operations with automatic token handling and retry
  static async executeWithTokenHandling<T>(
    operation: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    // First, check if we should proactively refresh the token
    await this.proactiveTokenRefresh()

    let lastError: any = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error

        // If it's not a token error, don't retry
        if (!this.isTokenExpiredError(error)) {
          throw error
        }

        // If this is the last attempt, handle expired token (which may redirect)
        if (attempt === maxRetries) {
          console.warn(`❌ Final attempt failed, handling expired token...`)
          await this.handleExpiredToken()
          throw new Error('Session expired. Please log in again.')
        }

        // Try to refresh token for retry
        console.log(`🔄 Attempt ${attempt + 1} failed with token error, trying to refresh...`)
        const refreshSuccess = await this.silentTokenRefresh()

        if (!refreshSuccess) {
          console.warn(`❌ Token refresh failed on attempt ${attempt + 1}`)
          // Continue to next attempt or final handling
          continue
        }

        console.log(`✅ Token refreshed, retrying operation (attempt ${attempt + 2})...`)
        // Continue to next iteration to retry the operation
      }
    }

    // This should not be reached, but just in case
    throw lastError || new Error('Operation failed after retries')
  }
}

// Enhanced Supabase client wrapper
export const createAuthenticatedSupabaseCall = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return AuthInterceptor.executeWithTokenHandling(operation)
}

// Proactive token refresh manager
export class TokenRefreshManager {
  private static refreshInterval: NodeJS.Timeout | null = null
  private static isInitialized = false
  private static readonly REFRESH_CHECK_INTERVAL = 2 * 60 * 1000 // Check every 2 minutes

  // Initialize proactive token refresh
  static initialize() {
    if (this.isInitialized || typeof window === 'undefined') {
      return
    }

    this.isInitialized = true
    console.log('🔄 Initializing proactive token refresh manager...')

    // Start periodic refresh checks
    this.startPeriodicRefresh()

    // Refresh on page visibility change (user returns to tab)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)

    // Refresh on page focus (user switches back to tab)
    window.addEventListener('focus', this.handlePageFocus)

    // Refresh on user activity after idle period
    this.setupActivityListeners()
  }

  // Start periodic token refresh checks
  private static startPeriodicRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }

    this.refreshInterval = setInterval(async () => {
      try {
        await AuthInterceptor.proactiveTokenRefresh()
      } catch (error) {
        console.error('❌ Periodic token refresh failed:', error)
      }
    }, this.REFRESH_CHECK_INTERVAL)
  }

  // Handle page visibility change
  private static handleVisibilityChange = async () => {
    if (!document.hidden) {
      console.log('🔄 Page became visible, checking token...')
      try {
        await AuthInterceptor.proactiveTokenRefresh()
      } catch (error) {
        console.error('❌ Token refresh on visibility change failed:', error)
      }
    }
  }

  // Handle page focus
  private static handlePageFocus = async () => {
    console.log('🔄 Page focused, checking token...')
    try {
      await AuthInterceptor.proactiveTokenRefresh()
    } catch (error) {
      console.error('❌ Token refresh on focus failed:', error)
    }
  }

  // Setup activity listeners for idle detection
  private static setupActivityListeners() {
    let lastActivity = Date.now()
    const IDLE_THRESHOLD = 30 * 60 * 1000 // 30 minutes

    const updateActivity = () => {
      const now = Date.now()
      const wasIdle = now - lastActivity > IDLE_THRESHOLD
      lastActivity = now

      // If user was idle and now active, refresh token
      if (wasIdle) {
        console.log('🔄 User active after idle period, checking token...')
        AuthInterceptor.proactiveTokenRefresh().catch(error => {
          console.error('❌ Token refresh after idle failed:', error)
        })
      }
    }

    // Listen for user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true })
    })
  }

  // Cleanup
  static cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('focus', this.handlePageFocus)
    this.isInitialized = false
  }
}

// Auto-initialize when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Initialize after a short delay to ensure DOM is ready
  setTimeout(() => {
    TokenRefreshManager.initialize()
  }, 1000)
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (AuthInterceptor.isTokenExpiredError(event.reason)) {
      console.warn('🧹 Unhandled token expiry detected, cleaning up...')
      event.preventDefault() // Prevent the error from being logged
      AuthInterceptor.handleExpiredToken()
    }
  })

  // Global error handler for uncaught errors
  window.addEventListener('error', (event) => {
    if (AuthInterceptor.isTokenExpiredError(event.error)) {
      console.warn('🧹 Uncaught token expiry error detected, cleaning up...')
      event.preventDefault() // Prevent the error from being logged
      AuthInterceptor.handleExpiredToken()
    }
  })
}

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
  private static readonly MIN_REFRESH_INTERVAL = 2 * 60 * 1000 // 2 minutes minimum between refresh attempts

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
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error getting session for token check:', error)
        return false
      }

      if (!session?.expires_at) {
        console.log('No session or expiry time found')
        return false
      }

      const expiryTime = new Date(session.expires_at * 1000).getTime()
      const currentTime = Date.now()
      const timeUntilExpiry = expiryTime - currentTime

      // Don't refresh if token is already expired (let normal error handling deal with it)
      if (timeUntilExpiry <= 0) {
        console.log('Token already expired, skipping proactive refresh')
        return false
      }

      // Refresh if token expires within the threshold
      const shouldRefresh = timeUntilExpiry <= this.TOKEN_REFRESH_THRESHOLD
      console.log(`Token check: ${Math.round(timeUntilExpiry / 1000 / 60)} minutes until expiry, should refresh: ${shouldRefresh}`)

      return shouldRefresh
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
      return true // Return true to indicate token is still valid
    }

    // If already refreshing, wait for the existing promise
    if (this.tokenRefreshState.isRefreshing && this.tokenRefreshState.refreshPromise) {
      console.log('🔄 Token refresh already in progress, waiting...')
      try {
        return await this.tokenRefreshState.refreshPromise
      } catch (error) {
        console.error('❌ Error waiting for token refresh:', error)
        return false
      }
    }

    // Check if refresh is needed
    const needsRefresh = await this.shouldRefreshToken()
    if (!needsRefresh) {
      console.log('✅ Token is still valid, no refresh needed')
      return true // Token is still valid
    }

    console.log('🔄 Starting proactive token refresh...')
    this.tokenRefreshState.isRefreshing = true
    this.tokenRefreshState.lastRefreshTime = now

    this.tokenRefreshState.refreshPromise = this.performTokenRefresh()

    try {
      const result = await this.tokenRefreshState.refreshPromise
      return result
    } catch (error) {
      console.error('❌ Token refresh failed:', error)
      return false
    } finally {
      this.tokenRefreshState.isRefreshing = false
      this.tokenRefreshState.refreshPromise = null
    }
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

        // Notify components that token was refreshed
        this.notifyTokenRefreshed()

        return true
      }

      console.warn('⚠️ Token refresh returned no session')
      return false
    } catch (error) {
      console.error('❌ Token refresh exception:', error)
      return false
    }
  }

  // Notify components that token was refreshed
  private static notifyTokenRefreshed() {
    if (typeof window !== 'undefined') {
      // Dispatch a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('auth-token-refreshed', {
        detail: { timestamp: Date.now() }
      }))

      console.log('📢 Notified components of token refresh')
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
    // FIRST: Always check and refresh token proactively before making the call
    console.log('🔄 Checking token before API call...')
    const shouldRefresh = await this.shouldRefreshToken()
    if (shouldRefresh) {
      console.log('🔄 Token needs refresh, refreshing before API call...')
      const refreshSuccess = await this.silentTokenRefresh()
      if (!refreshSuccess) {
        console.warn('❌ Proactive token refresh failed, proceeding with API call anyway...')
      }
    }

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
  private static readonly REFRESH_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

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
      // Add a small delay to prevent rapid firing
      setTimeout(async () => {
        try {
          // Force a token check when page becomes visible
          const needsRefresh = await AuthInterceptor.shouldRefreshToken()
          if (needsRefresh) {
            console.log('🔄 Page visible and token needs refresh, refreshing immediately...')
            await AuthInterceptor.silentTokenRefresh()
          } else {
            console.log('✅ Page visible and token is still valid')
          }
        } catch (error) {
          console.error('❌ Token refresh on visibility change failed:', error)
        }
      }, 500)
    }
  }

  // Handle page focus
  private static handlePageFocus = async () => {
    console.log('🔄 Page focused, checking token...')
    // Add a small delay to prevent rapid firing
    setTimeout(async () => {
      try {
        await AuthInterceptor.proactiveTokenRefresh()
      } catch (error) {
        console.error('❌ Token refresh on focus failed:', error)
      }
    }, 500)
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
    // Only initialize if we have a session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) {
        TokenRefreshManager.initialize()
      }
    })
  }, 2000)
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

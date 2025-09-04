import { supabase } from './supabase'

export interface AuthRecoveryResult {
  success: boolean
  action: 'recovered' | 'cleared' | 'redirected' | 'failed'
  message: string
  details?: any
}

/**
 * Comprehensive auth recovery utility
 * Handles various auth error scenarios and attempts recovery
 */
export class AuthRecovery {
  
  /**
   * Check if an error is auth-related
   */
  static isAuthError(error: any): boolean {
    if (!error) return false
    
    const message = error.message || error.toString()
    const authErrorPatterns = [
      'refresh',
      'Invalid Refresh Token',
      'Refresh Token Not Found',
      'JWT expired',
      'Invalid JWT',
      'Token has expired',
      'Authentication required',
      'Unauthorized',
      'row-level security policy'
    ]
    
    return authErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  /**
   * Attempt to recover from auth errors
   */
  static async recoverFromAuthError(error: any): Promise<AuthRecoveryResult> {
    console.log('🔄 Attempting auth recovery for error:', error)
    
    if (!this.isAuthError(error)) {
      return {
        success: false,
        action: 'failed',
        message: 'Not an auth error',
        details: { error: error.message }
      }
    }

    // Step 1: Try to refresh the session
    try {
      console.log('🔄 Step 1: Attempting session refresh...')
      const { data, error: refreshError } = await supabase.auth.refreshSession()
      
      if (!refreshError && data.session) {
        console.log('✅ Session refreshed successfully')
        return {
          success: true,
          action: 'recovered',
          message: 'Session refreshed successfully',
          details: { session: data.session }
        }
      }
      
      console.log('❌ Session refresh failed:', refreshError)
    } catch (refreshException) {
      console.log('❌ Session refresh exception:', refreshException)
    }

    // Step 2: Check if we have a valid session
    try {
      console.log('🔄 Step 2: Checking current session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (!sessionError && session) {
        // Check if session is actually valid (not expired)
        const now = Math.floor(Date.now() / 1000)
        if (session.expires_at && session.expires_at > now) {
          console.log('✅ Found valid existing session')
          return {
            success: true,
            action: 'recovered',
            message: 'Valid session found',
            details: { session }
          }
        }
      }
    } catch (sessionException) {
      console.log('❌ Session check exception:', sessionException)
    }

    // Step 3: Clear corrupted auth data
    console.log('🔄 Step 3: Clearing corrupted auth data...')
    await this.clearAuthData()

    return {
      success: false,
      action: 'cleared',
      message: 'Auth data cleared, user needs to re-authenticate',
      details: { originalError: error.message }
    }
  }

  /**
   * Clear all auth-related data
   */
  static async clearAuthData(): Promise<void> {
    console.log('🧹 Clearing all auth data...')
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (
          key.startsWith('supabase.') || 
          key.includes('auth') ||
          key.includes('session') ||
          key.includes('token')
        )) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => {
        console.log('🧹 Removing localStorage key:', key)
        localStorage.removeItem(key)
      })
    }

    // Sign out locally (don't make API calls that might fail)
    try {
      await supabase.auth.signOut({ scope: 'local' })
      console.log('✅ Local sign out completed')
    } catch (signOutError) {
      console.warn('⚠️ Local sign out error (non-critical):', signOutError)
    }
  }

  /**
   * Force redirect to login with cleanup
   */
  static async forceRedirectToLogin(message?: string): Promise<void> {
    console.log('🔄 Force redirecting to login...')
    
    // Clear auth data first
    await this.clearAuthData()
    
    // Show message if provided
    if (message && typeof window !== 'undefined') {
      // Store message for login page to display
      sessionStorage.setItem('auth_redirect_message', message)
    }
    
    // Redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }

  /**
   * Validate current session and recover if needed
   */
  static async validateAndRecover(): Promise<AuthRecoveryResult> {
    try {
      console.log('🔍 Validating current session...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.log('❌ Session validation error:', error)
        return await this.recoverFromAuthError(error)
      }
      
      if (!session) {
        console.log('ℹ️ No active session')
        return {
          success: false,
          action: 'cleared',
          message: 'No active session',
          details: { session: null }
        }
      }
      
      // Check if session is expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        console.log('⏰ Session expired, attempting refresh...')
        return await this.recoverFromAuthError(new Error('Session expired'))
      }
      
      console.log('✅ Session is valid')
      return {
        success: true,
        action: 'recovered',
        message: 'Session is valid',
        details: { session }
      }
      
    } catch (error) {
      console.error('❌ Session validation failed:', error)
      return await this.recoverFromAuthError(error)
    }
  }

  /**
   * Get auth redirect message from sessionStorage
   */
  static getRedirectMessage(): string | null {
    if (typeof window !== 'undefined') {
      const message = sessionStorage.getItem('auth_redirect_message')
      if (message) {
        sessionStorage.removeItem('auth_redirect_message')
        return message
      }
    }
    return null
  }

  /**
   * Enhanced error handler for API calls
   */
  static async handleApiError(error: any, retryCallback?: () => Promise<any>): Promise<any> {
    console.log('🔍 Handling API error:', error)
    
    if (this.isAuthError(error)) {
      const recovery = await this.recoverFromAuthError(error)
      
      if (recovery.success && retryCallback) {
        console.log('🔄 Retrying API call after recovery...')
        try {
          return await retryCallback()
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError)
          throw retryError
        }
      }
      
      if (!recovery.success) {
        await this.forceRedirectToLogin('Your session has expired. Please sign in again.')
        throw new Error('Authentication required')
      }
    }
    
    throw error
  }
}

// Convenience functions
export const isAuthError = AuthRecovery.isAuthError
export const recoverFromAuthError = AuthRecovery.recoverFromAuthError
export const clearAuthData = AuthRecovery.clearAuthData
export const forceRedirectToLogin = AuthRecovery.forceRedirectToLogin
export const validateAndRecover = AuthRecovery.validateAndRecover
export const handleApiError = AuthRecovery.handleApiError

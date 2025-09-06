import { supabase } from './supabase'

// Global auth error handler
export class AuthInterceptor {
  private static isHandlingExpiredToken = false

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

  static async handleExpiredToken(): Promise<void> {
    // Prevent multiple simultaneous token refresh attempts
    if (this.isHandlingExpiredToken) {
      return
    }

    this.isHandlingExpiredToken = true

    try {
      console.warn('🧹 AuthInterceptor: Handling expired token')
      
      // Clear all auth storage
      this.clearAuthStorage()
      
      // Sign out from Supabase
      await supabase.auth.signOut()
      
      // Force redirect to login
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ AuthInterceptor: Error during token cleanup:', error)
      // Force redirect even if cleanup fails
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

  // Wrapper for Supabase operations with automatic token handling
  static async executeWithTokenHandling<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (this.isTokenExpiredError(error)) {
        await this.handleExpiredToken()
        throw new Error('Session expired. Please log in again.')
      }
      throw error
    }
  }
}

// Enhanced Supabase client wrapper
export const createAuthenticatedSupabaseCall = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  return AuthInterceptor.executeWithTokenHandling(operation)
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

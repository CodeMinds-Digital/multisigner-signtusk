'use client'

import { useEffect } from 'react'
import { clearSupabaseAuthStorage } from '@/utils/auth-recovery'

/**
 * Component that handles authentication errors on app startup
 * This component automatically clears corrupted auth storage
 */
export function AuthErrorHandler() {
  useEffect(() => {
    // Listen for unhandled promise rejections that might be auth-related
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      
      if (error && typeof error === 'object' && 'message' in error) {
        const message = error.message as string
        
        // Check for refresh token errors
        if (
          message.includes('refresh_token_not_found') ||
          message.includes('Invalid Refresh Token') ||
          message.includes('Refresh Token Not Found') ||
          message.includes('AuthApiError')
        ) {
          console.warn('🚨 Detected auth error on startup:', message)
          console.log('🧹 Automatically clearing auth storage...')
          
          clearSupabaseAuthStorage()
          
          // Prevent the error from being logged to console
          event.preventDefault()
          
          // Show user-friendly message
          console.log('✅ Auth storage cleared. Please refresh the page if you continue to see issues.')
        }
      }
    }

    // Listen for auth errors
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Also check for any existing auth errors in localStorage
    if (typeof window !== 'undefined') {
      try {
        // Check if there are any malformed auth tokens
        const authKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('supabase.')) {
            authKeys.push(key)
          }
        }

        // Try to parse auth tokens to see if they're valid
        authKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key)
            if (value) {
              JSON.parse(value)
            }
          } catch (parseError) {
            console.warn(`🚨 Malformed auth storage detected for key: ${key}`)
            console.log('🧹 Clearing corrupted auth storage...')
            clearSupabaseAuthStorage()
          }
        })
      } catch (error) {
        console.warn('Error checking auth storage:', error)
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // This component doesn't render anything
  return null
}

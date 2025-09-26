'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ComprehensiveLogout } from '@/lib/comprehensive-logout'

export interface User {
  id: string
  email: string
  role?: string
  full_name?: string
  first_name?: string
  last_name?: string
  company_name?: string
  company_domain?: string
  industry_field?: string
  employee_count?: number
  job_title?: string
  department?: string
  phone_number?: string
  account_type?: 'personal' | 'corporate'
  email_verified?: boolean
  company_verified?: boolean
  onboarding_completed?: boolean
  avatar_url?: string
  plan?: string
  subscription_status?: string
  subscription_expires_at?: string
  documents_count?: number
  storage_used_mb?: number
  monthly_documents_used?: number
  monthly_limit?: number
  is_admin?: boolean
  last_login_at?: string
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  refreshAuth: () => Promise<void>
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function SecureAuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Set user from response
      setUser(data.user)

      // Small delay to ensure cookies are properly set in browser
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect to dashboard or intended page
      const urlParams = new URLSearchParams(window.location.search)
      const redirectTo = urlParams.get('redirect') || '/dashboard'
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }, [router])

  // Sign out with comprehensive cleanup
  const signOut = useCallback(async () => {
    try {
      setLoading(true)

      // Clear user state immediately
      setUser(null)

      // Perform comprehensive logout (this will handle redirect)
      await ComprehensiveLogout.performCompleteLogout()
    } catch (err) {
      console.error('Logout error:', err)
      // Emergency logout if comprehensive logout fails
      ComprehensiveLogout.emergencyLogout()
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh authentication status
  const refreshAuth = useCallback(async () => {
    // ✅ PERFORMANCE FIX: Don't set loading during background refresh
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        // Refresh failed, user needs to log in again
        console.log('🔄 Auth refresh failed, clearing user state')
        setUser(null)
      }
    } catch (err) {
      console.error('Auth refresh error:', err)
      setUser(null)
    }
  }, [])

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // ✅ PERFORMANCE FIX: Reduce initial delay
        await new Promise(resolve => setTimeout(resolve, 50))

        // Only try to refresh if we're not on the login page
        // This prevents unnecessary 401 errors on initial load
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          // ✅ PERFORMANCE FIX: Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Auth check timeout')), 3000)
          )

          try {
            await Promise.race([refreshAuth(), timeoutPromise])
          } catch (timeoutError) {
            console.warn('Auth refresh timed out, proceeding without auth')
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Initial auth check failed:', err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    // Only run on client side to prevent hydration issues
    if (typeof window !== 'undefined') {
      checkAuth()
    } else {
      setLoading(false)
    }
  }, [refreshAuth])

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return

    // Refresh token every 10 minutes (tokens expire in 15 minutes)
    const refreshInterval = setInterval(() => {
      refreshAuth()
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(refreshInterval)
  }, [user, refreshAuth])

  // ✅ PERFORMANCE FIX: Optimized visibility and focus handlers
  useEffect(() => {
    let lastRefresh = Date.now()
    let refreshTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // ✅ Increased interval to 15 minutes to reduce tab switching loads
        const now = Date.now()
        if (now - lastRefresh > 15 * 60 * 1000) {
          // ✅ Debounce refresh to prevent rapid calls
          if (refreshTimeout) clearTimeout(refreshTimeout)
          refreshTimeout = setTimeout(() => {
            refreshAuth()
            lastRefresh = now
          }, 2000) // 2 second delay
        }
      }
    }

    const handleFocus = () => {
      if (user) {
        // ✅ Increased interval to 15 minutes to reduce tab switching loads
        const now = Date.now()
        if (now - lastRefresh > 15 * 60 * 1000) {
          // ✅ Debounce refresh to prevent rapid calls
          if (refreshTimeout) clearTimeout(refreshTimeout)
          refreshTimeout = setTimeout(() => {
            refreshAuth()
            lastRefresh = now
          }, 2000) // 2 second delay
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      if (refreshTimeout) clearTimeout(refreshTimeout)
    }
  }, [user, refreshAuth])

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    clearError,
    refreshAuth,
    setUser, // Expose setUser for manual user state updates
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setLoading(true)

      // Call logout API to clear cookies and revoke session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // Clear user state
      setUser(null)

      // Redirect to login
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      // Clear user state even if API call fails
      setUser(null)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  // Refresh authentication status
  const refreshAuth = useCallback(async () => {
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
        // Add a small delay to prevent hydration mismatch
        await new Promise(resolve => setTimeout(resolve, 100))

        // Try to refresh to check if we have valid cookies
        await refreshAuth()
      } catch (err) {
        console.error('Initial auth check failed:', err)
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

  // Handle page visibility change (refresh when user returns after being away for a while)
  useEffect(() => {
    let lastRefresh = Date.now()

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Only refresh if it's been more than 5 minutes since last refresh
        const now = Date.now()
        if (now - lastRefresh > 5 * 60 * 1000) {
          refreshAuth()
          lastRefresh = now
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, refreshAuth])

  // Handle focus events (refresh when window gains focus after being away)
  useEffect(() => {
    let lastRefresh = Date.now()

    const handleFocus = () => {
      if (user) {
        // Only refresh if it's been more than 5 minutes since last refresh
        const now = Date.now()
        if (now - lastRefresh > 5 * 60 * 1000) {
          refreshAuth()
          lastRefresh = now
        }
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, refreshAuth])

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    clearError,
    refreshAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

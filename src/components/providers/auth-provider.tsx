'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User, LoginCredentials } from '@/types/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (credentials: LoginCredentials) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
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

// Static mock profile to prevent hydration mismatches
const createMockProfile = (authUser: {
  id: string;
  email?: string;
  user_metadata?: { first_name?: string; last_name?: string; full_name?: string }
}): User => ({
  id: authUser.id,
  email: authUser.email || '',
  first_name: authUser.user_metadata?.first_name || 'Test',
  last_name: authUser.user_metadata?.last_name || 'User',
  full_name: authUser.user_metadata?.full_name || 'Test User',
  account_type: 'personal' as const,
  email_verified: true,
  created_at: '2024-01-01T00:00:00.000Z', // Static date to prevent hydration mismatch
  updated_at: '2024-01-01T00:00:00.000Z'  // Static date to prevent hydration mismatch
})

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const clearError = useCallback(() => setError(null), [])

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      if (error) throw error

      // Verify user has completed registration
      if (data.user) {
        // In development mode, skip database checks and use mock profile
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Using mock user profile for', data.user.email)

          // Use static mock profile to prevent hydration mismatches
          const mockProfile = createMockProfile(data.user)

          // Set the mock profile as the user
          setUser(mockProfile)
          router.push('/dashboard')
          return
        }

        // Production mode: Check database for user profile
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('email', data.user.email)
            .maybeSingle()

          if (!profile) {
            // User exists in auth but hasn't completed registration
            await supabase.auth.signOut()
            throw new Error('Account not found. Please sign up first.')
          }

          router.push('/dashboard')
        } catch (dbError) {
          console.error('Database error during login:', dbError)
          await supabase.auth.signOut()
          throw new Error('Database connection error. Please try again.')
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      setLoading(false)
    }
  }, [router])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)

      // Clear user state immediately
      setUser(null)

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // Clear any cached data in localStorage
      if (typeof window !== 'undefined') {
        // Clear any auth-related localStorage items
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('supabase.') || key.includes('auth'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }

      // Redirect to login page
      window.location.href = '/login'
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error

        if (session?.user) {
          // In development mode, use mock profile
          if (process.env.NODE_ENV === 'development') {
            console.log('Development mode: Creating session with mock profile for', session.user.email)

            // Use static mock profile to prevent hydration mismatches
            const mockProfile = createMockProfile(session.user)

            setUser(mockProfile)
          } else {
            // Production mode: Fetch user profile data
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle()

            if (profile) {
              setUser(profile)
            } else {
              // User exists in auth but not in users table - sign them out
              console.warn('User authenticated but no profile found, signing out')
              await supabase.auth.signOut()
              setUser(null)
            }
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        try {
          if (session?.user) {
            // In development mode, use mock profile
            if (process.env.NODE_ENV === 'development') {
              console.log('Development mode: Auth state change with mock profile for', session.user.email)

              // Use static mock profile to prevent hydration mismatches
              const mockProfile = createMockProfile(session.user)

              setUser(mockProfile)
            } else {
              // Production mode: Only allow authenticated users who have completed registration
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('email', session.user.email)
                .maybeSingle()

              if (profile) {
                setUser(profile)
              } else {
                // User exists in auth but not in users table - sign them out
                console.warn('User authenticated but no profile found, signing out')
                await supabase.auth.signOut()
                setUser(null)
              }
            }
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)
          setError(error instanceof Error ? error.message : 'An error occurred')
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

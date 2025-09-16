'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User, LoginCredentials } from '@/types/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthInterceptor, TokenRefreshManager } from '@/lib/auth-interceptor'

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (credentials: LoginCredentials, redirectTo?: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  ensureValidSession: () => Promise<boolean>
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



export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false) // Track active sign-in
  const router = useRouter()

  const clearError = useCallback(() => setError(null), [])

  // Enhanced token expiry detection using AuthInterceptor
  const isTokenExpiredError = useCallback((error: Error | { message?: string; status?: number; code?: string } | null): boolean => {
    return AuthInterceptor.isTokenExpiredError(error)
  }, [])

  // Clear auth storage function
  const clearAuthStorage = useCallback(() => {
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
        console.log('Clearing auth storage key:', key)
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
        console.log('Clearing session auth storage key:', key)
        sessionStorage.removeItem(key)
      })
    }
  }, [])

  const signIn = useCallback(async (credentials: LoginCredentials, redirectTo?: string) => {
    try {
      console.log('🔄 Auth Provider: signIn started', { email: credentials.email, redirectTo })
      setIsSigningIn(true) // Mark that we're actively signing in
      setLoading(true)
      setError(null)

      console.log('🔄 Auth Provider: Attempting Supabase signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword(credentials)
      console.log('🔄 Auth Provider: Supabase response:', { data: !!data, error: error?.message })

      // Handle refresh token errors during sign in
      if (error) {
        console.log('❌ Auth Provider: Supabase auth error:', error)
        if (isTokenExpiredError(error)) {
          console.warn('Token expired during sign in, clearing auth storage:', error.message)
          clearAuthStorage()
          // Retry the sign in after clearing storage
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword(credentials)
          if (retryError) {
            if (isTokenExpiredError(retryError)) {
              throw new Error('Authentication failed. Please try again.')
            }
            throw retryError
          }
          data.user = retryData.user
          data.session = retryData.session
        } else {
          throw error
        }
      }

      // Verify user has completed registration
      if (data.user) {
        console.log('✅ Auth Provider: Supabase auth successful, checking user profile...')
        // Fetch user profile data from user_profiles table
        try {
          console.log('🔄 Auth Provider: Fetching user profile for:', data.user.email)
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', data.user.email)
            .maybeSingle()

          console.log('🔄 Auth Provider: Profile query result:', {
            profile: !!profile,
            profileData: profile,
            error: profileError?.message,
            email: data.user.email
          })

          if (profileError) {
            console.error('❌ Auth Provider: Profile query error:', profileError)
            await supabase.auth.signOut()
            throw new Error('Database error. Please try again.')
          }

          if (!profile) {
            // User exists in auth but doesn't have a profile - create one
            console.log('⚠️ Auth Provider: No profile found, creating profile for:', data.user.email)
            try {
              const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.user_metadata?.full_name || data.user.email,
                })
                .select()
                .single()

              if (createError) {
                console.error('❌ Auth Provider: Failed to create profile:', createError)
                await supabase.auth.signOut()
                throw new Error('Failed to create user profile. Please try again.')
              }

              console.log('✅ Auth Provider: Profile created successfully:', newProfile)
              setUser(newProfile)
            } catch (createError) {
              console.error('❌ Auth Provider: Profile creation error:', createError)
              await supabase.auth.signOut()
              throw new Error('Failed to create user profile. Please try again.')
            }
          } else {
            // Set the existing profile data
            console.log('✅ Auth Provider: Profile found, setting user')
            setUser(profile)
          }

          // Set the real profile data
          console.log('✅ Auth Provider: Profile found, setting user and redirecting')
          console.log('✅ Auth Provider: Profile data:', profile)
          setUser(profile)

          // Redirect to the intended destination or default to dashboard
          const destination = redirectTo || '/dashboard'
          console.log('🔄 Auth Provider: Redirecting to:', destination)

          // Use router.push for client-side navigation
          console.log('🔄 Auth Provider: Calling router.push with:', destination)
          try {
            router.push(destination)
            console.log('🔄 Auth Provider: router.push called successfully')
          } catch (error) {
            console.error('❌ Auth Provider: router.push error:', error)
            // Fallback to window.location.href
            console.log('🔄 Auth Provider: Falling back to window.location.href')
            window.location.href = destination
          }
          console.log('🔄 Auth Provider: Navigation completed, exiting signIn function')
        } catch (dbError) {
          console.error('❌ Auth Provider: Database error during login:', dbError)
          await supabase.auth.signOut()
          throw new Error('Database connection error. Please try again.')
        }
      }
    } catch (error) {
      console.error('❌ Auth Provider: Final error in signIn:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      console.log('🔄 Auth Provider: signIn finally block - clearing loading states')
      setIsSigningIn(false) // Clear the signing in flag
      setLoading(false)
    }
  }, [router, clearAuthStorage, isTokenExpiredError])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)

      // Clear user state immediately
      setUser(null)

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('Sign out error (non-critical):', error)
      }

      // Clear auth storage
      clearAuthStorage()

      // Redirect to login page
      try {
        router.push('/login')
      } catch (error) {
        console.error('Sign out router.push error:', error)
        window.location.href = '/login'
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [clearAuthStorage, router])

  // Ensure valid session before making API calls
  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔄 Ensuring valid session...')

      // Check if we have a user
      if (!user) {
        console.log('❌ No user found')
        return false
      }

      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Session check error:', error)
        return false
      }

      if (!session) {
        console.log('❌ No session found')
        return false
      }

      // Check if token needs refresh
      const expiryTime = new Date(session.expires_at! * 1000).getTime()
      const currentTime = Date.now()
      const timeUntilExpiry = expiryTime - currentTime

      // If token expires within 5 minutes, refresh it
      if (timeUntilExpiry <= 5 * 60 * 1000) {
        console.log('🔄 Token expires soon, refreshing...')
        const { data, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !data.session) {
          console.error('❌ Token refresh failed:', refreshError)
          return false
        }

        console.log('✅ Token refreshed successfully')
      }

      return true
    } catch (error) {
      console.error('❌ Error ensuring valid session:', error)
      return false
    }
  }, [user])

  // Clear expired session and redirect to login
  const handleExpiredSession = useCallback((reason: string) => {
    console.warn('🧹 Session expired:', reason)
    setUser(null)
    setError(null)
    setLoading(false)

    // Use the global auth interceptor for consistent handling
    AuthInterceptor.handleExpiredToken()
  }, [])

  useEffect(() => {
    // Initialize token refresh manager
    TokenRefreshManager.initialize()

    // Get initial session
    const getSession = async () => {
      try {
        console.log('🔄 Auth Provider: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        // Handle any session errors (including expired tokens)
        if (error) {
          console.error('❌ Auth Provider: Session error:', error)
          if (isTokenExpiredError(error)) {
            handleExpiredSession(`Session error: ${error.message}`)
            return
          }
          throw error
        }

        console.log('🔍 Auth Provider: Session check result:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email
        })

        if (session?.user) {
          // Fetch user profile data from user_profiles table
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle()

          if (profile) {
            setUser(profile)
          } else {
            // User exists in auth but doesn't have a profile - create one
            console.log('⚠️ Auth Provider: No profile found on session load, creating profile for:', session.user.email)
            try {
              const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || session.user.email,
                })
                .select()
                .single()

              if (createError) {
                console.error('❌ Auth Provider: Failed to create profile on session load:', createError)
                await supabase.auth.signOut()
                setUser(null)
              } else {
                console.log('✅ Auth Provider: Profile created on session load:', newProfile)
                setUser(newProfile)
              }
            } catch (createError) {
              console.error('❌ Auth Provider: Profile creation error on session load:', createError)
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
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state change:', event, session ? 'session exists' : 'no session')

        // Skip processing during active sign-in to avoid race conditions
        if (isSigningIn && event === 'SIGNED_IN') {
          console.log('🔄 Skipping auth state change during active sign-in')
          return
        }

        // Handle auth errors (like refresh token issues)
        if (event === 'TOKEN_REFRESHED' && !session) {
          handleExpiredSession('Token refresh failed')
          return
        }

        // Handle SIGNED_OUT event
        if (event === 'SIGNED_OUT') {
          console.log('🔄 User signed out, clearing state')
          setUser(null)
          setError(null)
          setLoading(false)
          return
        }

        try {
          if (session?.user) {
            // Fetch user profile data from user_profiles table
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle()

            if (profile) {
              setUser(profile)
            } else {
              // User exists in auth but doesn't have a profile - create one
              console.log('⚠️ Auth Provider: No profile found in auth state change, creating profile for:', session.user.email)
              try {
                const { data: newProfile, error: createError } = await supabase
                  .from('user_profiles')
                  .insert({
                    id: session.user.id,
                    email: session.user.email,
                    full_name: session.user.user_metadata?.full_name || session.user.email,
                  })
                  .select()
                  .single()

                if (createError) {
                  console.error('❌ Auth Provider: Failed to create profile in auth state change:', createError)
                  await supabase.auth.signOut()
                  setUser(null)
                } else {
                  console.log('✅ Auth Provider: Profile created in auth state change:', newProfile)
                  setUser(newProfile)
                }
              } catch (createError) {
                console.error('❌ Auth Provider: Profile creation error in auth state change:', createError)
                await supabase.auth.signOut()
                setUser(null)
              }
            }
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Auth state change error:', error)

          // Check if it's a token expiry error
          if (isTokenExpiredError(error as Error)) {
            handleExpiredSession(`Auth state change error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          } else {
            setError(error instanceof Error ? error.message : 'An error occurred')
          }
        } finally {
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      TokenRefreshManager.cleanup()
    }
  }, [isSigningIn, clearAuthStorage, router, handleExpiredSession, isTokenExpiredError])

  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    clearError,
    ensureValidSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

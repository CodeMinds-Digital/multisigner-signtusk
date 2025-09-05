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
  signIn: (credentials: LoginCredentials, redirectTo?: string) => Promise<void>
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



export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false) // Track active sign-in
  const router = useRouter()

  const clearError = useCallback(() => setError(null), [])

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
        if (error.message.includes('refresh_token_not_found') ||
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('AuthApiError')) {
          console.warn('Refresh token error during sign in, clearing auth storage:', error.message)
          clearAuthStorage()
          // Retry the sign in after clearing storage
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword(credentials)
          if (retryError) throw retryError
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
      setIsSigningIn(false) // Clear the signing in flag
      setLoading(false)
    }
  }, [router, clearAuthStorage])

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

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        console.log('🔄 Auth Provider: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()

        // Handle refresh token errors
        if (error) {
          console.error('❌ Auth Provider: Session error:', error)
          if (error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found') ||
            error.message.includes('AuthApiError')) {
            console.warn('🧹 Refresh token error detected, clearing auth storage:', error.message)
            clearAuthStorage()
            setUser(null)
            setLoading(false)
            // Don't redirect here, let the user stay on current page
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
          console.warn('Token refresh failed, clearing auth storage')
          clearAuthStorage()
          setUser(null)
          setLoading(false)
          window.location.href = '/login'
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

          // Check if it's a refresh token error
          if (error instanceof Error && (
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found') ||
            error.message.includes('AuthApiError')
          )) {
            console.warn('Refresh token error in auth state change, clearing storage')
            clearAuthStorage()
            setUser(null)
            window.location.href = '/login'
          } else {
            setError(error instanceof Error ? error.message : 'An error occurred')
          }
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [isSigningIn, clearAuthStorage, router])

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

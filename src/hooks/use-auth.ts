'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User, LoginCredentials, SignUpData, CorporateValidationResult } from '@/types/auth'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const clearError = useCallback(() => setError(null), [])

  // Function to clear authentication storage
  const clearAuthStorage = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Clear Supabase auth storage
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.includes('auth-token'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => {
        console.log('Clearing auth storage key:', key)
        localStorage.removeItem(key)
      })

      // Also clear sessionStorage
      const sessionKeysToRemove = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.includes('auth-token'))) {
          sessionKeysToRemove.push(key)
        }
      }
      sessionKeysToRemove.forEach(key => {
        console.log('Clearing session auth storage key:', key)
        sessionStorage.removeItem(key)
      })
    }
  }, [])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        // Handle refresh token errors
        if (error) {
          if (error.message.includes('refresh_token_not_found') ||
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found')) {
            console.warn('Refresh token error detected, clearing auth storage:', error.message)
            clearAuthStorage()
            setUser(null)
            setLoading(false)
            return
          }
          throw error
        }

        if (session?.user) {
          // Fetch user profile data - only allow login if user exists in user_profiles table
          // Force fresh data by bypassing cache
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
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
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error getting session:', error)
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

        // Handle auth errors (like refresh token issues)
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, clearing auth storage')
          clearAuthStorage()
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          // Only allow authenticated users who have completed registration
          // Force fresh data by bypassing cache
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
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
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (credentials: LoginCredentials) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword(credentials)

      // Handle refresh token errors during sign in
      if (error) {
        if (error.message.includes('refresh_token_not_found') ||
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found')) {
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
        // Force fresh data by bypassing cache
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', data.user.email)
          .maybeSingle()

        if (!profile) {
          // In development, try to create a basic profile for testing
          if (process.env.NODE_ENV === 'development') {
            console.log('Creating basic profile for development testing...')
            try {
              const { error: createError } = await supabase
                .from('user_profiles')
                .insert({
                  email: data.user.email,
                  first_name: 'Test',
                  last_name: 'User',
                  account_type: 'Personal',
                  email_verified: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single()

              if (createError) {
                console.error('Failed to create profile:', createError)
                await supabase.auth.signOut()
                throw new Error('Account not found. Please sign up first.')
              }

              console.log('Profile created successfully for testing')
              // Continue with login using the newly created profile
            } catch (createProfileError) {
              console.error('Error creating profile:', createProfileError)
              await supabase.auth.signOut()
              throw new Error('Account not found. Please sign up first.')
            }
          } else {
            // User exists in auth but hasn't completed registration
            await supabase.auth.signOut()
            throw new Error('Account not found. Please sign up first.')
          }
        }

        router.push('/dashboard')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      setLoading(true)
      setError(null)

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) throw authError

      if (authData.user) {
        // User profile will be created automatically by the database trigger
        router.push('/verify-email')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
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

      router.push('/login')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/reset-password`,
      })

      if (error) throw error
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Corporate email validation function
  const validateCorporateSignup = async (
    email: string,
    companyName: string,
    firstName: string,
    lastName: string
  ): Promise<CorporateValidationResult> => {
    try {
      const { data, error } = await supabase.rpc('validate_corporate_signup', {
        email_address: email,
        company_name_input: companyName,
        first_name_input: firstName,
        last_name_input: lastName
      })

      if (error) {
        console.error('Corporate validation error:', error)
        return {
          valid: false,
          errors: ['Validation service unavailable. Please try again.'],
          domain: email.split('@')[1] || '',
          is_corporate_domain: false
        }
      }

      return data as CorporateValidationResult
    } catch (error) {
      console.error('Corporate validation error:', error)
      return {
        valid: false,
        errors: ['Validation service unavailable. Please try again.'],
        domain: email.split('@')[1] || '',
        is_corporate_domain: false
      }
    }
  }

  // Update user corporate profile
  const updateCorporateProfile = async (
    userId: string,
    profileData: {
      companyName: string
      industryField?: string
      employeeCount?: number
      jobTitle?: string
      department?: string
      phoneNumber?: string
    }
  ) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('update_user_corporate_profile', {
        user_id: userId,
        company_name_input: profileData.companyName,
        industry_field_input: profileData.industryField || null,
        employee_count_input: profileData.employeeCount || null,
        job_title_input: profileData.jobTitle || null,
        department_input: profileData.department || null,
        phone_number_input: profileData.phoneNumber || null
      })

      if (error) throw error

      // Refresh user data
      if (user) {
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (updatedProfile) {
          setUser(updatedProfile)
        }
      }

      return data
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Check if user has completed onboarding
  const isOnboardingComplete = (userData: User | null): boolean => {
    if (!userData) return false

    // Basic required fields
    if (!userData.first_name || !userData.last_name || !userData.email) {
      return false
    }

    // Corporate-specific requirements
    if (userData.account_type === 'corporate') {
      return !!(
        userData.company_name &&
        userData.company_domain &&
        userData.email_verified
      )
    }

    // Personal account requirements
    return !!userData.email_verified
  }

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
    validateCorporateSignup,
    updateCorporateProfile,
    isOnboardingComplete,
  }
}

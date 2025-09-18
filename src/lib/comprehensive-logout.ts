// Comprehensive logout utility to clear all user data and caches
import { supabase } from './supabase'

export class ComprehensiveLogout {
  /**
   * Clear all user-related data from browser storage
   */
  static clearAllBrowserStorage(): void {
    if (typeof window === 'undefined') return

    console.log('🧹 Starting comprehensive browser storage cleanup...')

    // Clear localStorage
    const localKeysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && this.shouldClearKey(key)) {
        localKeysToRemove.push(key)
      }
    }

    localKeysToRemove.forEach(key => {
      console.log('🗑️ Removing localStorage key:', key)
      localStorage.removeItem(key)
    })

    // Clear sessionStorage
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && this.shouldClearKey(key)) {
        sessionKeysToRemove.push(key)
      }
    }

    sessionKeysToRemove.forEach(key => {
      console.log('🗑️ Removing sessionStorage key:', key)
      sessionStorage.removeItem(key)
    })

    console.log(`✅ Cleared ${localKeysToRemove.length} localStorage and ${sessionKeysToRemove.length} sessionStorage keys`)
  }

  /**
   * Determine if a storage key should be cleared during logout
   */
  private static shouldClearKey(key: string): boolean {
    const clearPatterns = [
      'supabase.',
      'auth',
      'token',
      'session',
      'signtusk_cache_',
      'signtusk_sync_status',
      'signtusk_offline_queue',
      'user_',
      'dashboard_',
      'documents_',
      'notifications_',
      'sb-'
    ]

    return clearPatterns.some(pattern => key.includes(pattern))
  }

  /**
   * Clear all in-memory caches
   */
  static clearInMemoryCaches(): void {
    console.log('🧹 Clearing in-memory caches...')

    // Clear any global cache objects if they exist
    if (typeof window !== 'undefined') {
      // Clear any window-level cache objects
      const windowAny = window as any
      if (windowAny.signTuskCache) {
        windowAny.signTuskCache = null
      }
      if (windowAny.userDataCache) {
        windowAny.userDataCache = null
      }
    }

    console.log('✅ In-memory caches cleared')
  }

  /**
   * Force clear all cookies (client-side accessible ones)
   */
  static clearClientCookies(): void {
    if (typeof document === 'undefined') return

    console.log('🧹 Clearing client-side cookies...')

    // Get all cookies
    const cookies = document.cookie.split(';')

    cookies.forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      
      // Clear auth-related cookies
      if (this.shouldClearCookie(name)) {
        console.log('🗑️ Clearing cookie:', name)
        // Clear for current domain
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        // Clear for parent domain
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
        // Clear for root domain
        const rootDomain = window.location.hostname.split('.').slice(-2).join('.')
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${rootDomain};`
      }
    })

    console.log('✅ Client-side cookies cleared')
  }

  /**
   * Determine if a cookie should be cleared during logout
   */
  private static shouldClearCookie(name: string): boolean {
    const clearPatterns = [
      'auth',
      'token',
      'session',
      'supabase',
      'sb-',
      'signtusk'
    ]

    return clearPatterns.some(pattern => name.toLowerCase().includes(pattern.toLowerCase()))
  }

  /**
   * Call logout API to clear server-side session
   */
  static async callLogoutAPI(): Promise<void> {
    try {
      console.log('🔄 Calling logout API...')
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        console.log('✅ Logout API call successful')
      } else {
        console.warn('⚠️ Logout API call failed, but continuing with client cleanup')
      }
    } catch (error) {
      console.warn('⚠️ Logout API error (non-critical):', error)
    }
  }

  /**
   * Sign out from Supabase
   */
  static async signOutFromSupabase(): Promise<void> {
    try {
      console.log('🔄 Signing out from Supabase...')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.warn('⚠️ Supabase signOut error (non-critical):', error)
      } else {
        console.log('✅ Supabase signOut successful')
      }
    } catch (error) {
      console.warn('⚠️ Supabase signOut error (non-critical):', error)
    }
  }

  /**
   * Perform complete logout with all cleanup steps
   */
  static async performCompleteLogout(): Promise<void> {
    console.log('🚀 Starting comprehensive logout process...')

    try {
      // Step 1: Call logout API first
      await this.callLogoutAPI()

      // Step 2: Sign out from Supabase
      await this.signOutFromSupabase()

      // Step 3: Clear all browser storage
      this.clearAllBrowserStorage()

      // Step 4: Clear in-memory caches
      this.clearInMemoryCaches()

      // Step 5: Clear client-side cookies
      this.clearClientCookies()

      console.log('✅ Comprehensive logout completed successfully')

      // Step 6: Force page reload to ensure clean state
      if (typeof window !== 'undefined') {
        console.log('🔄 Forcing page reload for clean state...')
        window.location.href = '/login'
      }

    } catch (error) {
      console.error('❌ Error during comprehensive logout:', error)
      
      // Even if there are errors, try to redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  /**
   * Quick logout for emergency situations
   */
  static emergencyLogout(): void {
    console.log('🚨 Emergency logout initiated...')
    
    // Clear everything we can synchronously
    this.clearAllBrowserStorage()
    this.clearInMemoryCaches()
    this.clearClientCookies()
    
    // Force redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }
}

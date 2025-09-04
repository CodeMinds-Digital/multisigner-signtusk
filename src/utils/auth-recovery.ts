/**
 * Authentication Recovery Utilities
 * 
 * These functions help recover from authentication issues like
 * invalid refresh tokens, corrupted auth storage, etc.
 */

/**
 * Clear all Supabase authentication storage
 * This will force a fresh authentication state
 */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === 'undefined') {
    console.warn('clearSupabaseAuthStorage can only be called in browser environment')
    return
  }

  console.log('🧹 Clearing Supabase authentication storage...')

  // Clear localStorage
  const localKeysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (
      key.startsWith('supabase.') || 
      key.includes('auth-token') ||
      key.includes('sb-') ||
      key.includes('auth.token')
    )) {
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
    if (key && (
      key.startsWith('supabase.') || 
      key.includes('auth-token') ||
      key.includes('sb-') ||
      key.includes('auth.token')
    )) {
      sessionKeysToRemove.push(key)
    }
  }

  sessionKeysToRemove.forEach(key => {
    console.log('🗑️ Removing sessionStorage key:', key)
    sessionStorage.removeItem(key)
  })

  console.log(`✅ Cleared ${localKeysToRemove.length} localStorage and ${sessionKeysToRemove.length} sessionStorage auth keys`)
  console.log('🔄 Please refresh the page to complete the auth reset')
}

/**
 * Diagnose authentication storage issues
 */
export function diagnoseAuthStorage(): void {
  if (typeof window === 'undefined') {
    console.warn('diagnoseAuthStorage can only be called in browser environment')
    return
  }

  console.log('🔍 Diagnosing authentication storage...')

  // Check localStorage
  const localAuthKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (
      key.startsWith('supabase.') || 
      key.includes('auth-token') ||
      key.includes('sb-') ||
      key.includes('auth.token')
    )) {
      localAuthKeys.push(key)
    }
  }

  // Check sessionStorage
  const sessionAuthKeys: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key && (
      key.startsWith('supabase.') || 
      key.includes('auth-token') ||
      key.includes('sb-') ||
      key.includes('auth.token')
    )) {
      sessionAuthKeys.push(key)
    }
  }

  console.log('📊 Authentication Storage Diagnosis:')
  console.log(`   localStorage auth keys: ${localAuthKeys.length}`)
  localAuthKeys.forEach(key => {
    const value = localStorage.getItem(key)
    console.log(`     ${key}: ${value ? `${value.substring(0, 50)}...` : 'null'}`)
  })

  console.log(`   sessionStorage auth keys: ${sessionAuthKeys.length}`)
  sessionAuthKeys.forEach(key => {
    const value = sessionStorage.getItem(key)
    console.log(`     ${key}: ${value ? `${value.substring(0, 50)}...` : 'null'}`)
  })

  if (localAuthKeys.length === 0 && sessionAuthKeys.length === 0) {
    console.log('✅ No authentication storage found - this is normal for logged out users')
  } else {
    console.log('💡 To clear all auth storage, run: clearSupabaseAuthStorage()')
  }
}

/**
 * Force refresh the current page after clearing auth storage
 */
export function forceAuthReset(): void {
  clearSupabaseAuthStorage()
  
  if (typeof window !== 'undefined') {
    console.log('🔄 Forcing page refresh to complete auth reset...')
    window.location.reload()
  }
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).clearSupabaseAuthStorage = clearSupabaseAuthStorage;
  (window as any).diagnoseAuthStorage = diagnoseAuthStorage;
  (window as any).forceAuthReset = forceAuthReset;
  
  console.log('🛠️ Auth recovery functions available globally:')
  console.log('   - clearSupabaseAuthStorage()')
  console.log('   - diagnoseAuthStorage()')
  console.log('   - forceAuthReset()')
}

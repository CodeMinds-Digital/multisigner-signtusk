'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'

/**
 * Hook that listens for token refresh events and triggers a callback
 * Use this in components that need to reload data after token refresh
 */
export function useAuthRefresh(onRefresh: () => void, dependencies: any[] = []) {
  const onRefreshRef = useRef(onRefresh)
  const { ensureValidSession } = useAuth()

  // Update the ref when the callback changes
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const handleTokenRefresh = async (event: CustomEvent) => {
      console.log('🔄 Component received token refresh notification, ensuring session and reloading data...')

      // Ensure session is valid before calling refresh
      const isValid = await ensureValidSession()
      if (isValid) {
        console.log('✅ Session is valid, calling refresh function...')
        onRefreshRef.current()
      } else {
        console.warn('❌ Session is not valid, skipping refresh')
      }
    }

    // Listen for token refresh events
    window.addEventListener('auth-token-refreshed', handleTokenRefresh as EventListener)

    return () => {
      window.removeEventListener('auth-token-refreshed', handleTokenRefresh as EventListener)
    }
  }, [...dependencies, ensureValidSession])
}

/**
 * Hook that provides a refresh trigger that can be used to force data reload
 * Returns a function that can be called to trigger refresh
 */
export function useRefreshTrigger() {
  const refreshCallbacks = useRef<Set<() => void>>(new Set())

  const addRefreshCallback = (callback: () => void) => {
    refreshCallbacks.current.add(callback)
    return () => refreshCallbacks.current.delete(callback)
  }

  const triggerRefresh = () => {
    console.log('🔄 Triggering manual refresh for all registered callbacks')
    refreshCallbacks.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in refresh callback:', error)
      }
    })
  }

  return { addRefreshCallback, triggerRefresh }
}

/**
 * Hook that wraps a data loading function with session validation
 * Ensures session is valid before calling the function
 */
export function useValidatedDataLoader<T>(
  dataLoader: () => Promise<T>,
  dependencies: any[] = []
): () => Promise<T> {
  const { ensureValidSession } = useAuth()

  return async (): Promise<T> => {
    console.log('🔄 Validating session before loading data...')

    const isValid = await ensureValidSession()
    if (!isValid) {
      throw new Error('Session is not valid')
    }

    console.log('✅ Session is valid, loading data...')
    return await dataLoader()
  }
}

'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'

/**
 * Hook that listens for token refresh events and triggers a callback
 * Use this in components that need to reload data after token refresh
 */
export function useAuthRefresh(onRefresh: () => void, dependencies: any[] = []) {
  const onRefreshRef = useRef(onRefresh)
  const { refreshAuth } = useAuth()

  // Update the ref when the callback changes
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const handleTokenRefresh = async (event: Event) => {
      console.log('🔄 Component received token refresh notification, refreshing auth and reloading data...')

      try {
        // Refresh auth before calling refresh
        await refreshAuth()
        console.log('✅ Auth refreshed successfully, calling refresh function...')
        onRefreshRef.current()
      } catch (error) {
        console.warn('❌ Auth refresh failed, skipping refresh:', error)
      }
    }

    // Listen for token refresh events
    window.addEventListener('auth-token-refreshed', handleTokenRefresh)

    return () => {
      window.removeEventListener('auth-token-refreshed', handleTokenRefresh)
    }
  }, [...dependencies, refreshAuth])
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
  const { refreshAuth } = useAuth()

  return async (): Promise<T> => {
    console.log('🔄 Refreshing auth before loading data...')

    try {
      await refreshAuth()
      console.log('✅ Auth refreshed successfully, loading data...')
      return await dataLoader()
    } catch (error) {
      console.error('❌ Auth refresh failed:', error)
      throw new Error('Session is not valid')
    }
  }
}

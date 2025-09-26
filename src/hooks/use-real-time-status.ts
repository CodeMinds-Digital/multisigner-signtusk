'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { RealTimeStatusService, StatusUpdate } from '@/lib/real-time-status-service'

/**
 * Hook for subscribing to real-time status updates for a specific request
 */
export function useRealTimeStatus(
  requestId: string | null,
  onUpdate: (update: StatusUpdate) => void
) {
  const onUpdateRef = useRef(onUpdate)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Update the ref when callback changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    if (!requestId) return

    console.log('🔄 Setting up real-time status subscription for request:', requestId)

    // Subscribe to status updates
    const unsubscribe = RealTimeStatusService.subscribeToRequest(
      requestId,
      (update) => {
        console.log('📡 Received real-time status update:', update)
        onUpdateRef.current(update)
      }
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      console.log('🔄 Cleaning up real-time status subscription for request:', requestId)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [requestId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])
}

/**
 * Hook for subscribing to all signing requests updates
 */
export function useRealTimeAllRequests(
  onUpdate: (update: StatusUpdate) => void
) {
  const onUpdateRef = useRef(onUpdate)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Update the ref when callback changes
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  useEffect(() => {
    console.log('🔄 Setting up real-time subscription for all requests')

    // Subscribe to all requests updates
    const unsubscribe = RealTimeStatusService.subscribeToAllRequests(
      (update) => {
        console.log('📡 Received real-time update for all requests:', update)
        onUpdateRef.current(update)
      }
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      console.log('🔄 Cleaning up real-time subscription for all requests')
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])
}

/**
 * Hook for optimistic updates with real-time sync
 */
export function useOptimisticStatus<T>(
  initialData: T,
  requestId: string | null,
  updateFunction: (data: T, update: StatusUpdate) => T
) {
  const [data, setData] = useState<T>(initialData)
  const optimisticUpdatesRef = useRef<Map<string, any>>(new Map())

  // Apply optimistic update
  const applyOptimisticUpdate = useCallback((updateId: string, update: Partial<T>) => {
    optimisticUpdatesRef.current.set(updateId, update)
    setData(prev => ({ ...prev, ...update }))
  }, [])

  // Confirm optimistic update (remove from pending)
  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    optimisticUpdatesRef.current.delete(updateId)
  }, [])

  // Revert optimistic update
  const revertOptimisticUpdate = useCallback((updateId: string) => {
    if (optimisticUpdatesRef.current.has(updateId)) {
      optimisticUpdatesRef.current.delete(updateId)
      // Recalculate data without this update
      let newData = initialData
      optimisticUpdatesRef.current.forEach(update => {
        newData = { ...newData, ...update }
      })
      setData(newData)
    }
  }, [initialData])

  // Handle real-time updates
  const handleRealTimeUpdate = useCallback((update: StatusUpdate) => {
    setData(prev => updateFunction(prev, update))

    // Clear any related optimistic updates since we got real data
    optimisticUpdatesRef.current.clear()
  }, [updateFunction])

  // Subscribe to real-time updates
  useRealTimeStatus(requestId, handleRealTimeUpdate)

  return {
    data,
    setData,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate
  }
}

/**
 * Hook for managing request list with real-time updates
 */
export function useRealTimeRequestList<T extends { id: string }>(
  initialRequests: T[],
  updateRequest: (requests: T[], update: StatusUpdate) => T[]
) {
  const [requests, setRequests] = useState<T[]>(initialRequests)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Handle real-time updates for all requests
  const handleUpdate = useCallback((update: StatusUpdate) => {
    setRequests(prev => {
      const updated = updateRequest(prev, update)
      setLastUpdate(new Date())
      return updated
    })
  }, [updateRequest])

  useRealTimeAllRequests(handleUpdate)

  // Manual refresh function
  const refresh = useCallback(() => {
    setLastUpdate(new Date())
  }, [])

  return {
    requests,
    setRequests,
    lastUpdate,
    refresh
  }
}

/**
 * Hook for debounced status updates to prevent excessive API calls
 */
export function useDebouncedStatusUpdate(
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Map<string, StatusUpdate>>(new Map())

  const scheduleUpdate = useCallback((update: StatusUpdate) => {
    // Store the latest update for this request
    pendingUpdatesRef.current.set(update.requestId, update)

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Schedule batch update
    timeoutRef.current = setTimeout(() => {
      const updates = Array.from(pendingUpdatesRef.current.values())
      pendingUpdatesRef.current.clear()

      // Process all pending updates
      updates.forEach(update => {
        console.log('📡 Processing debounced status update:', update)
        // Here you would typically update your state or make API calls
      })
    }, delay)
  }, [delay])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { scheduleUpdate }
}

/**
 * Hook for connection status monitoring
 */
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastConnected, setLastConnected] = useState<Date>(new Date())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastConnected(new Date())
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, lastConnected }
}

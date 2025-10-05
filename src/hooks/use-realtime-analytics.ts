'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ActiveViewer {
  sessionId: string
  email?: string
  joinedAt: number
  lastActivity: number
  currentPage?: number
  duration: number
}

export interface RealtimeMetrics {
  activeViewers: number
  totalViews: number
  viewsToday: number
  viewsThisWeek: number
  viewsThisMonth: number
  peakConcurrentViewers: number
  avgViewDuration: number
}

export interface RealtimeAnalyticsData {
  metrics: RealtimeMetrics
  activeViewers: ActiveViewer[]
}

export function useRealtimeAnalytics(linkId: string, refreshInterval: number = 5000) {
  const [data, setData] = useState<RealtimeAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/send/realtime/${linkId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setData({
        metrics: result.metrics,
        activeViewers: result.activeViewers
      })
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }, [linkId])

  useEffect(() => {
    // Initial fetch
    fetchAnalytics()

    // Set up polling
    intervalRef.current = setInterval(fetchAnalytics, refreshInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchAnalytics, refreshInterval])

  const refresh = useCallback(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    loading,
    error,
    refresh
  }
}

export function useViewerTracking(
  linkId: string,
  sessionId: string,
  fingerprint: string,
  email?: string
) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentPageRef = useRef<number>(1)
  const joinTimeRef = useRef<number>(Date.now())

  const sendHeartbeat = useCallback(async () => {
    try {
      await fetch(`/api/send/realtime/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          sessionId,
          currentPage: currentPageRef.current
        })
      })
    } catch (error) {
      console.error('Failed to send heartbeat:', error)
    }
  }, [linkId, sessionId])

  const join = useCallback(async () => {
    try {
      await fetch(`/api/send/realtime/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          sessionId,
          fingerprint,
          email,
          currentPage: currentPageRef.current
        })
      })

      // Start heartbeat (every 30 seconds)
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000)
    } catch (error) {
      console.error('Failed to join:', error)
    }
  }, [linkId, sessionId, fingerprint, email, sendHeartbeat])

  const leave = useCallback(async () => {
    try {
      const duration = Math.floor((Date.now() - joinTimeRef.current) / 1000)

      await fetch(`/api/send/realtime/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leave',
          sessionId,
          duration
        })
      })

      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    } catch (error) {
      console.error('Failed to leave:', error)
    }
  }, [linkId, sessionId])

  const updatePage = useCallback((page: number) => {
    currentPageRef.current = page
  }, [])

  useEffect(() => {
    // Join on mount
    join()

    // Leave on unmount
    return () => {
      leave()
    }
  }, [join, leave])

  return {
    updatePage
  }
}


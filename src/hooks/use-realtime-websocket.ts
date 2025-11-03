'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface ViewerJoinedEvent {
  sessionId: string
  email?: string
  fingerprint: string
  timestamp: string
}

interface ViewerLeftEvent {
  sessionId: string
  timestamp: string
}

interface PageChangedEvent {
  sessionId: string
  pageNumber: number
  timestamp: string
}

interface AnalyticsUpdatedEvent {
  documentId: string
  linkId?: string
  type: 'view' | 'page_view' | 'event'
  data: any
  timestamp: string
}

interface UseRealtimeWebSocketOptions {
  documentId: string
  linkId?: string
  enabled?: boolean
  fallbackToPolling?: boolean
  pollingInterval?: number
}

interface RealtimeWebSocketState {
  connected: boolean
  activeViewers: Map<string, ViewerJoinedEvent>
  recentEvents: AnalyticsUpdatedEvent[]
  error: string | null
}

/**
 * Hook for real-time analytics updates with WebSocket and polling fallback
 */
export function useRealtimeWebSocket({
  documentId,
  linkId,
  enabled = true,
  fallbackToPolling = true,
  pollingInterval = 5000
}: UseRealtimeWebSocketOptions) {
  const [state, setState] = useState<RealtimeWebSocketState>({
    connected: false,
    activeViewers: new Map(),
    recentEvents: [],
    error: null
  })

  const socketRef = useRef<Socket | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const supabase = createClientComponentClient()

  /**
   * Initialize WebSocket connection
   */
  const initializeWebSocket = useCallback(async () => {
    if (!enabled || socketRef.current?.connected) return

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.warn('No auth token available for WebSocket')
        if (fallbackToPolling) {
          startPolling()
        }
        return
      }

      // Create socket connection
      const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        auth: {
          token: session.access_token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      })

      socketRef.current = socket

      // Connection events
      socket.on('connect', () => {
        console.log('✅ WebSocket connected')
        setState(prev => ({ ...prev, connected: true, error: null }))
        reconnectAttemptsRef.current = 0

        // Join document room
        socket.emit('join:document', { documentId, linkId })

        // Stop polling if it was running
        stopPolling()
      })

      socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket disconnected:', reason)
        setState(prev => ({ ...prev, connected: false }))

        // Fallback to polling if disconnected
        if (fallbackToPolling && reason !== 'io client disconnect') {
          startPolling()
        }
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        reconnectAttemptsRef.current++

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setState(prev => ({ 
            ...prev, 
            connected: false,
            error: 'Failed to connect to real-time server'
          }))

          // Fallback to polling
          if (fallbackToPolling) {
            console.log('🔄 Falling back to polling')
            startPolling()
          }
        }
      })

      socket.on('error', (error: { message: string }) => {
        console.error('WebSocket error:', error)
        setState(prev => ({ ...prev, error: error.message }))
      })

      // Analytics events
      socket.on('viewer:joined', (data: ViewerJoinedEvent) => {
        setState(prev => {
          const newViewers = new Map(prev.activeViewers)
          newViewers.set(data.sessionId, data)
          return { ...prev, activeViewers: newViewers }
        })
      })

      socket.on('viewer:left', (data: ViewerLeftEvent) => {
        setState(prev => {
          const newViewers = new Map(prev.activeViewers)
          newViewers.delete(data.sessionId)
          return { ...prev, activeViewers: newViewers }
        })
      })

      socket.on('viewer:page_changed', (data: PageChangedEvent) => {
        // Update viewer's current page
        setState(prev => {
          const newViewers = new Map(prev.activeViewers)
          const viewer = newViewers.get(data.sessionId)
          if (viewer) {
            newViewers.set(data.sessionId, { ...viewer, timestamp: data.timestamp })
          }
          return { ...prev, activeViewers: newViewers }
        })
      })

      socket.on('analytics:updated', (data: AnalyticsUpdatedEvent) => {
        setState(prev => ({
          ...prev,
          recentEvents: [data, ...prev.recentEvents].slice(0, 50) // Keep last 50 events
        }))
      })

    } catch (error) {
      console.error('WebSocket initialization error:', error)
      if (fallbackToPolling) {
        startPolling()
      }
    }
  }, [documentId, linkId, enabled, fallbackToPolling, supabase])

  /**
   * Start polling fallback
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return

    console.log('🔄 Starting polling fallback')

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/send/analytics/realtime?documentId=${documentId}${linkId ? `&linkId=${linkId}` : ''}`
        )
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.success) {
            setState(prev => ({
              ...prev,
              activeViewers: new Map(
                data.activeViewers?.map((v: ViewerJoinedEvent) => [v.sessionId, v]) || []
              ),
              recentEvents: data.recentEvents || []
            }))
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Initial poll
    poll()

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, pollingInterval)
  }, [documentId, linkId, pollingInterval])

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
      console.log('⏹️  Stopped polling')
    }
  }, [])

  /**
   * Emit viewer joined event
   */
  const emitViewerJoined = useCallback((data: Omit<ViewerJoinedEvent, 'timestamp'>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('viewer:joined', {
        ...data,
        timestamp: new Date().toISOString()
      })
    }
  }, [])

  /**
   * Emit viewer left event
   */
  const emitViewerLeft = useCallback((sessionId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('viewer:left', {
        sessionId,
        timestamp: new Date().toISOString()
      })
    }
  }, [])

  /**
   * Emit page changed event
   */
  const emitPageChanged = useCallback((sessionId: string, pageNumber: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('viewer:page_changed', {
        sessionId,
        pageNumber,
        timestamp: new Date().toISOString()
      })
    }
  }, [])

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (enabled) {
      initializeWebSocket()
    }

    return () => {
      // Cleanup
      if (socketRef.current) {
        socketRef.current.emit('leave:document', { documentId })
        socketRef.current.disconnect()
        socketRef.current = null
      }
      stopPolling()
    }
  }, [documentId, enabled, initializeWebSocket, stopPolling])

  return {
    connected: state.connected,
    activeViewers: Array.from(state.activeViewers.values()),
    activeViewerCount: state.activeViewers.size,
    recentEvents: state.recentEvents,
    error: state.error,
    emitViewerJoined,
    emitViewerLeft,
    emitPageChanged
  }
}


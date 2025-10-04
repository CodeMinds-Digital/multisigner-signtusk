'use client'

/**
 * Enhanced Realtime Hooks for SignTusk
 * Provides comprehensive real-time functionality across the application
 * Works alongside existing code without breaking it
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { realtimeService } from '@/lib/realtime-service'

// ============================================================================
// 1. DASHBOARD STATS REALTIME
// ============================================================================

export interface DashboardStats {
  totalDocuments: number
  pendingSignatures: number
  completedDocuments: number
  expiredDocuments: number
  draftDocuments: number
}

/**
 * Real-time dashboard statistics
 * Eliminates polling, updates instantly when documents/requests change
 */
export function useRealtimeDashboardStats(userId: string) {
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    pendingSignatures: 0,
    completedDocuments: 0,
    expiredDocuments: 0,
    draftDocuments: 0
  })
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      // Fetch initial stats
      const { data: documents } = await supabase
        .from('documents')
        .select('status')
        .eq('user_id', userId)

      const { data: requests } = await supabase
        .from('signing_requests')
        .select('status')
        .eq('initiated_by', userId)

      if (documents) {
        setStats({
          totalDocuments: documents.length,
          draftDocuments: documents.filter((d: any) => d.status === 'draft').length,
          completedDocuments: documents.filter((d: any) => d.status === 'completed').length,
          expiredDocuments: documents.filter((d: any) => d.status === 'expired').length,
          pendingSignatures: requests?.filter((r: any) => r.status === 'pending' || r.status === 'in_progress').length || 0
        })
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Initial fetch
    fetchStats()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`dashboard_stats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('📊 Document changed, updating stats...')
          fetchStats()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signing_requests',
          filter: `initiated_by=eq.${userId}`
        },
        () => {
          console.log('📊 Signing request changed, updating stats...')
          fetchStats()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, fetchStats])

  return { stats, loading, refresh: fetchStats }
}

// ============================================================================
// 2. NOTIFICATIONS REALTIME
// ============================================================================

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  action_url?: string
  created_at: string
}

/**
 * Real-time notifications
 * Instantly shows new notifications without polling
 */
export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n: any) => !n.is_read).length)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    // Initial fetch
    fetchNotifications()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('🔔 New notification received:', payload.new)
          setNotifications(prev => [payload.new as Notification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Optional: Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            const newNotif = payload.new as Notification
            new Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/logo.png'
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          console.log('🔔 Notification updated:', payload.new)
          const newNotif = payload.new as Notification
          const oldNotif = payload.old as Notification | undefined
          setNotifications(prev =>
            prev.map(n => n.id === newNotif.id ? newNotif : n)
          )
          if (newNotif.is_read && oldNotif && !oldNotif.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, fetchNotifications])

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
  }, [])

  const markAllAsRead = useCallback(async () => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
  }, [userId])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  }
}

// ============================================================================
// 3. DOCUMENT LIST REALTIME
// ============================================================================

export interface Document {
  id: string
  title: string
  status: string
  created_at: string
  updated_at: string
  user_id: string
}

/**
 * Real-time document list
 * Automatically updates when documents are added, modified, or deleted
 */
export function useRealtimeDocuments(userId: string, statusFilter?: string) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data } = await query

      if (data) {
        setDocuments(data)
      }
      setLoading(false)
    } catch (error) {
      console.error('Error fetching documents:', error)
      setLoading(false)
    }
  }, [userId, statusFilter])

  useEffect(() => {
    // Initial fetch
    fetchDocuments()

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`documents_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Document>) => {
          console.log('📄 New document added:', payload.new)
          const newDoc = payload.new as Document
          if (!statusFilter || newDoc.status === statusFilter) {
            setDocuments(prev => [newDoc, ...prev])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Document>) => {
          console.log('📄 Document updated:', payload.new)
          const newDoc = payload.new as Document
          setDocuments(prev => {
            const updated = prev.map(d => d.id === newDoc.id ? newDoc : d)
            // Filter out if status changed and doesn't match filter
            if (statusFilter && newDoc.status !== statusFilter) {
              return updated.filter(d => d.id !== newDoc.id)
            }
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<Document>) => {
          console.log('📄 Document deleted:', payload.old)
          const oldDoc = payload.old as Document
          setDocuments(prev => prev.filter(d => d.id !== oldDoc.id))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userId, statusFilter, fetchDocuments])

  return { documents, loading, refresh: fetchDocuments }
}

// ============================================================================
// 4. PRESENCE TRACKING
// ============================================================================

export interface PresenceState {
  userId: string
  userName: string
  online_at: string
}

/**
 * Track who's currently viewing a document
 * Useful for collaborative features
 */
export function usePresence(channelName: string, userId: string, userName: string) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId
        }
      }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.values(state).flat() as PresenceState[]
        setOnlineUsers(users)
        console.log('👥 Online users:', users)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log('👋 User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log('👋 User left:', key, leftPresences)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            userName,
            online_at: new Date().toISOString()
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName, userId, userName])

  return { onlineUsers }
}

// ============================================================================
// 5. SIMPLIFIED HOOKS USING REALTIME SERVICE
// ============================================================================

/**
 * Simple hook to subscribe to any table changes
 * Uses the centralized realtime service
 */
export function useRealtimeTable(
  tableName: string,
  filter: string | null,
  userId?: string,
  onUpdate?: () => void
) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToTable(
      tableName,
      filter,
      () => {
        setIsConnected(true)
        if (onUpdate) {
          onUpdate()
        }
      },
      userId
    )

    return unsubscribe
  }, [tableName, filter, userId, onUpdate])

  return { isConnected }
}

/**
 * Hook to get realtime service status
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState(realtimeService.getStatus())

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(realtimeService.getStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return status
}

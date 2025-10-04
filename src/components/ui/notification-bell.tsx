'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/lib/notification-service'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [realtimeEnabled, setRealtimeEnabled] = useState(false)

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=10&unread_only=false', {
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      } else {
        // If authentication error, don't spam the console
        if (response.status !== 401) {
          console.error('Error fetching notifications:', response.status)
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include' // Include cookies for authentication
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_count || 0)
      } else {
        // If authentication error, don't spam the console
        if (response.status !== 401) {
          console.error('Error fetching unread count:', response.status)
        }
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  // Mark notification as read and navigate
  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        const response = await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: notification.id })
        })

        if (response.ok) {
          // Update local state
          setNotifications(prev =>
            prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
          )
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      }

      // Navigate to action URL if available
      if (notification.action_url) {
        setIsOpen(false)
        router.push(notification.action_url)
      }
    } catch (error) {
      console.error('Error handling notification click:', error)
    }
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true })
      })

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`

    return date.toLocaleDateString()
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'signature_request_received':
      case 'reminder_received':
        return '📝'
      case 'document_viewed':
      case 'document_accessed':
        return '👁️'
      case 'document_signed':
      case 'signature_request_signed':
        return '✅'
      case 'signature_request_declined':
      case 'document_declined_by_signer':
        return '❌'
      case 'all_signatures_complete':
      case 'signature_request_completed':
        return '🎉'
      case 'pdf_generated':
      case 'final_document_ready':
        return '📄'
      case 'qr_verification':
        return '🔍'
      case 'expiry_warning':
      case 'deadline_approaching':
        return '⚠️'
      case 'document_expired':
      case 'deadline_missed':
        return '⏰'
      case 'signature_request_cancelled':
        return '❌'
      case 'signer_added':
        return '➕'
      case 'signer_removed':
        return '➖'
      case 'deadline_extended':
        return '📅'
      default:
        return '📧'
    }
  }

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ✅ REALTIME: Setup real-time subscription for notifications
  useEffect(() => {
    let userId: string | null = null

    const setupRealtime = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          console.log('⏭️ No user session, skipping realtime setup')
          return
        }

        userId = session.user.id
        console.log('🔄 Setting up realtime notifications for user:', userId)

        // Subscribe to notifications table changes
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
            (payload: any) => {
              console.log('🔔 New notification received via realtime:', payload.new)

              // Add new notification to the list
              setNotifications(prev => [payload.new, ...prev])
              setUnreadCount(prev => prev + 1)

              // Optional: Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(payload.new.title, {
                  body: payload.new.message,
                  icon: '/logo.png'
                })
              }

              setRealtimeEnabled(true)
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
            (payload: any) => {
              console.log('🔔 Notification updated via realtime:', payload.new)

              // Update notification in the list
              setNotifications(prev =>
                prev.map(n => n.id === payload.new.id ? payload.new : n)
              )

              // Update unread count if read status changed
              if (payload.new.is_read && payload.old && !payload.old.is_read) {
                setUnreadCount(prev => Math.max(0, prev - 1))
              }

              setRealtimeEnabled(true)
            }
          )
          .subscribe((status: string) => {
            console.log('📡 Notification realtime subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime notifications enabled')
              setRealtimeEnabled(true)
            }
          })

        channelRef.current = channel
      } catch (error) {
        console.error('❌ Error setting up realtime notifications:', error)
      }
    }

    setupRealtime()

    return () => {
      if (channelRef.current) {
        console.log('🔄 Cleaning up realtime notification subscription')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // Initial load and polling (FALLBACK - reduced frequency since realtime is primary)
  useEffect(() => {
    // Add a small delay to ensure user is authenticated
    const timer = setTimeout(() => {
      fetchNotifications()
    }, 1000) // 1 second delay

    // ✅ FALLBACK POLLING: Only as backup when realtime fails
    // Reduced frequency since realtime handles most updates
    const interval = setInterval(() => {
      if (!realtimeEnabled) {
        // Only poll if realtime is not working
        fetchUnreadCount()
      }
    }, 60000) // Every 60 seconds (reduced from 30s)

    // Also refresh full notifications periodically as backup
    const fullRefreshInterval = setInterval(() => {
      if (!realtimeEnabled) {
        fetchNotifications()
      }
    }, 180000) // Every 3 minutes (reduced from 2m)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      clearInterval(fullRefreshInterval)
    }
  }, [realtimeEnabled])

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  // Expose refresh function globally for other components to trigger
  useEffect(() => {
    // @ts-expect-error - Adding to window for global access
    window.refreshNotifications = () => {
      fetchNotifications()
      fetchUnreadCount()
    }

    return () => {
      // @ts-expect-error - Deleting custom property from window object
      delete window.refreshNotifications
    }
  }, [])

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 opacity-100"
          style={{ backgroundColor: 'white', opacity: 1 }}
        >
          <div className="flex items-center justify-between p-2">
            <h3 className="px-2 py-1.5 text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="-mx-1 my-1 h-px bg-gray-200" />

          <ScrollArea className="h-96">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 cursor-pointer hover:bg-accent transition-colors ${!notification.is_read ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                      }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <>
              <div className="-mx-1 my-1 h-px bg-gray-200" />
              <div className="p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/notifications')
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

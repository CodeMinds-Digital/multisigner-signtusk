'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { Notification } from '@/lib/notification-service'

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

  // Initial load and polling
  useEffect(() => {
    // Add a small delay to ensure user is authenticated
    const timer = setTimeout(() => {
      fetchNotifications()
    }, 1000) // 1 second delay

    // Poll for updates more frequently for better real-time experience
    const interval = setInterval(fetchUnreadCount, 10000) // Every 10 seconds

    // Also refresh full notifications periodically
    const fullRefreshInterval = setInterval(fetchNotifications, 60000) // Every minute

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      clearInterval(fullRefreshInterval)
    }
  }, [])

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

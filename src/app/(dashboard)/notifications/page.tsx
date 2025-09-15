'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Check, CheckCheck, Trash2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter } from 'next/navigation'
import { Notification } from '@/lib/notification-service'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const router = useRouter()

  // Fetch notifications
  const fetchNotifications = async (unreadOnly = false) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notifications?limit=50&unread_only=${unreadOnly}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
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
        }
      }

      // Navigate to action URL if available
      if (notification.action_url) {
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
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return date.toLocaleDateString()
  }

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'signature_request_received':
      case 'reminder_received':
        return '📝'
      case 'document_viewed':
        return '👁️'
      case 'document_signed':
      case 'signature_request_signed':
        return '✅'
      case 'all_signatures_complete':
      case 'signature_request_completed':
        return '🎉'
      case 'pdf_generated':
        return '📄'
      case 'qr_verification':
        return '🔍'
      case 'expiry_warning':
        return '⚠️'
      case 'signature_request_cancelled':
        return '❌'
      default:
        return '📧'
    }
  }

  // Get notification type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'signature_request_received':
        return 'Signature Request'
      case 'document_viewed':
        return 'Document Viewed'
      case 'document_signed':
        return 'Document Signed'
      case 'all_signatures_complete':
        return 'All Signatures Complete'
      case 'pdf_generated':
        return 'PDF Generated'
      case 'qr_verification':
        return 'QR Verification'
      case 'expiry_warning':
        return 'Expiry Warning'
      case 'reminder_received':
        return 'Reminder'
      default:
        return 'Notification'
    }
  }

  // Filter notifications
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    fetchNotifications(filter === 'unread')
  }, [filter])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
        
        {unreadCount > 0 && (
          <Button onClick={handleMarkAllRead} variant="outline" size="sm">
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'unread')}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Notifications</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground">
                  {filter === 'unread' 
                    ? 'All caught up! You have no unread notifications.'
                    : 'When you receive notifications, they will appear here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-background border flex items-center justify-center text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                          
                          {notification.action_url && (
                            <span className="text-xs text-blue-600 hover:text-blue-800">
                              Click to view →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

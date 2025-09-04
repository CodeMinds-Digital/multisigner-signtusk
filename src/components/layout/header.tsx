'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, User, LogOut, Settings, CheckCircle, Clock, AlertTriangle, X, ChevronRight, FileText, Pen, HandCoins } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/auth-provider'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  userName?: string
  userSignature?: string
}

interface Notification {
  id: string
  type: string
  title: string
  message: string
  time: string
  status: 'read' | 'unread'
  icon: React.ReactNode
  documentUrl?: string
}

export function Header({ userName, userSignature }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const { user, signOut } = useAuth()

  // Fetch notifications from Supabase
  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        setLoading(true)

        // Try to fetch documents from documents table
        // If the table doesn't exist, we'll gracefully handle it
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) {
          // If table doesn't exist or other error, just set empty notifications
          console.warn('Notifications table not available:', error.message)
          setNotifications([])
          return
        }

        // Map the database data to notification format
        const mappedNotifications: Notification[] = data?.map(doc => {
          let notificationType, icon, title, message

          // Determine notification type and icon based on document status
          switch (doc.status) {
            case 'Waiting':
              notificationType = 'signature_request'
              title = 'Signature Request'
              icon = <FileText className="w-4 h-4 text-blue-500" />
              message = `Document "${doc.name}" is waiting for signature`
              break
            case 'Signed':
              notificationType = 'document_signed'
              title = 'Document Signed'
              icon = <CheckCircle className="w-4 h-4 text-green-500" />
              message = `Document "${doc.name}" has been signed`
              break
            case 'Expired':
              notificationType = 'document_expired'
              title = 'Document Expired'
              icon = <AlertTriangle className="w-4 h-4 text-red-500" />
              message = `Document "${doc.name}" has expired`
              break
            default:
              notificationType = 'document_update'
              title = 'Document Update'
              icon = <FileText className="w-4 h-4 text-gray-500" />
              message = `Document "${doc.name}" has been updated`
          }

          // Calculate how long ago the notification was created
          const dueDate = new Date(doc.due_date)
          const now = new Date()
          const diffTime = Math.abs(now.getTime() - dueDate.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          let timeAgo
          if (diffDays === 0) {
            timeAgo = 'Today'
          } else if (diffDays === 1) {
            timeAgo = 'Yesterday'
          } else if (diffDays <= 7) {
            timeAgo = `${diffDays} days ago`
          } else {
            timeAgo = dueDate.toLocaleDateString()
          }

          // Determine read/unread status based on due date (newer items are unread)
          const isUnread = diffDays <= 2

          return {
            id: doc.document_id || doc.user_id || `notification-${index}`,
            type: notificationType,
            title: title,
            message: message,
            time: timeAgo,
            status: isUnread ? 'unread' : 'read',
            icon: icon,
            documentUrl: doc.public_url
          }
        }) || []

        setNotifications(mappedNotifications)
      } catch (err) {
        console.warn('Failed to fetch notifications:', err)
        // Set empty notifications on error
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Only set up subscription if we successfully fetched notifications
    // This prevents errors if the table doesn't exist
    let subscription: any = null

    // Check if the table exists before setting up subscription
    supabase
      .from('documents')
      .select('count', { count: 'exact', head: true })
      .then(({ error }) => {
        if (!error) {
          // Table exists, set up subscription
          subscription = supabase
            .channel('documents_changes')
            .on('postgres_changes',
              { event: '*', schema: 'public', table: 'documents' },
              payload => {
                fetchNotifications() // Refresh notifications when data changes
              }
            )
            .subscribe()
        }
      })
      .catch(() => {
        // Table doesn't exist, skip subscription
      })

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [user])

  // Count unread notifications
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({
        ...notification,
        status: 'read' as const
      }))
    )
  }

  // Get initials for avatar placeholder
  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name.charAt(0).toUpperCase()
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Welcome back, {userName || user?.firstName || 'User'}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center font-medium"
          >
            + Request Signature
          </Button>

          {/* Notifications Button and Popup */}
          <div className="relative" ref={notificationsRef}>
            <button
              className="relative"
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen)
                setIsUserMenuOpen(false)
              }}
            >
              <Bell className={`w-6 h-6 ${isNotificationsOpen ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popup */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 bg-white rounded-lg shadow-lg overflow-hidden z-50 border border-gray-200">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-medium text-gray-800">Notifications</h3>
                  <div className="flex space-x-2">
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-72">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      Loading notifications...
                    </div>
                  ) : notifications.length > 0 ? (
                    <div>
                      {notifications.map(notification => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 relative ${notification.status === 'unread' ? 'bg-blue-50' : ''
                            }`}
                        >
                          {notification.status === 'unread' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                          )}
                          <div className="flex">
                            <div className="flex-shrink-0 mr-3 mt-1">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {notification.icon}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className={`text-sm font-medium ${notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'}`}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-500">{notification.time}</p>
                              </div>
                              <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      No notifications
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <Link
                    href="/notifications"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center"
                    onClick={() => setIsNotificationsOpen(false)}
                  >
                    View all notifications
                    <ChevronRight className="ml-1 w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Button and Popup */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="flex items-center"
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen)
                setIsNotificationsOpen(false)
              }}
            >
              {userSignature ? (
                <img
                  src={userSignature}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium border-2 border-white shadow-sm">
                  {getInitials(userName || user?.firstName)}
                </div>
              )}
            </button>

            {/* User popup menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg z-50 overflow-hidden border border-gray-200">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center">
                    {userSignature ? (
                      <img
                        src={userSignature}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-medium border-2 border-white shadow">
                        {getInitials(userName || user?.firstName)}
                      </div>
                    )}
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">{userName || user?.firstName || "User"}</div>
                      <div className="text-sm text-gray-500">{user?.email}</div>
                    </div>
                  </div>

                  {userSignature && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 font-medium mb-1">Your Signature</p>
                      <div className="bg-white p-2 rounded-md border border-gray-200">
                        <img
                          src={userSignature}
                          alt="Signature"
                          className="h-12 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="py-1">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    Profile
                  </Link>
                  <Link
                    href="/sign-1"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <Pen className="w-4 h-4 mr-2 text-gray-500" />
                    Signatures
                  </Link>
                  <Link
                    href="/pricing-plans"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <HandCoins className="w-4 h-4 mr-2 text-gray-500" />
                    Pricing Plans
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell, Search, Settings, User, LogOut, Shield,
  RefreshCw, AlertTriangle, CheckCircle, Clock
} from 'lucide-react'
import { adminLogout } from '@/lib/admin-auth'

interface AdminHeaderProps {
  activeTab: string
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await adminLogout()
    router.push('/admin/login')
  }

  const getPageTitle = (tab: string) => {
    const titles: Record<string, string> = {
      overview: 'System Overview',
      users: 'User Management',
      documents: 'Document Management',
      'multi-signature': 'Multi-Signature Workflows',
      notifications: 'Notification Management',
      settings: 'System Settings',
      features: 'Feature Toggles',
      billing: 'Billing & Plans',
      'api-keys': 'API Key Management',
      supabase: 'Database Management',
      environment: 'Environment Configuration',
      diagnostics: 'System Diagnostics',
      system: 'System Health'
    }
    return titles[tab] || 'Admin Dashboard'
  }

  const getPageDescription = (tab: string) => {
    const descriptions: Record<string, string> = {
      overview: 'Monitor system performance and key metrics',
      users: 'Manage user accounts, permissions, and subscriptions',
      documents: 'Track document usage and manage document workflows',
      'multi-signature': 'Monitor and manage multi-signature document workflows',
      notifications: 'Configure and monitor email notifications and templates',
      settings: 'Configure system-wide settings and preferences',
      features: 'Control feature availability and rollout',
      billing: 'Manage subscription plans, pricing, and billing',
      'api-keys': 'Manage external service API keys and integrations',
      supabase: 'Monitor database performance and manage configurations',
      environment: 'Configure environment variables and system settings',
      diagnostics: 'Run system diagnostics and health checks',
      system: 'Monitor system health and performance metrics'
    }
    return descriptions[tab] || 'Administrative control panel'
  }

  // Mock notifications
  const notifications = [
    {
      id: '1',
      type: 'warning',
      title: 'High Storage Usage',
      message: 'Storage is at 85% capacity',
      time: '5 minutes ago',
      icon: AlertTriangle,
      color: 'text-yellow-600'
    },
    {
      id: '2',
      type: 'success',
      title: 'Backup Completed',
      message: 'Daily backup completed successfully',
      time: '1 hour ago',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      id: '3',
      type: 'info',
      title: 'System Update Available',
      message: 'New system update is available',
      time: '2 hours ago',
      icon: RefreshCw,
      color: 'text-blue-600'
    }
  ]

  return (
    <header className="bg-white border-b border-gray-200 h-16">
      <div className="px-6 py-4 flex items-center justify-between h-full">
        {/* Left side - Page title and description */}
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{getPageTitle(activeTab)}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{getPageDescription(activeTab)}</p>
        </div>

        {/* Right side - Search, notifications, and user menu */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search admin panel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 text-sm"
            />
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md"
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
              )}
            </button>

            {/* Notifications dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => {
                    const Icon = notification.icon
                    return (
                      <div key={notification.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <Icon className={`h-5 w-5 mt-0.5 ${notification.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-600">{notification.message}</p>
                            <div className="flex items-center mt-1">
                              <Clock className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500">{notification.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="p-3 border-t border-gray-200">
                  <button className="w-full text-center text-sm text-red-600 hover:text-red-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md"
            >
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-medium">
                <Shield className="w-4 h-4" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">Admin User</div>
                <div className="text-xs text-gray-500">Super Admin</div>
              </div>
            </button>

            {/* User dropdown menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-medium">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Admin User</div>
                      <div className="text-xs text-gray-500">admin@signtusk.com</div>
                    </div>
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      // Navigate to admin profile settings
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Admin Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      // Navigate to admin settings
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Settings
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      handleLogout()
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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

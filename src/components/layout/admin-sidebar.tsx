'use client'

import { useRouter } from 'next/navigation'
import {
  Activity, Users, FileText, Mail, Settings, Database, 
  Shield, CreditCard, Key, TrendingUp, AlertTriangle, 
  Server, LogOut, Eye, BarChart3
} from 'lucide-react'
import { adminLogout } from '@/lib/admin-auth'

interface AdminSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export function AdminSidebar({ activeTab, setActiveTab }: AdminSidebarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await adminLogout()
    router.push('/admin/login')
  }

  const navigationItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Activity,
      description: 'System overview and statistics'
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      description: 'Manage user accounts and permissions'
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      description: 'Document management and analytics'
    },
    {
      id: 'multi-signature',
      label: 'Multi-Signature',
      icon: Users,
      description: 'Signature workflow management'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Mail,
      description: 'Email and notification management'
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings,
      description: 'System configuration and preferences'
    },
    {
      id: 'features',
      label: 'Feature Toggles',
      icon: Shield,
      description: 'Feature flags and toggles'
    },
    {
      id: 'billing',
      label: 'Billing & Plans',
      icon: CreditCard,
      description: 'Subscription and billing management'
    },
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: Key,
      description: 'External service API management'
    },
    {
      id: 'supabase',
      label: 'Supabase',
      icon: Database,
      description: 'Database management and monitoring'
    },
    {
      id: 'environment',
      label: 'Environment',
      icon: TrendingUp,
      description: 'Environment variables and configuration'
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      icon: AlertTriangle,
      description: 'System diagnostics and health checks'
    },
    {
      id: 'system',
      label: 'System Health',
      icon: Server,
      description: 'Performance monitoring and alerts'
    }
  ]

  // Function to determine if a nav item is active
  const isActive = (itemId: string) => activeTab === itemId

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-red-600 text-xl font-bold">SignTusk</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors ${
                  isActive(item.id)
                    ? 'text-red-600 bg-red-50 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={item.description}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  {isActive(item.id) && (
                    <div className="text-xs text-red-500 truncate">{item.description}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* System Status */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            System Status
          </h3>
          <div className="space-y-2">
            <div className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-green-600">Online</span>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email Service</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
            </div>
            <div className="px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Storage</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-xs text-yellow-600">75% Used</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveTab('users')}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Users
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Revenue Report
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              System Check
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
        <div className="mt-2 px-3 text-xs text-gray-500">
          Admin Panel v2.0
        </div>
      </div>
    </div>
  )
}

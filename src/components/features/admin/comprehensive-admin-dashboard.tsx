'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users, FileText, Mail, Database, Download, RefreshCw, Eye, EyeOff,
  Shield, DollarSign, Key, TrendingUp, UserCheck, Edit
} from 'lucide-react'
import { getCurrentAdminSession } from '@/lib/client-admin-auth'
import { getRealAPIKeys, RealSystemStats, RealUserRecord, RealDocumentRecord, RealAPIKeyRecord } from '@/lib/real-admin-data-service'
import { MultiSignatureManagement } from './multi-signature-management'
import { NotificationManagement } from './notification-management'
import { EnvironmentManagement } from './environment-management'
import { SupabaseManagement } from './supabase-management'
import { ConfigurationDiagnostics } from './configuration-diagnostics'
import { SystemSettingsManagement } from './system-settings-management'
import { FeatureToggleManagement } from './feature-toggle-management'
import { BillingPlansManagement } from './billing-plans-management'
import { OrganizationTOTPPolicies } from './organization-totp-policies'
import { AdminSecurityDashboard } from './admin-security-dashboard'
import { TOTPTestingDashboard } from './totp-testing-dashboard'
import { AdvancedAnalyticsDashboard } from './advanced-analytics-dashboard'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminHeader } from '@/components/layout/admin-header'

export function ComprehensiveAdminDashboard() {
  const router = useRouter()
  const [adminSession, setAdminSession] = useState<{ userId: string; email: string } | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getCurrentAdminSession()
      if (!session) {
        router.push('/admin/login')
        return
      }
      setAdminSession({ userId: session.user.id, email: session.user.email })
    }
    checkAuth()
  }, [router])



  if (!adminSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading admin session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AdminHeader activeTab={activeTab} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{/* Content will be added here */}

            {/* Overview Tab */}
            {activeTab === 'overview' && <OverviewTab />}

            {/* User Management Tab */}
            {activeTab === 'users' && <UserManagementTab />}

            {/* Documents Tab */}
            {activeTab === 'documents' && <DocumentsTab />}

            {/* Multi-Signature Management Tab */}
            {activeTab === 'multi-signature' && <MultiSignatureManagement />}

            {/* Notifications Management Tab */}
            {activeTab === 'notifications' && <NotificationManagement />}

            {/* System Settings Tab */}
            {activeTab === 'settings' && <SystemSettingsManagement />}

            {/* Feature Toggles Tab */}
            {activeTab === 'features' && <FeatureToggleManagement />}

            {/* Organization TOTP Policies Tab */}
            {activeTab === 'org-totp' && <OrganizationTOTPPolicies />}

            {/* Security Dashboard Tab */}
            {activeTab === 'security' && <AdminSecurityDashboard />}

            {/* Billing Tab */}
            {activeTab === 'billing' && <BillingPlansManagement />}

            {/* API Keys Tab */}
            {activeTab === 'api-keys' && <APIKeysTab />}

            {/* Supabase Management Tab */}
            {activeTab === 'supabase' && <SupabaseManagement />}

            {/* Environment Management Tab */}
            {activeTab === 'environment' && <EnvironmentManagement />}

            {/* Configuration Diagnostics Tab */}
            {activeTab === 'diagnostics' && <ConfigurationDiagnostics />}

            {/* System Health Tab */}
            {activeTab === 'system' && <SystemHealthTab />}

            {/* Advanced Analytics Tab */}
            {activeTab === 'advanced-analytics' && <AdvancedAnalyticsDashboard />}

          </div>
        </main>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab() {
  const [stats, setStats] = useState<RealSystemStats>({
    totalUsers: 0,
    freeUsers: 0,
    paidUsers: 0,
    activeUsers: 0,
    totalDocuments: 0,
    emailsSent: 0,
    storageUsed: '0 MB',
    monthlyRevenue: 0,
    signatureSuccess: 0,
    resendAttempts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRealStats()
  }, [])

  const loadRealStats = async () => {
    setLoading(true)
    try {
      // Call admin analytics API directly with authentication
      const response = await fetch('/api/admin/analytics?metrics=overview,users,documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()

      // Transform API response to match component interface
      const realStats: RealSystemStats = {
        totalUsers: data.analytics.overview.total_users,
        freeUsers: data.analytics.overview.total_users - (data.analytics.user_metrics.active_users_24h || 0),
        paidUsers: data.analytics.user_metrics.active_users_24h || 0,
        activeUsers: data.analytics.user_metrics.active_users_24h,
        totalDocuments: data.analytics.overview.total_documents,
        emailsSent: 0, // Not available in current API
        storageUsed: '0 MB', // Not available in current API
        monthlyRevenue: data.analytics.overview.monthly_revenue || 0,
        signatureSuccess: data.analytics.document_metrics?.signature_success_rate || 0,
        resendAttempts: 0 // Not available in current API
      }

      setStats(realStats)
    } catch (error) {
      console.error('Failed to load real stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-green-600">+12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600">+8% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments.toLocaleString()}</div>
            <p className="text-xs text-green-600">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.signatureSuccess}%</div>
            <p className="text-xs text-green-600">+2.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* User Distribution & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
            <CardDescription>Breakdown by account type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-sm">Free Users</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.freeUsers.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {((stats.freeUsers / stats.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Paid Users</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.paidUsers.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {((stats.paidUsers / stats.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Active (24h)</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.activeUsers.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Delivery</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.emailsSent.toLocaleString()}</div>
                  <div className="text-xs text-green-600">98.7% success</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage Used</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.storageUsed}</div>
                  <div className="text-xs text-gray-500">of 100 GB</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Resend Attempts</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{stats.resendAttempts}</div>
                  <div className="text-xs text-yellow-600">2.8% of total</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={loadRealStats} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button variant="outline">
              <Mail className="w-4 h-4 mr-2" />
              Test Email System
            </Button>
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Check Storage
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// User Management Tab Component
function UserManagementTab() {
  const [users, setUsers] = useState<RealUserRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRealUsers()
  }, [])

  const loadRealUsers = async () => {
    setLoading(true)
    try {
      // Call admin users API directly with authentication
      const response = await fetch('/api/admin/users?includeStats=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()

      // Transform API response to match component interface
      const realUsers: RealUserRecord[] = data.users.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
        subscription_plan: user.subscription_plan || 'free',
        document_count: user.document_count || 0,
        signature_count: user.signature_count || 0,
        is_active: user.is_active !== false,
        totp_enabled: user.totp_enabled || false
      }))

      setUsers(realUsers)
    } catch (error) {
      console.error('Failed to load real users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-800',
      basic: 'bg-blue-100 text-blue-800',
      pro: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-green-100 text-green-800'
    }
    return (
      <Badge className={colors[plan] || colors.free}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={colors[status] || colors.inactive}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage user accounts and subscriptions</p>
        </div>
        <Button onClick={loadRealUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>All registered users in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No users found</p>
              <p className="text-sm">Users will appear here as they register</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <UserCheck className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">{user.email}</h3>
                        {getPlanBadge(user.plan)}
                        {getStatusBadge(user.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">User ID:</span> {user.id.substring(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">Documents:</span> {user.documents_count}
                        </div>
                        <div>
                          <span className="font-medium">Joined:</span> {new Date(user.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Last Login:</span> {new Date(user.last_login).toLocaleDateString()}
                        </div>
                        {user.plan !== 'free' && (
                          <div>
                            <span className="font-medium">Subscription Expires:</span> {new Date(user.subscription_expires).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DocumentsTab() {
  const [documents, setDocuments] = useState<RealDocumentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRealDocuments()
  }, [])

  const loadRealDocuments = async () => {
    setLoading(true)
    try {
      // Call admin API directly with authentication
      const response = await fetch('/api/admin/documents?includeStats=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()

      // Transform API response to match component interface
      const realDocs: RealDocumentRecord[] = data.documents.map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        status: doc.status,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        user_id: doc.user_id,
        user_email: doc.user_email,
        file_size: doc.file_size,
        file_type: doc.file_type,
        signers_count: doc.signers_count,
        completed_signatures: doc.completed_signatures,
        pending_signatures: doc.pending_signatures,
        completion_rate: doc.completion_rate,
        last_activity: doc.last_activity,
        signing_deadline: doc.signing_deadline,
        is_template: doc.is_template,
        template_category: doc.template_category
      }))

      setDocuments(realDocs)
    } catch (error) {
      console.error('Failed to load real documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      completed: 'secondary',
      pending: 'default',
      expired: 'destructive',
      draft: 'default'
    }
    const colors: Record<string, string> = {
      completed: 'text-green-600',
      pending: 'text-yellow-600',
      expired: 'text-red-600',
      draft: 'text-gray-600'
    }
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-600">View and manage all documents in the system</p>
        </div>
        <Button onClick={loadRealDocuments} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
          <CardDescription>All documents processed through the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No documents found</p>
              <p className="text-sm">Documents will appear here as users upload them</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                        {getStatusBadge(doc.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Document ID:</span> {doc.id.substring(0, 12)}...
                        </div>
                        <div>
                          <span className="font-medium">User:</span> {doc.user_email}
                        </div>
                        <div>
                          <span className="font-medium">Signers:</span> {doc.signers_count}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(doc.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Completion:</span> {doc.completion_rate}%
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}



function APIKeysTab() {
  const [apiKeys, setApiKeys] = useState<RealAPIKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadRealAPIKeys()
  }, [])

  const loadRealAPIKeys = async () => {
    setLoading(true)
    try {
      const realKeys = await getRealAPIKeys()
      setApiKeys(realKeys)
    } catch (error) {
      console.error('Failed to load real API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys)
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId)
    } else {
      newVisible.add(keyId)
    }
    setVisibleKeys(newVisible)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return key
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'secondary',
      inactive: 'default',
      expired: 'destructive'
    }
    const colors: Record<string, string> = {
      active: 'text-green-600',
      inactive: 'text-gray-600',
      expired: 'text-red-600'
    }
    return (
      <Badge variant={variants[status] || 'default'} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">API Key Management</h2>
          <p className="text-gray-600">Manage external service API keys and credentials</p>
        </div>
        <Button onClick={loadRealAPIKeys} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys ({apiKeys.length})</CardTitle>
          <CardDescription>External service API keys currently configured</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading API keys...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No API keys configured</p>
              <p className="text-sm">Configure your external service API keys in environment variables</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((apiKey) => (
                <div key={apiKey.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Key className="w-5 h-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">{apiKey.name}</h3>
                        {getStatusBadge(apiKey.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-medium">Service:</span> {apiKey.service}
                        </div>
                        <div>
                          <span className="font-medium">Usage:</span> {apiKey.usage_count.toLocaleString()} calls
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(apiKey.created_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Last Used:</span> {new Date(apiKey.last_used).toLocaleDateString()}
                        </div>
                      </div>

                      {apiKey.description && (
                        <p className="text-sm text-gray-600 mb-3">{apiKey.description}</p>
                      )}

                      <div className="flex items-center space-x-2">
                        <div className="flex-1 font-mono text-sm bg-gray-50 p-2 rounded border">
                          {visibleKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                        >
                          {visibleKeys.has(apiKey.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.key)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SystemHealthTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <CardDescription>Monitor system components and services</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">System health monitoring coming soon...</p>
      </CardContent>
    </Card>
  )
}



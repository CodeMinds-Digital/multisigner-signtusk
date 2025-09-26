'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Settings,
  BarChart3,
  Shield,
  CreditCard,
  Plug,
  Building2,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react'

interface DomainInfo {
  domain: string
  companyName: string
  isVerified: boolean
  totalUsers: number
  activeUsers: number
  plan: string
  adminRole: 'domain_admin' | 'domain_manager'
}

interface DomainStats {
  totalUsers: number
  activeUsers: number
  documentsThisMonth: number
  storageUsed: string
  complianceScore: number
  lastActivity: string
}

export function CorporateControlPanel() {
  const [domainInfo, setDomainInfo] = useState<DomainInfo | null>(null)
  const [stats, setStats] = useState<DomainStats | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDomainInfo()
    loadDomainStats()
  }, [])

  const loadDomainInfo = async () => {
    try {
      // This would call the API to get domain info for current user
      const response = await fetch('/api/corporate/domain-info')
      const data = await response.json()
      setDomainInfo(data)
    } catch (error) {
      console.error('Failed to load domain info:', error)
    }
  }

  const loadDomainStats = async () => {
    try {
      const response = await fetch('/api/corporate/domain-stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to load domain stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!domainInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have domain administrator privileges. Contact your organization administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/dashboard'} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {domainInfo.companyName} Control Panel
                </h1>
                <div className="flex items-center mt-1">
                  <span className="text-sm text-gray-500 mr-2">{domainInfo.domain}</span>
                  {domainInfo.isVerified ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending Verification
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{domainInfo.adminRole.replace('_', ' ').toUpperCase()}</Badge>
              <Badge className="bg-blue-100 text-blue-800">{domainInfo.plan.toUpperCase()}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center">
              <Plug className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab stats={stats} domainInfo={domainInfo} />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagementTab domain={domainInfo.domain} />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecurityManagementTab domain={domainInfo.domain} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <DomainSettingsTab domain={domainInfo.domain} />
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <BillingManagementTab domain={domainInfo.domain} />
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <IntegrationsTab domain={domainInfo.domain} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({ stats, domainInfo: _domainInfo }: { stats: DomainStats | null, domainInfo: DomainInfo }) {
  if (!stats) return <div>Loading stats...</div>

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
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              {stats.activeUsers} active this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsThisMonth}</div>
            <p className="text-xs text-gray-600">Signed documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Building2 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storageUsed}</div>
            <p className="text-xs text-gray-600">of plan limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.complianceScore}%</div>
            <p className="text-xs text-gray-600">Security compliance</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col items-center justify-center">
              <UserPlus className="w-6 h-6 mb-2" />
              Invite Users
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <Shield className="w-6 h-6 mb-2" />
              Security Settings
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
              <BarChart3 className="w-6 h-6 mb-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Placeholder components for other tabs
function UserManagementTab({ domain }: { domain: string }) {
  return <div>User Management for {domain} - Coming Soon</div>
}

function SecurityManagementTab({ domain }: { domain: string }) {
  return <div>Security Management for {domain} - Coming Soon</div>
}

function DomainSettingsTab({ domain }: { domain: string }) {
  return <div>Domain Settings for {domain} - Coming Soon</div>
}

function BillingManagementTab({ domain }: { domain: string }) {
  return <div>Billing Management for {domain} - Coming Soon</div>
}

function IntegrationsTab({ domain }: { domain: string }) {
  return <div>Integrations for {domain} - Coming Soon</div>
}

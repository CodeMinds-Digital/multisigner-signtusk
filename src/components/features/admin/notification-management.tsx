'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  RefreshCw, Mail, CheckCircle, XCircle, Clock, AlertTriangle,
  Send, Eye, Search, Filter, Download, RotateCcw, Settings
} from 'lucide-react'
import {
  AdminNotificationLog,
  NotificationStats,
  EmailTemplate
} from '@/lib/admin-notification-service'

export function NotificationManagement() {
  const [notifications, setNotifications] = useState<AdminNotificationLog[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'logs' | 'templates' | 'settings'>('logs')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  useEffect(() => {
    loadNotificationData()
  }, [])

  const loadNotificationData = async () => {
    setLoading(true)
    try {
      console.log('🔄 Loading notification data from API...')

      // Load data from API endpoint instead of direct database access
      const response = await fetch('/api/admin/notification-logs?includeStats=true&includeTemplates=true')
      const data = await response.json()

      if (data.success) {
        setNotifications(data.logs || [])
        setTemplates(data.templates || [])
        setStats(data.stats || {
          delivered: 0,
          failed: 0,
          sent: 0,
          total: 0,
          todayDelivered: 0,
          todayFailed: 0
        })
        console.log(`✅ Loaded ${data.logs?.length || 0} notifications, ${data.templates?.length || 0} templates, and stats:`, data.stats)
      } else {
        throw new Error(data.error || 'Failed to load data')
      }
    } catch (error) {
      console.error('❌ Error loading notification data:', error)
      setNotifications([])
      setTemplates([])
      setStats({
        delivered: 0,
        failed: 0,
        sent: 0,
        total: 0,
        todayDelivered: 0,
        todayFailed: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'sent': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'bounced': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />
      case 'sent': return <Clock className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'bounced': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sequential_next': return 'bg-blue-100 text-blue-800'
      case 'reminder': return 'bg-yellow-100 text-yellow-800'
      case 'completion': return 'bg-green-100 text-green-800'
      case 'decline': return 'bg-red-100 text-red-800'
      case 'expiration': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleResendNotification = async (notificationId: string) => {
    try {
      console.log('Resending notification:', notificationId)
      // Call resend API
      const response = await fetch('/api/admin/notification-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        await loadNotificationData()
      }
    } catch (error) {
      console.error('Error resending notification:', error)
    }
  }

  const handleTestEmail = async () => {
    try {
      console.log('Testing email configuration')
      const response = await fetch('/api/test/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: 'admin@company.com' })
      })

      const result = await response.json()
      alert(result.success ? 'Test email sent successfully!' : `Test failed: ${result.error}`)
    } catch (error) {
      console.error('Error testing email:', error)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.requestTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter
    const matchesType = typeFilter === 'all' || notification.notificationType === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notification Management</h2>
          <p className="text-gray-600">Monitor and manage email notifications for signing workflows</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleTestEmail} variant="outline" size="sm">
            <Send className="w-4 h-4 mr-2" />
            Test Email
          </Button>
          <Button onClick={loadNotificationData} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'logs', label: 'Notification Logs', icon: Mail },
          { id: 'templates', label: 'Email Templates', icon: Settings },
          { id: 'settings', label: 'Email Settings', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Notification Logs Tab */}
      {activeTab === 'logs' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.delivered || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <XCircle className="w-8 h-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.failed || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sent</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats?.sent || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Mail className="w-8 h-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by email or document..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="sequential_next">Sequential Next</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="completion">Completion</SelectItem>
                      <SelectItem value="decline">Decline</SelectItem>
                      <SelectItem value="expiration">Expiration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Logs</CardTitle>
              <CardDescription>
                {filteredNotifications.length} of {notifications.length} notifications shown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading notifications...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge className={getTypeColor(notification.notificationType)}>
                              {notification.notificationType.replace('_', ' ')}
                            </Badge>
                            <Badge className={getStatusColor(notification.status)}>
                              {getStatusIcon(notification.status)}
                              <span className="ml-1">{notification.status}</span>
                            </Badge>
                            {notification.retryCount > 0 && (
                              <Badge variant="outline">
                                {notification.retryCount} retries
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Recipient:</span>
                              <span className="ml-2 text-gray-600">{notification.recipientEmail}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Document:</span>
                              <span className="ml-2 text-gray-600">{notification.requestTitle}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Sent:</span>
                              <span className="ml-2 text-gray-600">
                                {new Date(notification.sentAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {notification.messageId && (
                            <div className="mt-2 text-xs text-gray-500">
                              Message ID: {notification.messageId}
                            </div>
                          )}

                          {notification.errorMessage && (
                            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              {notification.errorMessage}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          {notification.status === 'failed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResendNotification(notification.id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Resend
                            </Button>
                          )}

                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Email Templates Tab */}
      {activeTab === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>Manage email templates for different notification types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {templates.map(template => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.subject}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last modified: {new Date(template.lastModified).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration</CardTitle>
            <CardDescription>Configure email service settings and SMTP configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">From Name</label>
                  <Input defaultValue="SignTusk" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">From Email</label>
                  <Input defaultValue="noreply@signtusk.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Resend API Key</label>
                <Input type="password" defaultValue="re_bSSwgHiZ_HswkpPHNQKzMTNKtYYjfCzEx" />
              </div>

              <div className="flex space-x-4">
                <Button>Save Settings</Button>
                <Button variant="outline" onClick={handleTestEmail}>
                  <Send className="w-4 h-4 mr-2" />
                  Test Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

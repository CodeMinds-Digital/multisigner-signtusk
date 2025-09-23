'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, TrendingDown, Users, FileText, DollarSign, Clock,
  Download, RefreshCw, AlertTriangle, CheckCircle, Activity
} from 'lucide-react'
import { AdminRealTimeService, RealTimeUpdate } from '@/lib/admin-real-time-service'

interface AnalyticsData {
  overview: {
    total_users: number
    total_documents: number
    total_signatures: number
    monthly_revenue: number
    growth_rate: number
  }
  user_metrics: {
    new_users_today: number
    active_users_24h: number
    user_retention_rate: number
    average_documents_per_user: number
  }
  document_metrics: {
    documents_created_today: number
    documents_completed_today: number
    average_completion_time_hours: number
    signature_success_rate: number
  }
  revenue_metrics: {
    mrr: number
    arr: number
    churn_rate: number
    average_revenue_per_user: number
  }
  time_series: {
    date: string
    users: number
    documents: number
    revenue: number
  }[]
}

interface LiveMetrics {
  activeUsers: number
  documentsToday: number
  signaturesCompleted: number
  systemLoad: number
}

export function AdvancedAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [realTimeUpdates, setRealTimeUpdates] = useState<RealTimeUpdate[]>([])
  const [timeRange, setTimeRange] = useState('30d')

  useEffect(() => {
    loadAnalytics()
    loadLiveMetrics()
    
    // Set up real-time updates
    const unsubscribe = AdminRealTimeService.subscribeToAdminUpdates(
      'admin_user_id', // In real app, get from session
      (update) => {
        setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]) // Keep last 10 updates
        // Refresh live metrics when updates come in
        loadLiveMetrics()
      }
    )

    // Refresh live metrics every 30 seconds
    const interval = setInterval(loadLiveMetrics, 30000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [timeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/analytics?metrics=overview,users,documents,revenue,timeseries&timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data.analytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLiveMetrics = async () => {
    try {
      const metrics = await AdminRealTimeService.getLiveAnalytics()
      setLiveMetrics(metrics)
    } catch (error) {
      console.error('Failed to load live metrics:', error)
    }
  }

  const exportAnalytics = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/admin/analytics/export?format=${format}&timeRange=${timeRange}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_session_token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export analytics')
      }

      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${timeRange}-${Date.now()}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `analytics-${timeRange}-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export analytics:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Advanced Analytics</h2>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button onClick={loadAnalytics} disabled={loading} size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => exportAnalytics('csv')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportAnalytics('json')} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Live Metrics */}
      {liveMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{liveMetrics.activeUsers}</div>
              <p className="text-xs text-muted-foreground">Currently online</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Today</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{liveMetrics.documentsToday}</div>
              <p className="text-xs text-muted-foreground">Created today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signatures Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{liveMetrics.signaturesCompleted}</div>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Load</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{liveMetrics.systemLoad.toFixed(1)}%</div>
              <Progress value={liveMetrics.systemLoad} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics */}
      {analytics && (
        <>
          {/* Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.total_users.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className={`inline-flex items-center ${analytics.overview.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.overview.growth_rate >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {Math.abs(analytics.overview.growth_rate)}% from last period
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.total_documents.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.document_metrics.documents_created_today} created today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Signatures</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.total_signatures.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.document_metrics.signature_success_rate}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.overview.monthly_revenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  ARR: ${analytics.revenue_metrics.arr.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Real-time Activity</CardTitle>
              <CardDescription>Live updates from your platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {realTimeUpdates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                ) : (
                  realTimeUpdates.map((update, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <Badge variant={
                        update.type === 'user_created' ? 'default' :
                        update.type === 'document_uploaded' ? 'secondary' :
                        update.type === 'signature_completed' ? 'success' : 'destructive'
                      }>
                        {update.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm flex-1">
                        {update.type === 'user_created' && `New user registered: ${update.data.email}`}
                        {update.type === 'document_uploaded' && `Document uploaded: ${update.data.title}`}
                        {update.type === 'signature_completed' && `Signature completed for document`}
                        {update.type === 'system_alert' && update.data.message}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

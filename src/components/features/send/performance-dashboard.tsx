'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Mail, 
  Database, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react'

interface PerformanceStats {
  email: {
    queue: {
      queued: number
      processing: number
      completed: number
      failed: number
      totalToday: number
    }
    pending: {
      high: number
      normal: number
      low: number
    }
    successRate: string
    status: 'healthy' | 'warning' | 'error'
  }
  cache: {
    stats: Record<string, {
      hits: number
      misses: number
      hitRate: number
      totalRequests: number
    }>
    overallHitRate: string
    status: 'healthy' | 'warning' | 'error'
  }
  realtime: {
    stats: {
      activeChannels: number
      totalActiveViewers: number
      eventsPublishedToday: number
    }
    status: 'healthy' | 'warning' | 'error'
  }
}

interface PerformanceData {
  success: boolean
  performance: PerformanceStats
  recommendations: string[]
  summary: {
    emailsProcessedToday: number
    emailSuccessRate: string
    cacheHitRate: string
    activeRealtimeChannels: number
    overallStatus: 'healthy' | 'warning' | 'error'
  }
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadPerformanceData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/send/queue/stats')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to load performance data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadPerformanceData()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load performance data</p>
        <Button onClick={handleRefresh} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">Real-time monitoring of Send module performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(data.summary.overallStatus)}>
            {getStatusIcon(data.summary.overallStatus)}
            {data.summary.overallStatus.toUpperCase()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Emails Today</p>
                <p className="text-2xl font-bold">{data.summary.emailsProcessedToday}</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{data.summary.emailSuccessRate}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
                <p className="text-2xl font-bold">{data.summary.cacheHitRate}</p>
              </div>
              <Database className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Channels</p>
                <p className="text-2xl font-bold">{data.summary.activeRealtimeChannels}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Queue Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Queue
              <Badge className={getStatusColor(data.performance.email.status)}>
                {data.performance.email.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Email processing and queue status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completed</span>
                <span className="font-medium">{data.performance.email.queue.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing</span>
                <span className="font-medium">{data.performance.email.queue.processing}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Queued</span>
                <span className="font-medium">{data.performance.email.queue.queued}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed</span>
                <span className="font-medium text-red-600">{data.performance.email.queue.failed}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Pending by Priority</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>High Priority</span>
                  <span className="font-medium">{data.performance.email.pending.high}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Normal Priority</span>
                  <span className="font-medium">{data.performance.email.pending.normal}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Low Priority</span>
                  <span className="font-medium">{data.performance.email.pending.low}</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Success Rate</span>
                <span className="font-medium">{data.performance.email.successRate}</span>
              </div>
              <Progress 
                value={parseFloat(data.performance.email.successRate)} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cache Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Cache Performance
              <Badge className={getStatusColor(data.performance.cache.status)}>
                {data.performance.cache.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Redis cache hit rates and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.performance.cache.stats).map(([type, stats]) => (
              <div key={type} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{type.replace('_', ' ')}</span>
                  <span className="font-medium">{stats.hitRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.hitRate} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Hits: {stats.hits}</span>
                  <span>Misses: {stats.misses}</span>
                </div>
              </div>
            ))}

            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Overall Hit Rate</span>
                <span className="font-medium">{data.performance.cache.overallHitRate}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Real-time
              <Badge className={getStatusColor(data.performance.realtime.status)}>
                {data.performance.realtime.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Live updates and pub/sub performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Channels</span>
                <span className="font-medium">{data.performance.realtime.stats.activeChannels}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Viewers</span>
                <span className="font-medium">{data.performance.realtime.stats.totalActiveViewers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Events Today</span>
                <span className="font-medium">{data.performance.realtime.stats.eventsPublishedToday}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Performance Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

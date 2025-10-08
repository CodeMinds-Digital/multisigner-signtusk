'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Download,
  Printer,
  FileText,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'

interface AnalyticsDashboardProps {
  documentId: string
}

interface AnalyticsData {
  document: {
    id: string
    title: string
    totalPages: number
  }
  summary: {
    totalViews: number
    uniqueViewers: number
    avgDuration: number
    avgScrollDepth: number
    completionRate: number
    engagementScore: number
    downloads: number
    prints: number
  }
  charts: {
    viewsByDate: Array<{ date: string; views: number }>
    pageStats: Array<{ page: number; avgDuration: number; avgScrollDepth: number; views: number }>
    topViewers: Array<{ identifier: string; email?: string; views: number; totalDuration: number; avgDuration: number }>
    countries: Array<{ country: string; count: number }>
  }
  recentViews: Array<{ id: string; email?: string; ipAddress: string; duration: number; createdAt: string }>
  recentEvents: Array<{ id: string; type: string; email?: string; pageNumber?: number; createdAt: string }>
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function AnalyticsDashboard({ documentId }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [documentId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/analytics/${documentId}`)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error)
      }

      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.uniqueViewers} unique viewers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(data.summary.avgDuration)}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.avgScrollDepth}% avg scroll depth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Pages viewed completely
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.engagementScore}/100</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.downloads} downloads, {data.summary.prints} prints
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Views Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Views Over Time</CardTitle>
          <CardDescription>Daily view count for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.charts.viewsByDate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="views"
                stroke="#10b981"
                strokeWidth={2}
                name="Views"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Page Engagement */}
      <Card>
        <CardHeader>
          <CardTitle>Page-by-Page Engagement</CardTitle>
          <CardDescription>Average time spent and scroll depth per page</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.charts.pageStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="page" label={{ value: 'Page Number', position: 'insideBottom', offset: -5 }} />
              <YAxis yAxisId="left" label={{ value: 'Duration (s)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Scroll Depth (%)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avgDuration" fill="#3b82f6" name="Avg Duration (s)" />
              <Bar yAxisId="right" dataKey="avgScrollDepth" fill="#10b981" name="Avg Scroll Depth (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Viewers & Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Viewers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Viewers</CardTitle>
            <CardDescription>Most engaged viewers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.charts.topViewers.slice(0, 5).map((viewer, index) => (
                <div key={viewer.identifier} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {viewer.email || viewer.identifier}
                      </p>
                      <p className="text-xs text-gray-500">
                        {viewer.views} views • {formatDuration(viewer.totalDuration)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDuration(viewer.avgDuration)}</p>
                    <p className="text-xs text-gray-500">avg/view</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
            <CardDescription>Viewers by country</CardDescription>
          </CardHeader>
          <CardContent>
            {data.charts.countries.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.charts.countries}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => `${entry.country} ${(entry.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.charts.countries.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No geographic data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest views and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  {event.type === 'view' && <Eye className="w-4 h-4 text-blue-600" />}
                  {event.type === 'download' && <Download className="w-4 h-4 text-green-600" />}
                  {event.type === 'print' && <Printer className="w-4 h-4 text-purple-600" />}
                  {event.type === 'page_view' && <FileText className="w-4 h-4 text-gray-600" />}
                  <div>
                    <p className="text-sm font-medium">
                      {event.type === 'view' && 'Document viewed'}
                      {event.type === 'download' && 'Document downloaded'}
                      {event.type === 'print' && 'Document printed'}
                      {event.type === 'page_view' && `Page ${event.pageNumber} viewed`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {event.email || 'Anonymous'} • {format(new Date(event.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


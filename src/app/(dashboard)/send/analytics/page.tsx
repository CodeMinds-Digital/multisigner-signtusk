'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Eye, Download, RefreshCw, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { LoadingStats, LoadingChart, LoadingList } from '@/components/features/send/loading-states'

interface DashboardStats {
  totalDocuments: number
  totalLinks: number
  totalViews: number
  activeLinks: number
  totalVisitors: number
  avgEngagement: number
}

interface TopDocument {
  id: string
  title: string
  views: number
  downloads: number
  engagement: number
}

export default function SendAnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalLinks: 0,
    totalViews: 0,
    activeLinks: 0,
    totalVisitors: 0,
    avgEngagement: 0
  })
  const [topDocuments, setTopDocuments] = useState<TopDocument[]>([])

  // Sample engagement data for the chart
  const engagementData = [
    { date: '2024-01-01', views: 45, downloads: 12 },
    { date: '2024-01-02', views: 52, downloads: 15 },
    { date: '2024-01-03', views: 38, downloads: 8 },
    { date: '2024-01-04', views: 67, downloads: 22 },
    { date: '2024-01-05', views: 73, downloads: 28 },
    { date: '2024-01-06', views: 41, downloads: 11 },
    { date: '2024-01-07', views: 58, downloads: 19 },
    { date: '2024-01-08', views: 89, downloads: 35 },
    { date: '2024-01-09', views: 76, downloads: 31 },
    { date: '2024-01-10', views: 63, downloads: 24 },
    { date: '2024-01-11', views: 55, downloads: 18 },
    { date: '2024-01-12', views: 82, downloads: 33 },
    { date: '2024-01-13', views: 94, downloads: 41 },
    { date: '2024-01-14', views: 71, downloads: 27 }
  ]

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Load dashboard stats
      const statsResponse = await fetch('/api/send/dashboard/stats')
      const statsData = await statsResponse.json()

      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Load top documents
      const docsResponse = await fetch('/api/send/dashboard/top-documents')
      const docsData = await docsResponse.json()

      if (docsData.success) {
        setTopDocuments(docsData.documents || [])
      }

    } catch (error) {
      console.error('Failed to load analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const formatViewTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Send', href: '/send' },
          { label: 'Analytics' }
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send Analytics</h1>
          <p className="text-gray-600 mt-1">Track performance of your shared documents</p>
        </div>
        <Button
          onClick={loadAnalytics}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <LoadingStats count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-gray-500 mt-1">Documents shared</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-gray-500 mt-1">Across all documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Links</CardTitle>
              <Download className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLinks}</div>
              <p className="text-xs text-gray-500 mt-1">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{`${stats.avgEngagement}%`}</div>
              <p className="text-xs text-gray-500 mt-1">Engagement score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Performing Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Documents</CardTitle>
          <CardDescription>Most viewed and downloaded documents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingList count={5} showAvatar={false} />
          ) : topDocuments.length > 0 ? (
            <div className="space-y-4">
              {topDocuments.map((doc, index) => (
                <div key={doc.id} className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{doc.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {doc.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {doc.downloads} downloads
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{doc.engagement}%</div>
                    <div className="text-xs text-gray-500">Engagement</div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${doc.engagement}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Yet</h3>
              <p className="text-gray-500 mb-6">
                Upload and share documents to start tracking engagement and performance metrics
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => router.push('/send/upload')}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </Button>
                <Button variant="outline" onClick={() => router.push('/send/documents')}>
                  View Documents
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>Document views and downloads trend over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [value, name === 'views' ? 'Views' : 'Downloads']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="views"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Views"
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="downloads"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Downloads"
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


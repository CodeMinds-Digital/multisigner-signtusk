'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Eye, Download, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
    <div className="space-y-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalDocuments}</div>
            <p className="text-xs text-gray-500 mt-1">Documents shared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalViews}</div>
            <p className="text-xs text-gray-500 mt-1">Across all documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Download className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.activeLinks}</div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : `${stats.avgEngagement}%`}</div>
            <p className="text-xs text-gray-500 mt-1">Engagement score</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Documents</CardTitle>
          <CardDescription>Most viewed and downloaded documents</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-4 bg-gray-200 rounded"></div>
                  <div className="w-32 h-2 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
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
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No documents found</p>
              <p className="text-sm">Share some documents to see analytics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
          <CardDescription>Document views and downloads trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>Chart visualization coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


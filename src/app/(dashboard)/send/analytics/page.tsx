'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Eye, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SendAnalyticsPage() {
  const [stats] = useState({
    totalShares: 156,
    totalViews: 1247,
    totalDownloads: 342,
    avgViewTime: '3m 24s'
  })

  const [topDocuments] = useState([
    { name: 'Q4 Financial Report.pdf', views: 234, downloads: 89, engagement: 92 },
    { name: 'Product Roadmap 2024.pdf', views: 198, downloads: 67, engagement: 85 },
    { name: 'Marketing Strategy.pdf', views: 176, downloads: 54, engagement: 78 },
    { name: 'Partnership Agreement.pdf', views: 145, downloads: 43, engagement: 71 },
    { name: 'Sales Presentation.pdf', views: 123, downloads: 38, engagement: 65 }
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Send Analytics</h1>
        <p className="text-gray-600 mt-1">Track performance of your shared documents</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShares}</div>
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
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
            <p className="text-xs text-gray-500 mt-1">Total downloads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg View Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewTime}</div>
            <p className="text-xs text-gray-500 mt-1">Per document</p>
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
          <div className="space-y-4">
            {topDocuments.map((doc, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{doc.name}</h4>
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


'use client'

import { useState } from 'react'
import { Upload, Share2, Link as LinkIcon, TrendingUp, FileText, Users, Clock, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SendDashboard() {
  const [stats] = useState({
    totalShared: 156,
    activeLinks: 23,
    totalViews: 1247,
    avgViewTime: '3m 24s'
  })

  const [recentShares] = useState([
    {
      id: 1,
      title: 'Q4 Financial Report.pdf',
      recipient: 'john@company.com',
      views: 12,
      lastViewed: '2 hours ago',
      status: 'active'
    },
    {
      id: 2,
      title: 'Product Roadmap 2024.pdf',
      recipient: 'sarah@startup.io',
      views: 8,
      lastViewed: '5 hours ago',
      status: 'active'
    },
    {
      id: 3,
      title: 'Marketing Strategy.pdf',
      recipient: 'team@marketing.com',
      views: 24,
      lastViewed: '1 day ago',
      status: 'expired'
    }
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Send</h1>
          <p className="text-gray-600 mt-1">Secure document sharing and tracking</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Upload className="w-4 h-4 mr-2" />
          Share Document
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Shared</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalShared}</div>
            <p className="text-xs text-gray-500 mt-1">Documents shared</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLinks}</div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-gray-500 mt-1">All time views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg View Time</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewTime}</div>
            <p className="text-xs text-gray-500 mt-1">Per document</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Shares */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shares</CardTitle>
          <CardDescription>Your recently shared documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentShares.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{share.title}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {share.recipient}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {share.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {share.lastViewed}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {share.status === 'active' ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                      Expired
                    </span>
                  )}
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Upload className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Share New Document</CardTitle>
                <CardDescription>Upload and share securely</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <LinkIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Manage Links</CardTitle>
                <CardDescription>View and control share links</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">View Analytics</CardTitle>
                <CardDescription>Track engagement metrics</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}


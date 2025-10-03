'use client'

import { useState } from 'react'
import { Activity, Eye, Clock, CheckCircle, AlertCircle, FileText, MapPin, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function TrackDashboard() {
  const [stats] = useState({
    activeDocuments: 47,
    totalViews: 892,
    pendingActions: 12,
    completedToday: 8
  })

  const [recentActivity] = useState([
    {
      id: 1,
      document: 'Sales Agreement Q1.pdf',
      user: 'Alice Johnson',
      action: 'viewed',
      timestamp: '5 minutes ago',
      location: 'New York, US',
      status: 'active'
    },
    {
      id: 2,
      document: 'Partnership Contract.pdf',
      user: 'Bob Smith',
      action: 'signed',
      timestamp: '12 minutes ago',
      location: 'London, UK',
      status: 'completed'
    },
    {
      id: 3,
      document: 'NDA Template.pdf',
      user: 'Carol White',
      action: 'downloaded',
      timestamp: '23 minutes ago',
      location: 'Sydney, AU',
      status: 'active'
    },
    {
      id: 4,
      document: 'Service Level Agreement.pdf',
      user: 'David Brown',
      action: 'viewed',
      timestamp: '1 hour ago',
      location: 'Toronto, CA',
      status: 'pending'
    },
    {
      id: 5,
      document: 'Employment Offer.pdf',
      user: 'Emma Davis',
      action: 'signed',
      timestamp: '2 hours ago',
      location: 'Singapore, SG',
      status: 'completed'
    }
  ])

  const [activeDocuments] = useState([
    {
      id: 1,
      title: 'Q4 Budget Proposal.pdf',
      recipients: 5,
      views: 23,
      pending: 2,
      lastActivity: '10 min ago'
    },
    {
      id: 2,
      title: 'Marketing Campaign Brief.pdf',
      recipients: 3,
      views: 15,
      pending: 1,
      lastActivity: '1 hour ago'
    },
    {
      id: 3,
      title: 'Product Roadmap 2024.pdf',
      recipients: 8,
      views: 42,
      pending: 3,
      lastActivity: '3 hours ago'
    }
  ])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'viewed':
        return <Eye className="w-4 h-4 text-blue-600" />
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'downloaded':
        return <Activity className="w-4 h-4 text-purple-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Completed</Badge>
      case 'active':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Active</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Track</h1>
          <p className="text-gray-600 mt-1">Monitor document activity in real-time</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Activity className="w-4 h-4 mr-2" />
          View All Activity
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Documents</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDocuments}</div>
            <p className="text-xs text-gray-500 mt-1">Currently being tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingActions}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting response</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-gray-500 mt-1">Finished documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Live document tracking updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{activity.document}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">{activity.user}</span>
                          {' '}
                          <span className="text-gray-500">{activity.action}</span>
                          {' '}
                          this document
                        </p>
                      </div>
                      {getStatusBadge(activity.status)}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.timestamp}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {activity.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Documents - Takes 1 column */}
        <Card>
          <CardHeader>
            <CardTitle>Active Documents</CardTitle>
            <CardDescription>Currently tracked files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                >
                  <h4 className="font-medium text-gray-900 text-sm mb-2 truncate">{doc.title}</h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {doc.recipients} recipients
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {doc.views} views
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-yellow-600" />
                        {doc.pending} pending
                      </span>
                      <span className="text-gray-500">{doc.lastActivity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Activity Log</CardTitle>
                <CardDescription>View complete history</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">View Analytics</CardTitle>
                <CardDescription>Detailed tracking insights</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>Configure alerts</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}


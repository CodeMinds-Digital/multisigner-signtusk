'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Users, FileText, Activity, PieChart, BarChart3, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AnalyticsDashboard() {
  const [stats] = useState({
    totalDocuments: 342,
    totalUsers: 89,
    avgCompletionTime: '2.4 days',
    completionRate: 87
  })

  const [metrics] = useState([
    { month: 'Jan', documents: 45, signatures: 38 },
    { month: 'Feb', documents: 52, signatures: 47 },
    { month: 'Mar', documents: 61, signatures: 54 },
    { month: 'Apr', documents: 58, signatures: 51 },
    { month: 'May', documents: 67, signatures: 62 },
    { month: 'Jun', documents: 59, signatures: 53 }
  ])

  const [topDocuments] = useState([
    { name: 'Employment Contract', views: 234, completions: 198, rate: 85 },
    { name: 'NDA Agreement', views: 189, completions: 167, rate: 88 },
    { name: 'Service Agreement', views: 156, completions: 142, rate: 91 },
    { name: 'Partnership MOU', views: 134, completions: 112, rate: 84 }
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Last 30 Days
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgCompletionTime}</div>
            <p className="text-xs text-red-600 flex items-center mt-1">
              <TrendingDown className="w-3 h-3 mr-1" />
              -15% faster
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <PieChart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +3% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Document Trends</CardTitle>
            <CardDescription>Monthly document and signature activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{metric.month}</span>
                    <span className="text-gray-500">{metric.documents} docs / {metric.signatures} signed</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${(metric.documents / 70) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(metric.signatures / 70) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-600 rounded-full" />
                <span className="text-gray-600">Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-600 rounded-full" />
                <span className="text-gray-600">Signatures</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Documents</CardTitle>
            <CardDescription>Highest completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDocuments.map((doc, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 text-sm">{doc.name}</h4>
                      <p className="text-xs text-gray-500">{doc.views} views • {doc.completions} completed</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{doc.rate}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-green-500 h-2 rounded-full"
                      style={{ width: `${doc.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">View Reports</CardTitle>
                <CardDescription>Detailed analytics reports</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <PieChart className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Custom Insights</CardTitle>
                <CardDescription>Build custom dashboards</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Real-time Metrics</CardTitle>
                <CardDescription>Live performance data</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}


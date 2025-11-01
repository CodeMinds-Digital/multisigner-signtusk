'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  Globe, 
  Monitor, 
  Smartphone, 
  Tablet,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  Eye,
  Download,
  Share2,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react'

interface AnalyticsData {
  geographic: {
    countries: Array<{ country: string; visits: number; percentage: number }>
    cities: Array<{ city: string; country: string; visits: number }>
  }
  devices: {
    types: Array<{ type: string; count: number; percentage: number }>
    browsers: Array<{ browser: string; count: number; percentage: number }>
    os: Array<{ os: string; count: number; percentage: number }>
  }
  engagement: {
    sessions: Array<{ date: string; sessions: number; avgDuration: number }>
    documents: Array<{ name: string; views: number; downloads: number; avgTime: number; score: number }>
    heatmap: Array<{ hour: number; day: string; activity: number }>
  }
  realtime: {
    activeUsers: number
    currentSessions: Array<{ id: string; country: string; device: string; duration: number; pages: number }>
  }
}

interface AdvancedAnalyticsProps {
  dataRoomId: string
}

export function AdvancedAnalytics({ dataRoomId }: AdvancedAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [dataRoomId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/send/data-rooms/${dataRoomId}/analytics/advanced?range=${timeRange}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16']

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  const getEngagementScore = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (score >= 60) return { label: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (score >= 40) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Poor', color: 'bg-red-100 text-red-800' }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading advanced analytics...</p>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-500">Analytics data will appear once your data room receives visitors</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Advanced Analytics</h2>
          <p className="text-gray-500">Detailed insights and engagement metrics</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} disabled={refreshing}>
            {refreshing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-green-600" />
            Real-time Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analytics.realtime.activeUsers}
              </div>
              <p className="text-gray-500">Active users right now</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Current Sessions</h4>
              {analytics.realtime.currentSessions.slice(0, 3).map((session, index) => (
                <div key={session.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{session.country}</span>
                    <Badge variant="outline" className="text-xs">{session.device}</Badge>
                  </div>
                  <span className="text-gray-500">{formatDuration(session.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographic Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Geographic Distribution
            </CardTitle>
            <CardDescription>Visitor locations and regional insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.geographic.countries.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="country" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="visits" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Top Cities</h4>
                {analytics.geographic.cities.slice(0, 5).map((city, index) => (
                  <div key={`${city.city}-${city.country}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{city.city}, {city.country}</span>
                    </div>
                    <span className="text-sm font-medium">{city.visits}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Device & Browser Analytics
            </CardTitle>
            <CardDescription>Device types and browser usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.devices.types}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="count"
                      nameKey="type"
                    >
                      {analytics.devices.types.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Device Types</h4>
                  {analytics.devices.types.map((device, index) => (
                    <div key={device.type} className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.type)}
                        <span>{device.type}</span>
                      </div>
                      <span className="font-medium">{device.percentage}%</span>
                    </div>
                  ))}
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Top Browsers</h4>
                  {analytics.devices.browsers.slice(0, 3).map((browser) => (
                    <div key={browser.browser} className="flex items-center justify-between text-sm mb-1">
                      <span>{browser.browser}</span>
                      <span className="font-medium">{browser.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Engagement Analytics
          </CardTitle>
          <CardDescription>Session trends and user engagement patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.engagement.sessions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="sessions" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Document Engagement Scores</h4>
              <div className="space-y-3">
                {analytics.engagement.documents.map((doc, index) => {
                  const scoreInfo = getEngagementScore(doc.score)
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{doc.name}</span>
                          <Badge className={scoreInfo.color}>{scoreInfo.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {doc.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" />
                            {doc.downloads} downloads
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(doc.avgTime)} avg time
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">{doc.score}</div>
                        <div className="text-xs text-gray-500">Engagement Score</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity Heatmap
          </CardTitle>
          <CardDescription>Peak activity times and usage patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-24 gap-1">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{hour}</div>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const activity = analytics.engagement.heatmap.find(
                    h => h.hour === hour && h.day === day
                  )?.activity || 0
                  const intensity = Math.min(activity / 10, 1) // Normalize to 0-1
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className="w-4 h-4 rounded-sm mb-1"
                      style={{
                        backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        border: '1px solid #e5e7eb'
                      }}
                      title={`${day} ${hour}:00 - ${activity} activities`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>Less activity</span>
            <div className="flex items-center gap-1">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity) => (
                <div
                  key={intensity}
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${intensity})` }}
                />
              ))}
            </div>
            <span>More activity</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

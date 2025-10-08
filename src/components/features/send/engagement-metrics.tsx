'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  TrendingUp,
  TrendingDown,
  Eye,
  Clock,
  FileText,
  Download,
  Printer,
  Target,
  Award
} from 'lucide-react'

interface EngagementMetricsProps {
  documentId: string
}

interface EngagementData {
  completionRate: number
  avgScrollDepth: number
  avgTimePerPage: number
  dropOffPoints: Array<{ page: number; dropOffRate: number }>
  engagementScore: number
  downloadRate: number
  printRate: number
  pageEngagement: Array<{ page: number; views: number; avgTime: number; avgScroll: number }>
}

export default function EngagementMetrics({ documentId }: EngagementMetricsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EngagementData | null>(null)

  useEffect(() => {
    loadEngagementData()
  }, [documentId])

  const loadEngagementData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/analytics/${documentId}`)
      const result = await response.json()

      if (result.success) {
        // Calculate engagement metrics from analytics data
        const pageStats = result.charts.pageStats || []
        const summary = result.summary || {}

        const engagementData: EngagementData = {
          completionRate: summary.completionRate || 0,
          avgScrollDepth: summary.avgScrollDepth || 0,
          avgTimePerPage: pageStats.length > 0
            ? pageStats.reduce((sum: number, p: any) => sum + p.avgTime, 0) / pageStats.length
            : 0,
          dropOffPoints: pageStats.map((p: any, index: number) => ({
            page: p.page,
            dropOffRate: index < pageStats.length - 1
              ? Math.max(0, ((pageStats[index].views - pageStats[index + 1]?.views || 0) / pageStats[index].views) * 100)
              : 0
          })),
          engagementScore: summary.engagementScore || 0,
          downloadRate: summary.totalViews > 0
            ? (summary.downloads / summary.totalViews) * 100
            : 0,
          printRate: summary.totalViews > 0
            ? (summary.prints / summary.totalViews) * 100
            : 0,
          pageEngagement: pageStats.map((p: any) => ({
            page: p.page,
            views: p.views,
            avgTime: p.avgTime,
            avgScroll: p.avgScroll
          }))
        }

        setData(engagementData)
      }
    } catch (error) {
      console.error('Failed to load engagement data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (score >= 40) return { label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
    return { label: 'Low', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No engagement data available</p>
      </div>
    )
  }

  const engagementLevel = getEngagementLevel(data.engagementScore)

  return (
    <div className="space-y-6">
      {/* Engagement Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            Overall Engagement Score
          </CardTitle>
          <CardDescription>
            Calculated based on completion rate, scroll depth, and time spent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-bold">{Math.round(data.engagementScore)}</span>
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <Badge className={`${engagementLevel.bg} ${engagementLevel.color} ${engagementLevel.border}`}>
                {engagementLevel.label} Engagement
              </Badge>
            </div>
            <div className="flex-1">
              <Progress value={data.engagementScore} className="h-4" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Target className="w-4 h-4" />
              Completion Rate
            </div>
            <div className="text-3xl font-bold mb-2">{Math.round(data.completionRate)}%</div>
            <Progress value={data.completionRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              Avg Scroll Depth
            </div>
            <div className="text-3xl font-bold mb-2">{Math.round(data.avgScrollDepth)}%</div>
            <Progress value={data.avgScrollDepth} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Download className="w-4 h-4" />
              Download Rate
            </div>
            <div className="text-3xl font-bold mb-2">{Math.round(data.downloadRate)}%</div>
            <Progress value={data.downloadRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Printer className="w-4 h-4" />
              Print Rate
            </div>
            <div className="text-3xl font-bold mb-2">{Math.round(data.printRate)}%</div>
            <Progress value={data.printRate} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Page Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Page-by-Page Engagement</CardTitle>
          <CardDescription>Time spent and scroll depth per page</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.pageEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="page" label={{ value: 'Page', position: 'insideBottom', offset: -5 }} />
              <YAxis yAxisId="left" label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Scroll %', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avgTime" fill="#10b981" name="Avg Time (s)" />
              <Bar yAxisId="right" dataKey="avgScroll" fill="#3b82f6" name="Avg Scroll %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drop-off Points */}
      <Card>
        <CardHeader>
          <CardTitle>Drop-off Analysis</CardTitle>
          <CardDescription>Pages where viewers tend to leave</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.dropOffPoints
              .filter(point => point.dropOffRate > 0)
              .sort((a, b) => b.dropOffRate - a.dropOffRate)
              .slice(0, 5)
              .map((point) => (
                <div key={point.page} className="flex items-center gap-4">
                  <div className="w-20 text-sm font-medium">Page {point.page}</div>
                  <div className="flex-1">
                    <Progress value={point.dropOffRate} className="h-3" />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">
                    {Math.round(point.dropOffRate)}%
                  </div>
                </div>
              ))}
            {data.dropOffPoints.filter(p => p.dropOffRate > 0).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p>Great! No significant drop-off points detected</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Engagement Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Insights</CardTitle>
          <CardDescription>AI-powered recommendations to improve engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.completionRate < 50 && (
              <div className="flex gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <TrendingDown className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-900">Low Completion Rate</div>
                  <div className="text-sm text-yellow-700 mt-1">
                    Only {Math.round(data.completionRate)}% of viewers complete the document. Consider shortening it or making the content more engaging.
                  </div>
                </div>
              </div>
            )}

            {data.avgScrollDepth < 60 && (
              <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900">Limited Scroll Depth</div>
                  <div className="text-sm text-blue-700 mt-1">
                    Viewers scroll through {Math.round(data.avgScrollDepth)}% of pages on average. Try adding more visual elements or breaking up text.
                  </div>
                </div>
              </div>
            )}

            {data.downloadRate < 10 && (
              <div className="flex gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <Download className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-purple-900">Low Download Rate</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Only {Math.round(data.downloadRate)}% of viewers download the document. Consider adding a clear call-to-action.
                  </div>
                </div>
              </div>
            )}

            {data.engagementScore >= 80 && (
              <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-green-900">Excellent Engagement!</div>
                  <div className="text-sm text-green-700 mt-1">
                    Your document has high engagement. Keep up the great work!
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


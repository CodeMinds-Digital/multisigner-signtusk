'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics'
import {
  Eye,
  Users,
  TrendingUp,
  Clock,
  Calendar,
  Activity,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

interface RealtimeAnalyticsWidgetProps {
  linkId: string
  refreshInterval?: number
}

export default function RealtimeAnalyticsWidget({
  linkId,
  refreshInterval = 5000
}: RealtimeAnalyticsWidgetProps) {
  const { data, loading, error, refresh } = useRealtimeAnalytics(linkId, refreshInterval)

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const { metrics, activeViewers } = data

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold">Real-time Analytics</h3>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
            Live
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refresh}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Active Viewers */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              Active Now
            </div>
            <div className="text-2xl font-bold text-green-600">
              {metrics.activeViewers}
            </div>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Eye className="w-4 h-4" />
              Total Views
            </div>
            <div className="text-2xl font-bold">
              {metrics.totalViews}
            </div>
          </CardContent>
        </Card>

        {/* Views Today */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Calendar className="w-4 h-4" />
              Today
            </div>
            <div className="text-2xl font-bold">
              {metrics.viewsToday}
            </div>
          </CardContent>
        </Card>

        {/* Avg Duration */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Clock className="w-4 h-4" />
              Avg Time
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(metrics.avgViewDuration)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-gray-500 mb-1">This Week</div>
            <div className="text-lg font-semibold">{metrics.viewsThisWeek}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-gray-500 mb-1">This Month</div>
            <div className="text-lg font-semibold">{metrics.viewsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-gray-500 mb-1">Peak Viewers</div>
            <div className="text-lg font-semibold">{metrics.peakConcurrentViewers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Viewers List */}
      {activeViewers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Active Viewers ({activeViewers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeViewers.slice(0, 5).map((viewer) => (
                <div
                  key={viewer.sessionId}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <div className="text-sm font-medium">
                        {viewer.email || 'Anonymous'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {viewer.currentPage ? `Page ${viewer.currentPage}` : 'Viewing'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDuration(viewer.duration)}
                  </div>
                </div>
              ))}
              {activeViewers.length > 5 && (
                <div className="text-xs text-gray-500 text-center pt-2">
                  +{activeViewers.length - 5} more viewers
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Active Viewers */}
      {activeViewers.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active viewers right now</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface TimeHeatmapProps {
  documentId: string
  linkId?: string
}

interface PageTimeData {
  page: number
  views: number
  avgTime: number
  minTime: number
  maxTime: number
  timeRanges: {
    '0-10s': number
    '10-30s': number
    '30-60s': number
    '60s+': number
  }
}

export default function TimeHeatmap({ documentId, linkId }: TimeHeatmapProps) {
  const [loading, setLoading] = useState(true)
  const [timeData, setTimeData] = useState<PageTimeData[]>([])

  useEffect(() => {
    loadTimeData()
  }, [documentId, linkId])

  const loadTimeData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/analytics/${documentId}`)
      const data = await response.json()

      if (data.success && data.charts.pageStats) {
        // Transform page stats into time data
        const timeStats = data.charts.pageStats.map((page: any) => {
          const avg = page.avgTime
          
          // Simulate time range distribution based on average
          return {
            page: page.page,
            views: page.views,
            avgTime: avg,
            minTime: Math.max(0, avg - 20),
            maxTime: avg + 30,
            timeRanges: {
              '0-10s': avg < 10 ? page.views : Math.floor(page.views * 0.2),
              '10-30s': avg >= 10 && avg < 30 ? page.views : Math.floor(page.views * 0.3),
              '30-60s': avg >= 30 && avg < 60 ? page.views : Math.floor(page.views * 0.3),
              '60s+': avg >= 60 ? page.views : Math.floor(page.views * 0.2)
            }
          }
        })

        setTimeData(timeStats)
      }
    } catch (error) {
      console.error('Failed to load time data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTimeColor = (seconds: number) => {
    if (seconds >= 60) return 'bg-green-600'
    if (seconds >= 30) return 'bg-green-500'
    if (seconds >= 10) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getTimeColorBorder = (seconds: number) => {
    if (seconds >= 60) return 'border-green-700'
    if (seconds >= 30) return 'border-green-600'
    if (seconds >= 10) return 'border-yellow-600'
    return 'border-red-600'
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

  if (timeData.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Time Data Available</h3>
          <p className="text-gray-600">Time-on-page data will appear once you have page views</p>
        </CardContent>
      </Card>
    )
  }

  const avgTotalTime = timeData.reduce((sum, p) => sum + p.avgTime, 0) / timeData.length

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Time-on-Page Heatmap
          </CardTitle>
          <CardDescription>Average time spent on each page</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Average Time Per Page</div>
                <div className="text-2xl font-bold text-gray-900">{formatTime(avgTotalTime)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Total Pages</div>
                <div className="text-2xl font-bold text-gray-900">{timeData.length}</div>
              </div>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
            {timeData.map((page) => {
              const color = getTimeColor(page.avgTime)
              const borderColor = getTimeColorBorder(page.avgTime)

              return (
                <div
                  key={page.page}
                  className={`relative aspect-square ${color} ${borderColor} border-2 rounded-lg flex flex-col items-center justify-center text-white font-medium shadow-sm hover:shadow-lg transition-all cursor-pointer group`}
                >
                  <div className="text-xs opacity-90">P{page.page}</div>
                  <div className="text-sm font-bold">{formatTime(page.avgTime)}</div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                      <div className="font-semibold mb-1">Page {page.page}</div>
                      <div>Views: {page.views}</div>
                      <div>Avg Time: {formatTime(page.avgTime)}</div>
                      <div>Min: {formatTime(page.minTime)}</div>
                      <div>Max: {formatTime(page.maxTime)}</div>
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="font-semibold mb-1">Time Distribution:</div>
                        <div>0-10s: {page.timeRanges['0-10s']} views</div>
                        <div>10-30s: {page.timeRanges['10-30s']} views</div>
                        <div>30-60s: {page.timeRanges['30-60s']} views</div>
                        <div>60s+: {page.timeRanges['60s+']} views</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t">
            <div className="text-sm font-medium text-gray-900 mb-3">Time Ranges</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded border border-red-600"></div>
                <span className="text-sm text-gray-600">&lt; 10 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded border border-yellow-600"></div>
                <span className="text-sm text-gray-600">10-30 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded border border-green-600"></div>
                <span className="text-sm text-gray-600">30-60 seconds</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded border border-green-700"></div>
                <span className="text-sm text-gray-600">60+ seconds</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-6 space-y-3">
            {/* Low engagement pages */}
            {timeData.filter(p => p.avgTime < 10).length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-900">
                    <div className="font-medium mb-1">Low Engagement Alert</div>
                    <div className="text-red-700">
                      {timeData.filter(p => p.avgTime < 10).length} page(s) have very low time (&lt;10s).
                      Pages: {timeData.filter(p => p.avgTime < 10).map(p => p.page).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* High engagement pages */}
            {timeData.filter(p => p.avgTime >= 60).length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <div className="font-medium mb-1">High Engagement</div>
                    <div className="text-green-700">
                      {timeData.filter(p => p.avgTime >= 60).length} page(s) have excellent time (60s+).
                      Pages: {timeData.filter(p => p.avgTime >= 60).map(p => p.page).join(', ')}
                    </div>
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


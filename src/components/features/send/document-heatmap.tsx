'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Flame, Eye, Clock, TrendingDown, Info } from 'lucide-react'

interface DocumentHeatmapProps {
  documentId: string
  linkId?: string
}

interface PageHeatmapData {
  page: number
  views: number
  avgTime: number
  avgScrollDepth: number
  dropOffRate: number
  engagementScore: number
}

export default function DocumentHeatmap({ documentId, linkId }: DocumentHeatmapProps) {
  const [loading, setLoading] = useState(true)
  const [heatmapData, setHeatmapData] = useState<PageHeatmapData[]>([])
  const [metric, setMetric] = useState<'views' | 'time' | 'scroll' | 'engagement'>('engagement')
  const [maxValue, setMaxValue] = useState(100)

  useEffect(() => {
    loadHeatmapData()
  }, [documentId, linkId])

  useEffect(() => {
    calculateMaxValue()
  }, [heatmapData, metric])

  const loadHeatmapData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/analytics/${documentId}`)
      const data = await response.json()

      if (data.success && data.charts.pageStats) {
        const pageStats = data.charts.pageStats.map((page: any) => ({
          page: page.page,
          views: page.views,
          avgTime: page.avgTime,
          avgScrollDepth: page.avgScroll,
          dropOffRate: 0, // Will be calculated
          engagementScore: calculatePageEngagement(page)
        }))

        // Calculate drop-off rates
        for (let i = 0; i < pageStats.length - 1; i++) {
          const current = pageStats[i]
          const next = pageStats[i + 1]
          current.dropOffRate = ((current.views - next.views) / current.views) * 100
        }

        setHeatmapData(pageStats)
      }
    } catch (error) {
      console.error('Failed to load heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculatePageEngagement = (page: any) => {
    let score = 0
    
    // Time score (0-40 points)
    if (page.avgTime >= 60) score += 40
    else if (page.avgTime >= 30) score += 30
    else if (page.avgTime >= 15) score += 20
    else score += 10

    // Scroll score (0-40 points)
    score += Math.floor(page.avgScroll * 0.4)

    // View score (0-20 points)
    if (page.views >= 50) score += 20
    else if (page.views >= 20) score += 15
    else if (page.views >= 10) score += 10
    else score += 5

    return Math.min(score, 100)
  }

  const calculateMaxValue = () => {
    if (heatmapData.length === 0) return

    let max = 0
    heatmapData.forEach(page => {
      const value = getMetricValue(page)
      if (value > max) max = value
    })

    setMaxValue(max || 100)
  }

  const getMetricValue = (page: PageHeatmapData) => {
    switch (metric) {
      case 'views':
        return page.views
      case 'time':
        return page.avgTime
      case 'scroll':
        return page.avgScrollDepth
      case 'engagement':
        return page.engagementScore
      default:
        return 0
    }
  }

  const getHeatColor = (value: number, max: number) => {
    const intensity = max > 0 ? (value / max) : 0
    
    if (intensity >= 0.8) return 'bg-red-600'
    if (intensity >= 0.6) return 'bg-orange-500'
    if (intensity >= 0.4) return 'bg-yellow-500'
    if (intensity >= 0.2) return 'bg-green-500'
    return 'bg-blue-400'
  }

  const getHeatColorBorder = (value: number, max: number) => {
    const intensity = max > 0 ? (value / max) : 0
    
    if (intensity >= 0.8) return 'border-red-700'
    if (intensity >= 0.6) return 'border-orange-600'
    if (intensity >= 0.4) return 'border-yellow-600'
    if (intensity >= 0.2) return 'border-green-600'
    return 'border-blue-500'
  }

  const formatMetricValue = (page: PageHeatmapData) => {
    switch (metric) {
      case 'views':
        return page.views.toString()
      case 'time':
        return `${Math.round(page.avgTime)}s`
      case 'scroll':
        return `${Math.round(page.avgScrollDepth)}%`
      case 'engagement':
        return Math.round(page.engagementScore).toString()
      default:
        return '0'
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'views':
        return 'Views'
      case 'time':
        return 'Avg Time'
      case 'scroll':
        return 'Scroll Depth'
      case 'engagement':
        return 'Engagement'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (heatmapData.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Flame className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Heatmap will appear once you have page view data</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-600" />
                Document Heatmap
              </CardTitle>
              <CardDescription>Visual representation of page-level engagement</CardDescription>
            </div>
            <Select value={metric} onValueChange={(v: any) => setMetric(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engagement">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    Engagement Score
                  </div>
                </SelectItem>
                <SelectItem value="views">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Count
                  </div>
                </SelectItem>
                <SelectItem value="time">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Time Spent
                  </div>
                </SelectItem>
                <SelectItem value="scroll">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Scroll Depth
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm text-gray-600">Heat Intensity:</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-400 rounded border border-blue-500"></div>
              <span className="text-xs text-gray-600">Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded border border-green-600"></div>
              <span className="text-xs text-gray-600">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-500 rounded border border-yellow-600"></div>
              <span className="text-xs text-gray-600">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500 rounded border border-orange-600"></div>
              <span className="text-xs text-gray-600">Very High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-600 rounded border border-red-700"></div>
              <span className="text-xs text-gray-600">Extreme</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {heatmapData.map((page) => {
              const value = getMetricValue(page)
              const color = getHeatColor(value, maxValue)
              const borderColor = getHeatColorBorder(value, maxValue)

              return (
                <div
                  key={page.page}
                  className={`relative aspect-square ${color} ${borderColor} border-2 rounded-lg flex flex-col items-center justify-center text-white font-medium shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
                  title={`Page ${page.page}: ${formatMetricValue(page)}`}
                >
                  <div className="text-xs opacity-90">P{page.page}</div>
                  <div className="text-sm font-bold">{formatMetricValue(page)}</div>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                      <div className="font-semibold mb-1">Page {page.page}</div>
                      <div>Views: {page.views}</div>
                      <div>Avg Time: {Math.round(page.avgTime)}s</div>
                      <div>Scroll: {Math.round(page.avgScrollDepth)}%</div>
                      <div>Engagement: {Math.round(page.engagementScore)}</div>
                      {page.dropOffRate > 0 && (
                        <div className="text-red-300">Drop-off: {Math.round(page.dropOffRate)}%</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-medium mb-1">How to read this heatmap:</div>
                <div className="text-blue-700">
                  Hover over each page to see detailed metrics. Darker colors indicate higher {getMetricLabel().toLowerCase()}.
                  Use the dropdown to switch between different metrics.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowDown, Eye, TrendingDown } from 'lucide-react'

interface ScrollDepthHeatmapProps {
  documentId: string
  linkId?: string
}

interface PageScrollData {
  page: number
  views: number
  scrollDepths: {
    '0-25': number
    '25-50': number
    '50-75': number
    '75-100': number
  }
  avgScrollDepth: number
}

export default function ScrollDepthHeatmap({ documentId, linkId }: ScrollDepthHeatmapProps) {
  const [loading, setLoading] = useState(true)
  const [scrollData, setScrollData] = useState<PageScrollData[]>([])

  useEffect(() => {
    loadScrollData()
  }, [documentId, linkId])

  const loadScrollData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/analytics/${documentId}`)
      const data = await response.json()

      if (data.success && data.charts.pageStats) {
        // Transform page stats into scroll depth data
        const scrollStats = data.charts.pageStats.map((page: any) => {
          // Simulate scroll depth distribution based on average
          // In production, you'd track actual scroll depth ranges
          const avg = page.avgScroll
          
          return {
            page: page.page,
            views: page.views,
            scrollDepths: {
              '0-25': avg < 25 ? page.views : Math.floor(page.views * 0.2),
              '25-50': avg >= 25 && avg < 50 ? page.views : Math.floor(page.views * 0.3),
              '50-75': avg >= 50 && avg < 75 ? page.views : Math.floor(page.views * 0.3),
              '75-100': avg >= 75 ? page.views : Math.floor(page.views * 0.2)
            },
            avgScrollDepth: avg
          }
        })

        setScrollData(scrollStats)
      }
    } catch (error) {
      console.error('Failed to load scroll data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScrollColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getScrollColorLight = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-100'
    if (percentage >= 50) return 'bg-yellow-100'
    if (percentage >= 25) return 'bg-orange-100'
    return 'bg-red-100'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (scrollData.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ArrowDown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Scroll Data Available</h3>
          <p className="text-gray-600">Scroll depth data will appear once you have page views</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-blue-600" />
            Scroll Depth Analysis
          </CardTitle>
          <CardDescription>How far viewers scroll on each page</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {scrollData.map((page) => (
              <div key={page.page} className="space-y-3">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-gray-900">Page {page.page}</div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Eye className="w-3 h-3" />
                      {page.views} views
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    Avg: {Math.round(page.avgScrollDepth)}%
                  </div>
                </div>

                {/* Scroll Depth Bar */}
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex">
                    {/* 0-25% */}
                    <div
                      className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: '25%' }}
                    >
                      {page.scrollDepths['0-25'] > 0 && (
                        <span>{page.scrollDepths['0-25']}</span>
                      )}
                    </div>
                    {/* 25-50% */}
                    <div
                      className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: '25%' }}
                    >
                      {page.scrollDepths['25-50'] > 0 && (
                        <span>{page.scrollDepths['25-50']}</span>
                      )}
                    </div>
                    {/* 50-75% */}
                    <div
                      className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: '25%' }}
                    >
                      {page.scrollDepths['50-75'] > 0 && (
                        <span>{page.scrollDepths['50-75']}</span>
                      )}
                    </div>
                    {/* 75-100% */}
                    <div
                      className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: '25%' }}
                    >
                      {page.scrollDepths['75-100'] > 0 && (
                        <span>{page.scrollDepths['75-100']}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <Progress value={page.avgScrollDepth} className="h-2" />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t">
            <div className="text-sm font-medium text-gray-900 mb-3">Scroll Depth Ranges</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-600">0-25%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">25-50%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">50-75%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-600">75-100%</span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-900">
              <div className="font-medium mb-1">💡 Insights</div>
              <div className="text-blue-700">
                {scrollData.filter(p => p.avgScrollDepth < 50).length > 0 ? (
                  <>
                    {scrollData.filter(p => p.avgScrollDepth < 50).length} page(s) have low scroll depth (&lt;50%).
                    Consider making content more engaging or moving important information higher.
                  </>
                ) : (
                  <>
                    Great! Most pages have good scroll depth. Viewers are engaging with your content.
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


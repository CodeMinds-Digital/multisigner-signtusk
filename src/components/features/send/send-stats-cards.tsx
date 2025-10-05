'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Eye, 
  Link as LinkIcon, 
  TrendingUp, 
  Users,
  Activity
} from 'lucide-react'

interface DashboardStats {
  totalDocuments: number
  totalLinks: number
  totalViews: number
  activeLinks: number
  totalVisitors: number
  avgEngagement: number
}

export default function SendStatsCards() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    totalLinks: 0,
    totalViews: 0,
    activeLinks: 0,
    totalVisitors: 0,
    avgEngagement: 0
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/send/dashboard/stats')
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-8 w-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 rounded mb-1"></div>
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <Badge variant="secondary">{stats.totalDocuments}</Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.totalDocuments}</h3>
          <p className="text-sm text-gray-600">Total Documents</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <LinkIcon className="w-8 h-8 text-green-600" />
            <Badge variant="secondary">{stats.totalLinks}</Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.totalLinks}</h3>
          <p className="text-sm text-gray-600">Share Links</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Eye className="w-8 h-8 text-purple-600" />
            <Badge variant="secondary">{stats.totalViews}</Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.totalViews}</h3>
          <p className="text-sm text-gray-600">Total Views</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-orange-600" />
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.activeLinks}</h3>
          <p className="text-sm text-gray-600">Active Links</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-pink-600" />
            <Badge variant="secondary">{stats.totalVisitors}</Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.totalVisitors}</h3>
          <p className="text-sm text-gray-600">Unique Visitors</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-yellow-600" />
            <Badge variant="secondary">{stats.avgEngagement}%</Badge>
          </div>
          <h3 className="text-2xl font-bold">{stats.avgEngagement}%</h3>
          <p className="text-sm text-gray-600">Avg Engagement</p>
        </CardContent>
      </Card>
    </div>
  )
}


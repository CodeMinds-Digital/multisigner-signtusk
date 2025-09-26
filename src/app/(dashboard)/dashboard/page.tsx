'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Clock,
  CheckCircle,
  RefreshCw,
  Upload,
  Users,
  Timer,
  Target,
  Activity,
  Calendar
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { type DocumentTemplate } from '@/types/drive'
import { getEnhancedDashboardStats, type EnhancedDashboardStats } from '@/lib/enhanced-dashboard-stats'
import { ResponsiveStatsCards, type StatCardData } from '@/components/ui/responsive-stats-cards'
import { UploadDocument } from '@/components/features/documents/upload-document'
import { getStatusConfig } from '@/utils/document-status'



export default function DashboardPage() {
  const { user } = useAuth()
  const [enhancedStats, setEnhancedStats] = useState<EnhancedDashboardStats | null>(null)
  const [recentDocuments, setRecentDocuments] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const loadDashboardData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('🔄 Loading dashboard data...')

      // Use the same API approach as Drive tab for consistency
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const { data } = await response.json()
        console.log('✅ Dashboard stats loaded from API:', data)
        setEnhancedStats({
          ...data,
          recentDocuments: [],
          trends: { documents: 0, signatures: 0, completion: 0 }
        })
      } else {
        console.error('❌ Dashboard stats API failed, trying enhanced stats fallback')

        // Fallback to enhanced stats
        try {
          const stats = await getEnhancedDashboardStats()
          console.log('✅ Enhanced stats fallback loaded:', stats)
          setEnhancedStats(stats)
        } catch (statsError) {
          console.error('❌ Both API and enhanced stats failed:', statsError)
          // Set fallback data to prevent blank dashboard
          setEnhancedStats({
            totalDocuments: 0,
            pendingSignatures: 0,
            completedDocuments: 0,
            expiredDocuments: 0,
            draftDocuments: 0,
            todayActivity: 0,
            weekActivity: 0,
            monthActivity: 0,
            totalSignatures: 0,
            averageCompletionTime: 0,
            successRate: 0,
            recentDocuments: [],
            trends: { documents: 0, signatures: 0, completion: 0 }
          })
        }
      }

      // Get recent documents using the same API approach as Drive
      try {
        const docsResponse = await fetch('/api/drive/templates')
        if (docsResponse.ok) {
          const { data: documents } = await docsResponse.json()
          setRecentDocuments(documents.slice(0, 5))
          console.log('✅ Recent documents loaded:', documents.length)
        } else {
          console.error('❌ Failed to load recent documents from API')
          setRecentDocuments([])
        }
      } catch (docsError) {
        console.error('❌ Failed to load recent documents:', docsError)
        setRecentDocuments([])
      }

    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboardData()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadDashboardData])

  // Create stats cards configuration
  const createStatsCards = useCallback((): StatCardData[] => {
    if (!enhancedStats) return []

    return [
      {
        id: 'total',
        title: 'Total Documents',
        value: enhancedStats.totalDocuments,
        description: 'All documents in your account',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        trend: {
          value: enhancedStats.trends.documents,
          label: 'vs last month',
          isPositive: enhancedStats.trends.documents >= 0
        },
        onClick: () => setActiveFilter('all'),
        isActive: activeFilter === 'all'
      },
      {
        id: 'pending',
        title: 'Pending Signatures',
        value: enhancedStats.pendingSignatures,
        description: 'Awaiting signatures',
        icon: Clock,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        onClick: () => setActiveFilter('pending'),
        isActive: activeFilter === 'pending'
      },
      {
        id: 'completed',
        title: 'Completed',
        value: enhancedStats.completedDocuments,
        description: 'Successfully signed',
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        onClick: () => setActiveFilter('completed'),
        isActive: activeFilter === 'completed'
      },
      {
        id: 'success-rate',
        title: 'Success Rate',
        value: `${enhancedStats.successRate}%`,
        description: 'Completion percentage',
        icon: Target,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50'
      }
    ]
  }, [enhancedStats, activeFilter])

  // Create activity cards
  const createActivityCards = useCallback((): StatCardData[] => {
    if (!enhancedStats) return []

    return [
      {
        id: 'today',
        title: 'Today',
        value: enhancedStats.todayActivity,
        description: 'Documents created today',
        icon: Calendar,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      },
      {
        id: 'week',
        title: 'This Week',
        value: enhancedStats.weekActivity,
        description: 'Weekly activity',
        icon: Activity,
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      },
      {
        id: 'signatures',
        title: 'Total Signatures',
        value: enhancedStats.totalSignatures,
        description: 'Signatures collected',
        icon: Users,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50'
      },
      {
        id: 'avg-time',
        title: 'Avg. Completion',
        value: `${enhancedStats.averageCompletionTime}h`,
        description: 'Average completion time',
        icon: Timer,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50'
      }
    ]
  }, [enhancedStats])

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays <= 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your document signing activities</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button
            variant="outline"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Overview</h2>
          <ResponsiveStatsCards
            cards={createStatsCards()}
            loading={loading}
            showTrends={true}
            cardSize="md"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Metrics</h2>
          <ResponsiveStatsCards
            cards={createActivityCards()}
            loading={loading}
            cardSize="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Your latest uploaded documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading documents...
              </div>
            ) : recentDocuments.length > 0 ? (
              <div className="space-y-4">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.type || 'Document'} • {getTimeAgo(doc.created_at)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {(() => {
                        const config = getStatusConfig(doc.status as any)
                        // Defensive check for undefined config or missing icon
                        if (!config || !config.icon) {
                          console.warn('Invalid document status or missing config:', doc.status, config)
                          // Fallback to a default config
                          const Icon = FileText
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded-full inline-flex items-center bg-gray-50 text-gray-800">
                              <Icon className="w-3 h-3 text-gray-600 mr-1" />
                              {doc.status || 'Unknown'}
                            </span>
                          )
                        }

                        const Icon = config.icon
                        return (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full inline-flex items-center ${config.bgColor} ${config.textColor}`}>
                            <Icon className={`w-3 h-3 ${config.color} mr-1`} />
                            {config.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No documents yet
              </div>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Upload Document Modal */}
      <UploadDocument
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          loadDashboardData()
          setIsUploadModalOpen(false)
        }}
      />
    </div>
  )
}

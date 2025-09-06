'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, AlertTriangle, RefreshCw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { getDashboardStats, getDocuments, type Document as DocumentType } from '@/lib/document-store'
import { UploadDocument } from '@/components/features/documents/upload-document'
import { getStatusConfig } from '@/utils/document-status'



export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalDocuments: 0,
    pendingSignatures: 0,
    completedDocuments: 0,
    expiredDocuments: 0
  })
  const [recentDocuments, setRecentDocuments] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  const loadDashboardData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get stats
      const dashboardStats = await getDashboardStats(user.id)
      setStats({
        totalDocuments: dashboardStats.total,
        pendingSignatures: dashboardStats.pending,
        completedDocuments: dashboardStats.completed,
        expiredDocuments: dashboardStats.expired
      })

      // Get recent documents
      const documents = await getDocuments(user.id)
      setRecentDocuments(documents.slice(0, 5))

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const getActivityText = (status: string) => {
    switch (status) {
      case 'pending': return 'sent for signature'
      case 'completed': return 'completed'
      case 'expired': return 'expired'
      case 'draft': return 'created as draft'
      default: return 'updated'
    }
  }

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              All documents in your account
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.pendingSignatures}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting signatures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Successfully signed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats.expiredDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>
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
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title || doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.settings?.document_type || 'Document'} • {getTimeAgo(doc.created_at)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {(() => {
                        const config = getStatusConfig(doc.status as any)
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

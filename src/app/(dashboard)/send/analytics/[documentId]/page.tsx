'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  Eye,
  Clock,
  Activity,
  MapPin,
  FileText
} from 'lucide-react'
import AnalyticsDashboard from '@/components/features/send/analytics-dashboard'
import RealtimeAnalyticsWidget from '@/components/features/send/realtime-analytics-widget'
import VisitorList from '@/components/features/send/visitor-list'
import EngagementMetrics from '@/components/features/send/engagement-metrics'
import DocumentHeatmap from '@/components/features/send/document-heatmap'
import ScrollDepthHeatmap from '@/components/features/send/scroll-depth-heatmap'
import TimeHeatmap from '@/components/features/send/time-heatmap'
import AnalyticsExportButton from '@/components/features/send/analytics-export-button'
import GeographicMap from '@/components/features/send/geographic-map'
import GeolocationInsights from '@/components/features/send/geolocation-insights'
import EngagementLeaderboard from '@/components/features/send/engagement-leaderboard'
import { useAuth } from '@/components/providers/secure-auth-provider'

export default function DocumentAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const documentId = params.documentId as string

  const [loading, setLoading] = useState(true)
  const [document, setDocument] = useState<any>(null)
  const [links, setLinks] = useState<any[]>([])
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadDocument()
      loadLinks()
    }
  }, [user, documentId])

  const loadDocument = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/documents/${documentId}`)
      const data = await response.json()

      if (data.success) {
        setDocument(data.document)
      }
    } catch (error) {
      console.error('Failed to load document:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLinks = async () => {
    try {
      const response = await fetch(`/api/send/links/create?documentId=${documentId}`)
      const data = await response.json()

      if (data.success && data.links) {
        setLinks(data.links)
        if (data.links.length > 0) {
          setSelectedLinkId(data.links[0].link_id)
        }
      }
    } catch (error) {
      console.error('Failed to load links:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Document not found</h2>
          <p className="text-gray-600 mb-4">The document you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/send')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/send')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
            <p className="text-gray-600 mt-1">Analytics & Insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadDocument()
              loadLinks()
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <AnalyticsExportButton
            documentId={documentId}
            linkId={selectedLinkId || undefined}
            documentTitle={document?.title}
          />
        </div>
      </div>

      {/* Link Selector */}
      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Share Link</CardTitle>
            <CardDescription>View analytics for a specific share link</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedLinkId === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLinkId(null)}
                className={selectedLinkId === null ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                All Links
              </Button>
              {links.map((link) => (
                <Button
                  key={link.id}
                  variant={selectedLinkId === link.link_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLinkId(link.link_id)}
                  className={selectedLinkId === link.link_id ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {link.name || link.link_id}
                  <span className="ml-2 text-xs opacity-75">
                    ({link.view_count || 0} views)
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Activity className="w-4 h-4 mr-2" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="visitors">
            <Users className="w-4 h-4 mr-2" />
            Visitors
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <Eye className="w-4 h-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="heatmap">
            <Activity className="w-4 h-4 mr-2" />
            Heatmaps
          </TabsTrigger>
          <TabsTrigger value="geography">
            <Globe className="w-4 h-4 mr-2" />
            Geography
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <AnalyticsDashboard documentId={documentId} />
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          {selectedLinkId ? (
            <RealtimeAnalyticsWidget linkId={selectedLinkId} />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Share Link
                </h3>
                <p className="text-gray-600">
                  Choose a specific share link to view real-time analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Visitors Tab */}
        <TabsContent value="visitors" className="space-y-6">
          <EngagementLeaderboard documentId={documentId} linkId={selectedLinkId || undefined} limit={10} />
          <VisitorList documentId={documentId} linkId={selectedLinkId || undefined} />
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          <EngagementMetrics documentId={documentId} />
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap" className="space-y-6">
          <DocumentHeatmap documentId={documentId} linkId={selectedLinkId || undefined} />
          <ScrollDepthHeatmap documentId={documentId} linkId={selectedLinkId || undefined} />
          <TimeHeatmap documentId={documentId} linkId={selectedLinkId || undefined} />
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <GeographicMap documentId={documentId} linkId={selectedLinkId || undefined} />
          <GeolocationInsights documentId={documentId} linkId={selectedLinkId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  )
}


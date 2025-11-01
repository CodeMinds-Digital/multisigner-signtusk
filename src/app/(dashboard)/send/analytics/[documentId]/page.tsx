'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  FileText,
  Globe
} from 'lucide-react'
import AnalyticsDashboard from '@/components/features/send/analytics-dashboard'
import RealtimeAnalyticsWidget from '@/components/features/send/realtime-analytics-widget'
import VisitorList from '@/components/features/send/visitor-list'
import EngagementMetrics from '@/components/features/send/engagement-metrics'
import DocumentHeatmap from '@/components/features/send/document-heatmap'
import ScrollDepthHeatmap from '@/components/features/send/scroll-depth-heatmap'
import TimeHeatmap from '@/components/features/send/time-heatmap'
import AnalyticsExportButton from '@/components/features/send/analytics-export-button'
import { AdvancedAnalyticsExportComponent } from '@/components/features/send/advanced-analytics-export'
import GeographicMap from '@/components/features/send/geographic-map'
import GeolocationInsights from '@/components/features/send/geolocation-insights'
import EngagementLeaderboard from '@/components/features/send/engagement-leaderboard'
import { useAuth } from '@/components/providers/secure-auth-provider'

export default function DocumentAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const documentId = params.documentId as string
  const linkIdFromUrl = searchParams.get('linkId')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<any>(null)
  const [links, setLinks] = useState<any[]>([])
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadDocument()
      loadLinks()
    }
  }, [user, documentId])

  const loadDocument = async (retryCount = 0) => {
    try {
      setLoading(true)
      // Use the analytics endpoint to get both document and analytics data
      const response = await fetch(`/api/send/analytics/${documentId}`)

      // Handle Next.js compilation timing issues
      if (!response.ok && response.status === 500 && retryCount < 3) {
        console.log(`Analytics API not ready, retrying... (${retryCount + 1}/3)`)
        setTimeout(() => loadDocument(retryCount + 1), 1000)
        return
      }

      const data = await response.json()

      if (data.success) {
        setDocument(data.document)
        // The analytics endpoint should also return links data
        if (data.links) {
          setLinks(data.links)
          // If linkId is provided in URL, use that; otherwise use first link
          if (linkIdFromUrl) {
            // Check if the linkId from URL exists in the links
            const linkExists = data.links.some((link: any) => link.link_id === linkIdFromUrl)
            if (linkExists) {
              setSelectedLinkId(linkIdFromUrl)
            } else {
              // Fallback to first link if URL linkId doesn't exist
              setSelectedLinkId(data.links.length > 0 ? data.links[0].link_id : null)
            }
          } else if (data.links.length > 0) {
            setSelectedLinkId(data.links[0].link_id)
          }
        }
      } else {
        console.error('Analytics API error:', data.error)
        if (retryCount >= 3) {
          setError('Unable to load analytics data. Please refresh the page.')
        }
      }
    } catch (error) {
      console.error('Failed to load document analytics:', error)
      if (retryCount >= 3) {
        setError('Unable to load analytics data. Please refresh the page.')
      }
    } finally {
      if (retryCount >= 3) {
        setLoading(false)
      }
    }
  }

  const loadLinks = async () => {
    // This is now handled in loadDocument() via the analytics endpoint
    // No separate call needed since analytics endpoint provides everything
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Loading Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={() => { setError(null); setLoading(true); loadDocument(); }}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => router.push('/send')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
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

      {/* Link Selector - Only show when no specific linkId is provided in URL */}
      {links.length > 0 && !linkIdFromUrl && (
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

      {/* Specific Link Analytics - Show when linkId is provided in URL */}
      {linkIdFromUrl && selectedLinkId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analytics for Share Link</CardTitle>
            <CardDescription>Viewing analytics for link: {selectedLinkId}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {selectedLinkId}
              </Badge>
              <span className="text-sm text-gray-600">
                {links.find(link => link.link_id === selectedLinkId)?.view_count || 0} views
              </span>
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
          <TabsTrigger value="export">
            <Download className="w-4 h-4 mr-2" />
            Export
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

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <AdvancedAnalyticsExportComponent
            documentId={documentId}
            documentTitle={document?.title || 'Document'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}


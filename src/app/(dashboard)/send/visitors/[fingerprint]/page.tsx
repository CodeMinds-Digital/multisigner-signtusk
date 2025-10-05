'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  MapPin,
  Monitor,
  Clock,
  Eye,
  Download,
  Printer,
  Calendar,
  Activity,
  TrendingUp,
  FileText,
  Globe
} from 'lucide-react'
import VisitorProfileComponent from '@/components/features/send/visitor-profile'
import EngagementScoreCard from '@/components/features/send/engagement-score-card'
import { SendEngagementScoring, EngagementFactors } from '@/lib/send-engagement-scoring'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { format } from 'date-fns'

export default function VisitorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const fingerprint = params.fingerprint as string

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user, fingerprint])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/send/visitors/profile/${fingerprint}`)
      const data = await response.json()

      if (data.success) {
        setProfile(data.visitor)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (score >= 40) return { label: 'Average', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
    return { label: 'Low', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Visitor not found</h2>
          <p className="text-gray-600 mb-4">The visitor profile you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/send')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Calculate engagement score using new system
  const engagementFactors: EngagementFactors = {
    viewDuration: profile.totalDuration || 0,
    avgTimePerPage: profile.avgSessionDuration || 0,
    totalSessions: profile.visitCount || 1,
    pagesViewed: profile.stats?.pagesViewed || 0,
    totalPages: 10, // TODO: Get from document
    completionRate: ((profile.stats?.pagesViewed || 0) / 10) * 100,
    avgScrollDepth: 75, // TODO: Calculate from page views
    downloads: profile.stats?.totalDownloads || 0,
    prints: profile.stats?.totalPrints || 0,
    feedbackSubmitted: false,
    ndaAccepted: false,
    isReturningVisitor: profile.isReturning || false,
    previousVisits: profile.visitCount - 1 || 0,
    rapidBounce: (profile.avgSessionDuration || 0) < 10,
    deepEngagement: (profile.totalDuration || 0) >= 300
  }

  const engagementScoreData = SendEngagementScoring.calculateScore(engagementFactors)
  const engagementScore = engagementScoreData.total
  const engagementLevel = engagementScoreData.level

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visitor Profile</h1>
            <p className="text-gray-600 mt-1 font-mono text-sm">{fingerprint}</p>
          </div>
        </div>
        {profile.isReturning && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Returning Visitor
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Eye className="w-4 h-4" />
              Total Visits
            </div>
            <div className="text-3xl font-bold">{profile.visitCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Clock className="w-4 h-4" />
              Total Time
            </div>
            <div className="text-3xl font-bold">{formatDuration(profile.totalDuration || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Activity className="w-4 h-4" />
              Avg Session
            </div>
            <div className="text-3xl font-bold">
              {formatDuration(profile.avgSessionDuration || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <TrendingUp className="w-4 h-4" />
              Engagement
            </div>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{Math.round(engagementScore)}</div>
              <Badge className={`${engagementLevel.bg} ${engagementLevel.color} ${engagementLevel.border}`}>
                {engagementLevel.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device & Location Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Device Type</span>
              <span className="font-medium capitalize">{profile.sessions?.[0]?.deviceType || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Browser</span>
              <span className="font-medium">{profile.sessions?.[0]?.browser || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Operating System</span>
              <span className="font-medium">{profile.sessions?.[0]?.os || 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Country</span>
              <span className="font-medium">{profile.sessions?.[0]?.country || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">City</span>
              <span className="font-medium">{profile.sessions?.[0]?.city || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">First Visit</span>
              <span className="font-medium">
                {profile.firstVisitAt ? format(new Date(profile.firstVisitAt), 'MMM d, yyyy') : 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="engagement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="engagement">
            <TrendingUp className="w-4 h-4 mr-2" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Calendar className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents Viewed
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="w-4 h-4 mr-2" />
            Activity Timeline
          </TabsTrigger>
        </TabsList>

        {/* Engagement Tab */}
        <TabsContent value="engagement">
          <EngagementScoreCard
            score={engagementScoreData}
            showBreakdown={true}
            showInsights={true}
            showRecommendations={true}
          />
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>All viewing sessions for this visitor</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.sessions && profile.sessions.length > 0 ? (
                <div className="space-y-4">
                  {profile.sessions.map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {format(new Date(session.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Duration: {formatDuration(session.duration || 0)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {session.city}, {session.country}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="capitalize">
                          {session.deviceType || 'Unknown'}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {session.browser}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No sessions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <VisitorProfileComponent
            fingerprint={fingerprint}
            documentId={undefined}
            linkId={undefined}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Chronological activity history</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.events && profile.events.length > 0 ? (
                <div className="space-y-4">
                  {profile.events.map((event: any, index: number) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          {event.type === 'download' && <Download className="w-4 h-4 text-green-600" />}
                          {event.type === 'print' && <Printer className="w-4 h-4 text-green-600" />}
                          {event.type === 'page_view' && <Eye className="w-4 h-4 text-green-600" />}
                        </div>
                        {index < profile.events.length - 1 && (
                          <div className="w-0.5 h-12 bg-gray-200"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="font-medium text-gray-900 capitalize">
                          {event.type.replace('_', ' ')}
                          {event.pageNumber && ` - Page ${event.pageNumber}`}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(event.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p>No activity found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


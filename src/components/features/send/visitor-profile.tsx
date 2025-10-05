'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Clock,
  Eye,
  MapPin,
  Monitor,
  Globe,
  Calendar,
  Activity,
  TrendingUp,
  Smartphone,
  Tablet,
  Laptop
} from 'lucide-react'
import { format } from 'date-fns'

interface VisitorProfileProps {
  fingerprint: string
  documentId?: string
  linkId?: string
}

interface VisitorData {
  fingerprint: string
  visitCount: number
  firstVisitAt: string
  lastVisitAt: string
  totalDuration: number
  sessions: Array<{
    id: string
    createdAt: string
    duration: number
    country?: string
    city?: string
    deviceType?: string
    browser?: string
    os?: string
    ipAddress?: string
  }>
}

export default function VisitorProfile({ fingerprint, documentId, linkId }: VisitorProfileProps) {
  const [loading, setLoading] = useState(true)
  const [visitor, setVisitor] = useState<VisitorData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadVisitorData()
  }, [fingerprint, documentId, linkId])

  const loadVisitorData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (documentId) params.append('documentId', documentId)
      if (linkId) params.append('linkId', linkId)

      const response = await fetch(`/api/send/visitors/profile/${fingerprint}?${params.toString()}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      setVisitor(data.visitor)
    } catch (err: any) {
      setError(err.message || 'Failed to load visitor data')
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

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />
      case 'tablet':
        return <Tablet className="w-4 h-4" />
      default:
        return <Laptop className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error || !visitor) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Visitor not found'}</p>
      </div>
    )
  }

  const avgSessionDuration = visitor.totalDuration / visitor.visitCount
  const isReturning = visitor.visitCount > 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <User className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Visitor Profile
                  {isReturning && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Returning
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  {fingerprint.substring(0, 16)}...
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Eye className="w-4 h-4" />
                Total Visits
              </div>
              <div className="text-2xl font-bold">{visitor.visitCount}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                Total Time
              </div>
              <div className="text-2xl font-bold">{formatDuration(visitor.totalDuration)}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Activity className="w-4 h-4" />
                Avg Session
              </div>
              <div className="text-2xl font-bold">{formatDuration(Math.round(avgSessionDuration))}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <TrendingUp className="w-4 h-4" />
                Engagement
              </div>
              <div className="text-2xl font-bold">
                {visitor.visitCount > 3 ? 'High' : visitor.visitCount > 1 ? 'Medium' : 'Low'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Visit Timeline</CardTitle>
          <CardDescription>
            First visit: {format(new Date(visitor.firstVisitAt), 'MMM d, yyyy h:mm a')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {visitor.sessions.map((session, index) => (
              <div
                key={session.id}
                className="flex items-start gap-4 pb-4 border-b last:border-0"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium">
                      Visit #{visitor.visitCount - index}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(session.createdAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                    {session.duration > 0 && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(session.duration)}
                      </div>
                    )}
                    {session.browser && (
                      <div className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {session.browser}
                      </div>
                    )}
                    {session.os && (
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {session.os}
                      </div>
                    )}
                    {(session.city || session.country) && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[session.city, session.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Device & Location Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visitor.sessions[0]?.deviceType && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Device Type</span>
                  <span className="font-medium capitalize">{visitor.sessions[0].deviceType}</span>
                </div>
              )}
              {visitor.sessions[0]?.browser && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Browser</span>
                  <span className="font-medium">{visitor.sessions[0].browser}</span>
                </div>
              )}
              {visitor.sessions[0]?.os && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Operating System</span>
                  <span className="font-medium">{visitor.sessions[0].os}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visitor.sessions[0]?.country && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Country</span>
                  <span className="font-medium">{visitor.sessions[0].country}</span>
                </div>
              )}
              {visitor.sessions[0]?.city && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">City</span>
                  <span className="font-medium">{visitor.sessions[0].city}</span>
                </div>
              )}
              {visitor.sessions[0]?.ipAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">IP Address</span>
                  <span className="font-medium font-mono text-sm">{visitor.sessions[0].ipAddress}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


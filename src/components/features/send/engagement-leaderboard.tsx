'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award, User } from 'lucide-react'
import { SendEngagementScoring, EngagementFactors } from '@/lib/send-engagement-scoring'

interface EngagementLeaderboardProps {
  documentId: string
  linkId?: string
  limit?: number
}

interface VisitorEngagement {
  fingerprint: string
  email?: string
  score: number
  level: string
  visits: number
  duration: number
  pagesViewed: number
}

export default function EngagementLeaderboard({ 
  documentId, 
  linkId,
  limit = 10 
}: EngagementLeaderboardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [visitors, setVisitors] = useState<VisitorEngagement[]>([])

  useEffect(() => {
    loadLeaderboard()
  }, [documentId, linkId])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Fetch visitor sessions
      const response = await fetch(`/api/send/visitors/session?documentId=${documentId}${linkId ? `&linkId=${linkId}` : ''}`)
      const data = await response.json()

      if (data.success && data.visitors) {
        // Calculate engagement score for each visitor
        const visitorScores = data.visitors.map((visitor: any) => {
          const factors: EngagementFactors = {
            viewDuration: visitor.totalDuration || 0,
            avgTimePerPage: visitor.avgSessionDuration || 0,
            totalSessions: visitor.visitCount || 1,
            pagesViewed: visitor.stats?.pagesViewed || 0,
            totalPages: 10, // TODO: Get from document
            completionRate: ((visitor.stats?.pagesViewed || 0) / 10) * 100,
            avgScrollDepth: 75, // TODO: Calculate from page views
            downloads: visitor.stats?.totalDownloads || 0,
            prints: visitor.stats?.totalPrints || 0,
            feedbackSubmitted: false,
            ndaAccepted: false,
            isReturningVisitor: visitor.isReturning || false,
            previousVisits: visitor.visitCount - 1 || 0,
            rapidBounce: (visitor.avgSessionDuration || 0) < 10,
            deepEngagement: (visitor.totalDuration || 0) >= 300
          }

          const score = SendEngagementScoring.calculateScore(factors)

          return {
            fingerprint: visitor.fingerprint,
            email: visitor.email,
            score: score.total,
            level: score.level,
            visits: visitor.visitCount || 1,
            duration: visitor.totalDuration || 0,
            pagesViewed: visitor.stats?.pagesViewed || 0
          }
        })

        // Sort by score and limit
        const topVisitors = visitorScores
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, limit)

        setVisitors(topVisitors)
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
    if (index === 2) return <Award className="w-5 h-5 text-orange-600" />
    return <span className="text-sm font-semibold text-gray-600">#{index + 1}</span>
  }

  const getRankBadge = (index: number) => {
    if (index === 0) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (index === 1) return 'bg-gray-100 text-gray-800 border-gray-300'
    if (index === 2) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-blue-100 text-blue-800 border-blue-300'
  }

  const formatDuration = (seconds: number) => {
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

  if (visitors.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Visitors Yet</h3>
          <p className="text-gray-600">Leaderboard will appear once you have visitors</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          Engagement Leaderboard
        </CardTitle>
        <CardDescription>Top {limit} most engaged visitors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visitors.map((visitor, index) => (
            <div
              key={visitor.fingerprint}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-shadow ${getRankBadge(index)}`}
              onClick={() => router.push(`/send/visitors/${visitor.fingerprint}`)}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 flex items-center justify-center">
                {getRankIcon(index)}
              </div>

              {/* Visitor Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="font-mono text-sm font-medium text-gray-900 truncate">
                    {visitor.fingerprint.substring(0, 12)}...
                  </span>
                  {visitor.email && (
                    <span className="text-xs text-gray-600 truncate">
                      {visitor.email}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span>{visitor.visits} visits</span>
                  <span>•</span>
                  <span>{formatDuration(visitor.duration)}</span>
                  <span>•</span>
                  <span>{visitor.pagesViewed} pages</span>
                </div>
              </div>

              {/* Score */}
              <div className="flex-shrink-0 text-right">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {visitor.score}
                </div>
                <Badge 
                  variant="outline" 
                  className={SendEngagementScoring.getLevelColor(visitor.level)}
                >
                  {visitor.level}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {visitors.length > 0 ? Math.round(visitors.reduce((sum, v) => sum + v.score, 0) / visitors.length) : 0}
              </div>
              <div className="text-xs text-gray-600">Avg Score</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.score >= 70).length}
              </div>
              <div className="text-xs text-gray-600">High Engagement</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {visitors.filter(v => v.visits > 1).length}
              </div>
              <div className="text-xs text-gray-600">Returning</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


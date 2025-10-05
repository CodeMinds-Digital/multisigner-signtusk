'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, TrendingDown, Minus, Lightbulb, Target } from 'lucide-react'
import { SendEngagementScoring, EngagementScore } from '@/lib/send-engagement-scoring'

interface EngagementScoreCardProps {
  score: EngagementScore
  showBreakdown?: boolean
  showInsights?: boolean
  showRecommendations?: boolean
  previousScore?: number
}

export default function EngagementScoreCard({
  score,
  showBreakdown = true,
  showInsights = true,
  showRecommendations = true,
  previousScore
}: EngagementScoreCardProps) {
  const levelColor = SendEngagementScoring.getLevelColor(score.level)
  const levelIcon = SendEngagementScoring.getLevelIcon(score.level)

  // Calculate trend if previous score provided
  let trend = null
  if (previousScore !== undefined) {
    trend = SendEngagementScoring.calculateTrend(score.total, previousScore)
  }

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-600" />
            Engagement Score
          </CardTitle>
          <CardDescription>Overall engagement quality (0-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Score Display */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-green-50 to-blue-50 border-4 border-green-200 mb-4">
                <div className="text-5xl font-bold text-green-600">{score.total}</div>
              </div>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${levelColor}`}>
                <span className="text-2xl">{levelIcon}</span>
                <span className="font-semibold text-lg">{score.level}</span>
              </div>
              
              {/* Trend Indicator */}
              {trend && (
                <div className="mt-3">
                  {trend.direction === 'up' && (
                    <div className="inline-flex items-center gap-1 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        +{trend.change} from last visit ({trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  {trend.direction === 'down' && (
                    <div className="inline-flex items-center gap-1 text-red-600">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {trend.change} from last visit ({trend.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                  {trend.direction === 'stable' && (
                    <div className="inline-flex items-center gap-1 text-gray-600">
                      <Minus className="w-4 h-4" />
                      <span className="text-sm font-medium">Similar to last visit</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Score Breakdown */}
            {showBreakdown && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">Score Breakdown</h3>
                
                {/* Time Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Time Engagement</span>
                    <span className="font-medium text-gray-900">
                      {score.breakdown.timeScore}/30
                    </span>
                  </div>
                  <Progress value={(score.breakdown.timeScore / 30) * 100} className="h-2" />
                </div>

                {/* Interaction Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Content Interaction</span>
                    <span className="font-medium text-gray-900">
                      {score.breakdown.interactionScore}/30
                    </span>
                  </div>
                  <Progress value={(score.breakdown.interactionScore / 30) * 100} className="h-2" />
                </div>

                {/* Action Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Actions Taken</span>
                    <span className="font-medium text-gray-900">
                      {score.breakdown.actionScore}/25
                    </span>
                  </div>
                  <Progress value={(score.breakdown.actionScore / 25) * 100} className="h-2" />
                </div>

                {/* Loyalty Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">Visitor Loyalty</span>
                    <span className="font-medium text-gray-900">
                      {score.breakdown.loyaltyScore}/15
                    </span>
                  </div>
                  <Progress value={(score.breakdown.loyaltyScore / 15) * 100} className="h-2" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {showInsights && score.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {score.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {showRecommendations && score.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-blue-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {score.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


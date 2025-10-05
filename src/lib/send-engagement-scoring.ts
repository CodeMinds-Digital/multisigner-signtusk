/**
 * Send Engagement Scoring System
 * Calculate engagement scores (0-100) based on multiple factors
 */

export interface EngagementFactors {
  // Time-based factors
  viewDuration: number // seconds
  avgTimePerPage: number // seconds
  totalSessions: number
  
  // Page interaction factors
  pagesViewed: number
  totalPages: number
  completionRate: number // 0-100
  avgScrollDepth: number // 0-100
  
  // Action-based factors
  downloads: number
  prints: number
  feedbackSubmitted: boolean
  ndaAccepted: boolean
  
  // Engagement patterns
  isReturningVisitor: boolean
  previousVisits: number
  timeSpentOnKeyPages?: number[] // seconds per key page
  
  // Interaction quality
  rapidBounce: boolean // left within 10 seconds
  deepEngagement: boolean // spent 5+ minutes
}

export interface EngagementScore {
  total: number // 0-100
  level: 'Excellent' | 'Good' | 'Average' | 'Low' | 'Poor'
  breakdown: {
    timeScore: number // 0-30
    interactionScore: number // 0-30
    actionScore: number // 0-25
    loyaltyScore: number // 0-15
  }
  insights: string[]
  recommendations: string[]
}

export class SendEngagementScoring {
  /**
   * Calculate comprehensive engagement score
   */
  static calculateScore(factors: EngagementFactors): EngagementScore {
    const timeScore = this.calculateTimeScore(factors)
    const interactionScore = this.calculateInteractionScore(factors)
    const actionScore = this.calculateActionScore(factors)
    const loyaltyScore = this.calculateLoyaltyScore(factors)

    const total = Math.min(
      Math.round(timeScore + interactionScore + actionScore + loyaltyScore),
      100
    )

    const level = this.getEngagementLevel(total)
    const insights = this.generateInsights(factors, total)
    const recommendations = this.generateRecommendations(factors, total)

    return {
      total,
      level,
      breakdown: {
        timeScore: Math.round(timeScore),
        interactionScore: Math.round(interactionScore),
        actionScore: Math.round(actionScore),
        loyaltyScore: Math.round(loyaltyScore)
      },
      insights,
      recommendations
    }
  }

  /**
   * Calculate time-based score (0-30 points)
   */
  private static calculateTimeScore(factors: EngagementFactors): number {
    let score = 0

    // View duration score (0-15 points)
    if (factors.viewDuration >= 600) score += 15 // 10+ minutes
    else if (factors.viewDuration >= 300) score += 12 // 5-10 minutes
    else if (factors.viewDuration >= 180) score += 9 // 3-5 minutes
    else if (factors.viewDuration >= 60) score += 6 // 1-3 minutes
    else if (factors.viewDuration >= 30) score += 3 // 30s-1m
    else score += 1 // < 30s

    // Average time per page (0-10 points)
    if (factors.avgTimePerPage >= 60) score += 10
    else if (factors.avgTimePerPage >= 30) score += 7
    else if (factors.avgTimePerPage >= 15) score += 4
    else score += 1

    // Penalty for rapid bounce
    if (factors.rapidBounce) score -= 5

    // Bonus for deep engagement
    if (factors.deepEngagement) score += 5

    return Math.max(0, Math.min(score, 30))
  }

  /**
   * Calculate interaction score (0-30 points)
   */
  private static calculateInteractionScore(factors: EngagementFactors): number {
    let score = 0

    // Completion rate (0-15 points)
    score += (factors.completionRate / 100) * 15

    // Scroll depth (0-10 points)
    score += (factors.avgScrollDepth / 100) * 10

    // Pages viewed relative to total (0-5 points)
    const pageRatio = factors.pagesViewed / factors.totalPages
    if (pageRatio >= 1.0) score += 5 // Viewed all pages
    else if (pageRatio >= 0.75) score += 4
    else if (pageRatio >= 0.5) score += 3
    else if (pageRatio >= 0.25) score += 2
    else score += 1

    return Math.max(0, Math.min(score, 30))
  }

  /**
   * Calculate action score (0-25 points)
   */
  private static calculateActionScore(factors: EngagementFactors): number {
    let score = 0

    // Downloads (0-10 points)
    if (factors.downloads >= 3) score += 10
    else if (factors.downloads >= 2) score += 7
    else if (factors.downloads >= 1) score += 5

    // Prints (0-5 points)
    if (factors.prints >= 2) score += 5
    else if (factors.prints >= 1) score += 3

    // NDA acceptance (0-5 points)
    if (factors.ndaAccepted) score += 5

    // Feedback submission (0-5 points)
    if (factors.feedbackSubmitted) score += 5

    return Math.max(0, Math.min(score, 25))
  }

  /**
   * Calculate loyalty score (0-15 points)
   */
  private static calculateLoyaltyScore(factors: EngagementFactors): number {
    let score = 0

    // Returning visitor bonus (0-5 points)
    if (factors.isReturningVisitor) score += 5

    // Previous visits (0-5 points)
    if (factors.previousVisits >= 5) score += 5
    else if (factors.previousVisits >= 3) score += 4
    else if (factors.previousVisits >= 2) score += 3
    else if (factors.previousVisits >= 1) score += 2

    // Multiple sessions (0-5 points)
    if (factors.totalSessions >= 5) score += 5
    else if (factors.totalSessions >= 3) score += 4
    else if (factors.totalSessions >= 2) score += 3
    else score += 1

    return Math.max(0, Math.min(score, 15))
  }

  /**
   * Get engagement level from score
   */
  static getEngagementLevel(score: number): 'Excellent' | 'Good' | 'Average' | 'Low' | 'Poor' {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Average'
    if (score >= 20) return 'Low'
    return 'Poor'
  }

  /**
   * Get color for engagement level
   */
  static getLevelColor(level: string): string {
    switch (level) {
      case 'Excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'Good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Average': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'Low': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'Poor': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  /**
   * Get icon for engagement level
   */
  static getLevelIcon(level: string): string {
    switch (level) {
      case 'Excellent': return '🌟'
      case 'Good': return '👍'
      case 'Average': return '👌'
      case 'Low': return '⚠️'
      case 'Poor': return '❌'
      default: return '❓'
    }
  }

  /**
   * Generate insights from engagement data
   */
  private static generateInsights(factors: EngagementFactors, score: number): string[] {
    const insights: string[] = []

    // Time insights
    if (factors.viewDuration >= 600) {
      insights.push('Exceptional time investment - viewer is highly interested')
    } else if (factors.viewDuration < 30) {
      insights.push('Very short visit - content may not be engaging enough')
    }

    // Completion insights
    if (factors.completionRate >= 90) {
      insights.push('Viewer read through almost the entire document')
    } else if (factors.completionRate < 25) {
      insights.push('Viewer only saw the first few pages - consider improving early content')
    }

    // Action insights
    if (factors.downloads > 0) {
      insights.push('Downloaded the document - strong purchase intent')
    }
    if (factors.ndaAccepted) {
      insights.push('Accepted NDA - serious business interest')
    }

    // Loyalty insights
    if (factors.isReturningVisitor && factors.previousVisits >= 3) {
      insights.push('Highly engaged returning visitor - excellent lead quality')
    }

    // Scroll depth insights
    if (factors.avgScrollDepth >= 80) {
      insights.push('Deep scroll engagement - thoroughly reviewing content')
    }

    return insights
  }

  /**
   * Generate recommendations based on engagement
   */
  private static generateRecommendations(factors: EngagementFactors, score: number): string[] {
    const recommendations: string[] = []

    // Low engagement recommendations
    if (score < 40) {
      recommendations.push('Follow up with personalized email to re-engage')
      recommendations.push('Consider A/B testing document structure')
    }

    // Incomplete viewing recommendations
    if (factors.completionRate < 50) {
      recommendations.push('Highlight key information earlier in the document')
      recommendations.push('Add table of contents for easier navigation')
    }

    // No actions taken
    if (factors.downloads === 0 && factors.prints === 0) {
      recommendations.push('Add clear call-to-action buttons')
      recommendations.push('Make download/print options more prominent')
    }

    // High engagement recommendations
    if (score >= 70) {
      recommendations.push('Excellent engagement - prioritize this lead for follow-up')
      if (!factors.ndaAccepted) {
        recommendations.push('Consider requesting NDA for next steps')
      }
    }

    // Returning visitor recommendations
    if (factors.isReturningVisitor) {
      recommendations.push('Send updated version or additional resources')
      recommendations.push('Schedule a call to discuss further')
    }

    return recommendations
  }

  /**
   * Calculate engagement trend (comparing current to previous)
   */
  static calculateTrend(current: number, previous: number): {
    direction: 'up' | 'down' | 'stable'
    change: number
    percentage: number
  } {
    const change = current - previous
    const percentage = previous > 0 ? (change / previous) * 100 : 0

    let direction: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(change) >= 5) {
      direction = change > 0 ? 'up' : 'down'
    }

    return { direction, change, percentage }
  }
}


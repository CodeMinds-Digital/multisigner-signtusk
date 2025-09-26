import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class UpstashAnalytics {
  // Track document views with automatic aggregation
  static async trackDocumentView(requestId: string, userId: string, domain?: string) {
    const today = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()

    await Promise.all([
      // Daily document views
      redis.incr(`analytics:doc_views:${today}`),
      // Hourly views for real-time charts
      redis.incr(`analytics:doc_views:${today}:${hour}`),
      // Document-specific views
      redis.incr(`analytics:doc:${requestId}:views`),
      // Domain-specific views (for corporate dashboard)
      domain ? redis.incr(`analytics:domain:${domain}:views:${today}`) : Promise.resolve(),
      // User activity tracking
      redis.sadd(`analytics:active_users:${today}`, userId),
      // Set expiration for cleanup
      redis.expire(`analytics:doc_views:${today}:${hour}`, 86400 * 7), // 7 days
    ])
  }

  // Track signature completions
  static async trackSignatureCompletion(requestId: string, signerEmail: string, domain?: string) {
    const today = new Date().toISOString().split('T')[0]
    const timestamp = Date.now()

    await Promise.all([
      // Daily signature count
      redis.incr(`analytics:signatures:${today}`),
      // Domain-specific signatures
      domain ? redis.incr(`analytics:domain:${domain}:signatures:${today}`) : Promise.resolve(),
      // Recent signatures for real-time feed
      redis.lpush('analytics:recent_signatures', JSON.stringify({
        requestId,
        signerEmail,
        timestamp,
        domain
      })),
      // Keep only last 1000 recent signatures
      redis.ltrim('analytics:recent_signatures', 0, 999),
      // Track completion time (for performance metrics)
      redis.lpush(`analytics:completion_times:${today}`, timestamp),
      redis.ltrim(`analytics:completion_times:${today}`, 0, 999)
    ])
  }

  // Track TOTP verifications for security analytics
  static async trackTOTPVerification(userId: string, success: boolean, domain?: string) {
    const today = new Date().toISOString().split('T')[0]

    await Promise.all([
      // Daily TOTP attempts
      redis.incr(`analytics:totp_attempts:${today}`),
      // Success/failure tracking
      success ? redis.incr(`analytics:totp_success:${today}`) : redis.incr(`analytics:totp_failed:${today}`),
      // Domain-specific TOTP usage
      domain ? redis.incr(`analytics:domain:${domain}:totp:${today}`) : Promise.resolve(),
      // User-specific tracking for security monitoring
      redis.lpush(`analytics:user_totp:${userId}`, JSON.stringify({
        success,
        timestamp: Date.now()
      })),
      redis.ltrim(`analytics:user_totp:${userId}`, 0, 99) // Keep last 100
    ])
  }

  // Get real-time analytics dashboard data
  static async getRealtimeAnalytics(domain?: string) {
    const today = new Date().toISOString().split('T')[0]
    const _currentHour = new Date().getHours()

    const baseKeys = domain ? [
      `analytics:domain:${domain}:views:${today}`,
      `analytics:domain:${domain}:signatures:${today}`,
      `analytics:domain:${domain}:totp:${today}`
    ] : [
      `analytics:doc_views:${today}`,
      `analytics:signatures:${today}`,
      `analytics:totp_attempts:${today}`
    ]

    const [views, signatures, totpAttempts, activeUsers, recentSignatures] = await Promise.all([
      redis.get(baseKeys[0]),
      redis.get(baseKeys[1]),
      redis.get(baseKeys[2]),
      redis.scard(`analytics:active_users:${today}`),
      redis.lrange('analytics:recent_signatures', 0, 9) // Last 10
    ])

    return {
      todayViews: parseInt(views as string || '0'),
      todaySignatures: parseInt(signatures as string || '0'),
      todayTOTPAttempts: parseInt(totpAttempts as string || '0'),
      activeUsers: activeUsers || 0,
      recentSignatures: (recentSignatures as string[]).map(s => JSON.parse(s)),
      timestamp: Date.now()
    }
  }

  // Get hourly analytics for charts
  static async getHourlyAnalytics(date: string = new Date().toISOString().split('T')[0]) {
    const hours = Array.from({ length: 24 }, (_, i) => i)

    const hourlyData = await Promise.all(
      hours.map(async (hour) => {
        const [views, signatures] = await Promise.all([
          redis.get(`analytics:doc_views:${date}:${hour}`),
          redis.get(`analytics:signatures:${date}:${hour}`)
        ])

        return {
          hour,
          views: parseInt(views as string || '0'),
          signatures: parseInt(signatures as string || '0')
        }
      })
    )

    return hourlyData
  }

  // Corporate domain analytics aggregation
  static async aggregateDomainAnalytics(domain: string, date: string) {
    const [views, signatures, totpUsage, activeUsers] = await Promise.all([
      redis.get(`analytics:domain:${domain}:views:${date}`),
      redis.get(`analytics:domain:${domain}:signatures:${date}`),
      redis.get(`analytics:domain:${domain}:totp:${date}`),
      redis.scard(`analytics:domain:${domain}:active_users:${date}`)
    ])

    const aggregatedData = {
      domain,
      date,
      views: parseInt(views as string || '0'),
      signatures: parseInt(signatures as string || '0'),
      totpUsage: parseInt(totpUsage as string || '0'),
      activeUsers: activeUsers || 0,
      aggregatedAt: Date.now()
    }

    // Cache aggregated data for corporate dashboard
    await redis.setex(
      `domain_analytics:${domain}:${date}`,
      86400 * 7, // 7 days
      JSON.stringify(aggregatedData)
    )

    return aggregatedData
  }

  // Performance monitoring
  static async trackAPIPerformance(endpoint: string, duration: number, success: boolean) {
    const today = new Date().toISOString().split('T')[0]

    await Promise.all([
      // Track response times
      redis.lpush(`perf:${endpoint}:${today}`, duration),
      redis.ltrim(`perf:${endpoint}:${today}`, 0, 999), // Keep last 1000
      // Track success/error rates
      success ? redis.incr(`perf:${endpoint}:success:${today}`) : redis.incr(`perf:${endpoint}:error:${today}`),
      // Set expiration
      redis.expire(`perf:${endpoint}:${today}`, 86400 * 7) // 7 days
    ])
  }

  // Get API performance metrics
  static async getAPIPerformance(endpoint: string, date: string = new Date().toISOString().split('T')[0]) {
    const [responseTimes, successCount, errorCount] = await Promise.all([
      redis.lrange(`perf:${endpoint}:${date}`, 0, -1),
      redis.get(`perf:${endpoint}:success:${date}`),
      redis.get(`perf:${endpoint}:error:${date}`)
    ])

    const times = (responseTimes as string[]).map(t => parseInt(t))
    const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
    const maxResponseTime = times.length > 0 ? Math.max(...times) : 0
    const minResponseTime = times.length > 0 ? Math.min(...times) : 0

    return {
      endpoint,
      date,
      avgResponseTime: Math.round(avgResponseTime),
      maxResponseTime,
      minResponseTime,
      successCount: parseInt(successCount as string || '0'),
      errorCount: parseInt(errorCount as string || '0'),
      totalRequests: parseInt(successCount as string || '0') + parseInt(errorCount as string || '0')
    }
  }
}

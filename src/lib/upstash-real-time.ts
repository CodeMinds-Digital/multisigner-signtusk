import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class UpstashRealTime {
  // Real-time document status updates
  static async publishDocumentUpdate(requestId: string, update: any) {
    await redis.publish(`document:${requestId}`, JSON.stringify({
      ...update,
      timestamp: Date.now()
    }))

    // Also update cached document status
    await redis.setex(
      `doc_status:${requestId}`,
      3600, // 1 hour
      JSON.stringify(update)
    )
  }

  // Real-time corporate dashboard updates
  static async publishDomainMetrics(domain: string, metrics: any) {
    await redis.publish(`domain:${domain}:metrics`, JSON.stringify({
      ...metrics,
      timestamp: Date.now()
    }))
  }

  // Real-time user notifications
  static async publishUserNotification(userId: string, notification: any) {
    await redis.publish(`user:${userId}:notifications`, JSON.stringify(notification))
    
    // Increment unread count
    await redis.incr(`unread_count:${userId}`)
  }

  // Real-time signature progress
  static async publishSignatureProgress(requestId: string, progress: any) {
    await redis.publish(`signature_progress:${requestId}`, JSON.stringify({
      ...progress,
      timestamp: Date.now()
    }))

    // Cache current progress
    await redis.setex(
      `progress:${requestId}`,
      7200, // 2 hours
      JSON.stringify(progress)
    )
  }

  // Subscribe to document updates (for SSE endpoints)
  static async subscribeToDocumentUpdates(requestId: string, callback: (data: any) => void) {
    // This would be used in SSE endpoints
    const subscriber = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })

    // Note: Upstash Redis doesn't support traditional pub/sub
    // Instead, we'll use polling with cached data for real-time updates
    return setInterval(async () => {
      const status = await redis.get(`doc_status:${requestId}`)
      if (status) {
        callback(JSON.parse(status as string))
      }
    }, 1000) // Poll every second
  }

  // Get real-time analytics for corporate dashboard
  static async getRealTimeAnalytics(domain: string) {
    const [activeUsers, todaySignatures, pendingDocs] = await Promise.all([
      redis.scard(`active_users:${domain}:${new Date().toISOString().split('T')[0]}`),
      redis.get(`signatures_today:${domain}`),
      redis.get(`pending_docs:${domain}`)
    ])

    return {
      activeUsers: activeUsers || 0,
      todaySignatures: parseInt(todaySignatures as string || '0'),
      pendingDocuments: parseInt(pendingDocs as string || '0'),
      timestamp: Date.now()
    }
  }

  // Track real-time user activity
  static async trackUserActivity(userId: string, domain: string, activity: string) {
    const today = new Date().toISOString().split('T')[0]
    
    await Promise.all([
      // Add user to today's active users
      redis.sadd(`active_users:${domain}:${today}`, userId),
      // Set expiration for cleanup
      redis.expire(`active_users:${domain}:${today}`, 86400), // 24 hours
      // Track activity
      redis.lpush(`user_activity:${userId}`, JSON.stringify({
        activity,
        timestamp: Date.now()
      })),
      // Keep only last 100 activities
      redis.ltrim(`user_activity:${userId}`, 0, 99)
    ])
  }
}

// Helper functions to integrate Redis throughout the application
import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from './upstash-config'
import { UpstashAnalytics } from './upstash-analytics'
import { RedisCacheService } from './redis-cache-service'
import { UpstashJobQueue } from './upstash-job-queue'

/**
 * Wrapper for API routes to add Redis features
 */
export function withRedisFeatures(handler: Function, options: {
  rateLimitType?: 'api' | 'auth' | 'corporateAdmin' | 'email' | 'pdfGeneration' | 'totp' | 'verify'
  enableAnalytics?: boolean
  enableCaching?: boolean
  cacheTTL?: number
  requireAuth?: boolean
} = {}) {
  return async (request: NextRequest, ...args: any[]) => {
    const startTime = Date.now()
    const pathname = request.nextUrl.pathname
    const method = request.method
    const ip = request.ip || 'unknown'

    try {
      // 1. Rate Limiting
      if (options.rateLimitType) {
        const rateLimiter = rateLimiters[options.rateLimitType] || rateLimiters.api
        const { success, limit, remaining, reset } = await rateLimiter.limit(ip)

        if (!success) {
          await UpstashAnalytics.trackAPIPerformance(pathname, Date.now() - startTime, false)
          return NextResponse.json(
            { 
              error: 'Too many requests',
              limit,
              remaining: 0,
              reset: new Date(reset).toISOString()
            },
            { 
              status: 429,
              headers: {
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString()
              }
            }
          )
        }
      }

      // 2. Cache Check (for GET requests)
      if (method === 'GET' && options.enableCaching) {
        const cacheKey = generateCacheKey(request)
        const cached = await RedisCacheService.getUserProfile(cacheKey) // Generic cache get
        
        if (cached) {
          await UpstashAnalytics.trackAPIPerformance(pathname, Date.now() - startTime, true)
          return NextResponse.json(cached, {
            headers: { 'X-Cache': 'HIT' }
          })
        }
      }

      // 3. Execute original handler
      const response = await handler(request, ...args)

      // 4. Cache Response (for successful GET requests)
      if (method === 'GET' && options.enableCaching && response.status === 200) {
        const cacheKey = generateCacheKey(request)
        const responseData = await response.clone().json()
        await RedisCacheService.cacheUserProfile(cacheKey, responseData) // Generic cache set
      }

      // 5. Analytics Tracking
      if (options.enableAnalytics) {
        const duration = Date.now() - startTime
        const success = response.status < 400
        await UpstashAnalytics.trackAPIPerformance(pathname, duration, success)
      }

      return response

    } catch (error) {
      console.error('❌ Redis wrapper error:', error)
      
      // Track error
      if (options.enableAnalytics) {
        await UpstashAnalytics.trackAPIPerformance(pathname, Date.now() - startTime, false)
      }

      // Continue with original handler if Redis fails
      return await handler(request, ...args)
    }
  }
}

/**
 * Queue background jobs without blocking the response
 */
export async function queueBackgroundJobs(jobs: Array<{
  type: 'email' | 'notification' | 'audit' | 'pdf' | 'analytics'
  data: any
  delay?: number
  priority?: 'high' | 'normal' | 'low'
}>) {
  try {
    const promises = jobs.map(job => {
      switch (job.type) {
        case 'email':
          return UpstashJobQueue.queueEmail(job.data, job.delay, job.priority)
        case 'notification':
          return UpstashJobQueue.queueNotification(job.data, job.delay)
        case 'audit':
          return UpstashJobQueue.queueAuditLog(job.data)
        case 'pdf':
          return UpstashJobQueue.queuePDFGeneration(job.data.requestId, job.priority)
        case 'analytics':
          return UpstashJobQueue.queueAnalyticsAggregation(job.data.domain, job.data.date)
        default:
          return Promise.resolve()
      }
    })

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('❌ Error queuing background jobs:', error)
  }
}

/**
 * Track user activity for analytics
 */
export async function trackUserActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: any
) {
  try {
    // Queue audit log
    await UpstashJobQueue.queueAuditLog({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      timestamp: Date.now()
    })

    // Track specific analytics based on action
    if (action === 'view' && resourceType === 'document' && resourceId) {
      const userEmail = metadata?.email
      const domain = userEmail ? extractDomainFromEmail(userEmail) : undefined
      await UpstashAnalytics.trackDocumentView(resourceId, userId, domain)
    }

    if (action === 'sign' && resourceType === 'document' && resourceId) {
      const userEmail = metadata?.email
      const domain = userEmail ? extractDomainFromEmail(userEmail) : undefined
      await UpstashAnalytics.trackSignatureCompletion(resourceId, userEmail || '', domain)
    }

    if (action === 'totp_verify' && resourceType === 'auth') {
      const userEmail = metadata?.email
      const domain = userEmail ? extractDomainFromEmail(userEmail) : undefined
      const success = metadata?.success || false
      await UpstashAnalytics.trackTOTPVerification(userId, success, domain)
    }

  } catch (error) {
    console.error('❌ Error tracking user activity:', error)
  }
}

/**
 * Invalidate related caches when data changes
 */
export async function invalidateRelatedCaches(
  type: 'user' | 'document' | 'domain' | 'notification',
  identifier: string,
  additionalKeys?: string[]
) {
  try {
    switch (type) {
      case 'user':
        await RedisCacheService.invalidateUserCache(identifier)
        break
      case 'document':
        await RedisCacheService.invalidateDocument(identifier)
        break
      case 'domain':
        await RedisCacheService.invalidateDomainCache(identifier)
        break
      case 'notification':
        await RedisCacheService.invalidateNotificationPrefs(identifier)
        break
    }

    // Invalidate additional keys if provided
    if (additionalKeys) {
      for (const key of additionalKeys) {
        await RedisCacheService.invalidateUserProfile(key) // Generic invalidation
      }
    }

  } catch (error) {
    console.error('❌ Error invalidating caches:', error)
  }
}

/**
 * Get cached data with fallback to database
 */
export async function getCachedData<T>(
  cacheKey: string,
  fallbackFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  try {
    // Try cache first
    const cached = await RedisCacheService.getUserProfile(cacheKey) // Generic cache get
    if (cached) {
      return cached as T
    }

    // Fallback to database
    const data = await fallbackFn()
    
    // Cache the result
    await RedisCacheService.cacheUserProfile(cacheKey, data) // Generic cache set
    
    return data

  } catch (error) {
    console.error('❌ Error getting cached data:', error)
    // Return fallback data if cache fails
    return await fallbackFn()
  }
}

/**
 * Batch operations for better performance
 */
export async function batchCacheOperations(operations: Array<{
  type: 'set' | 'get' | 'delete'
  key: string
  value?: any
  ttl?: number
}>) {
  try {
    const promises = operations.map(op => {
      switch (op.type) {
        case 'set':
          return RedisCacheService.cacheUserProfile(op.key, op.value) // Generic cache set
        case 'get':
          return RedisCacheService.getUserProfile(op.key) // Generic cache get
        case 'delete':
          return RedisCacheService.invalidateUserProfile(op.key) // Generic cache delete
        default:
          return Promise.resolve()
      }
    })

    return await Promise.allSettled(promises)

  } catch (error) {
    console.error('❌ Error in batch cache operations:', error)
    return []
  }
}

/**
 * Session management helpers
 */
export async function getSessionWithCache(sessionId: string) {
  try {
    const { getSession } = await import('./redis-session-store')
    return await getSession(sessionId)
  } catch (error) {
    console.error('❌ Error getting session:', error)
    return null
  }
}

export async function invalidateUserSessions(userId: string) {
  try {
    const { revokeAllUserSessions } = await import('./redis-session-store')
    await revokeAllUserSessions(userId)
  } catch (error) {
    console.error('❌ Error invalidating user sessions:', error)
  }
}

/**
 * Real-time update helpers
 */
export async function publishRealTimeUpdate(
  type: 'document' | 'user' | 'corporate',
  identifier: string,
  update: any
) {
  try {
    const { UpstashRealTime } = await import('./upstash-real-time')
    
    switch (type) {
      case 'document':
        await UpstashRealTime.publishDocumentUpdate(identifier, update)
        break
      case 'user':
        await UpstashRealTime.publishUserNotification(identifier, update)
        break
      case 'corporate':
        await UpstashRealTime.publishCorporateUpdate(identifier, update)
        break
    }

  } catch (error) {
    console.error('❌ Error publishing real-time update:', error)
  }
}

// Helper functions
function generateCacheKey(request: NextRequest): string {
  const url = request.url
  const method = request.method
  return `api_cache:${method}:${Buffer.from(url).toString('base64').slice(0, 32)}`
}

function extractDomainFromEmail(email: string): string | undefined {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : undefined
}

/**
 * Health check for Redis services
 */
export async function checkRedisHealth() {
  try {
    const { checkRedisHealth } = await import('./upstash-config')
    return await checkRedisHealth()
  } catch (error) {
    return { status: 'unhealthy', error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Initialize Redis services
 */
export async function initializeRedisServices() {
  try {
    const { validateUpstashConfig } = await import('./upstash-config')
    validateUpstashConfig()
    
    console.log('✅ Redis services initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize Redis services:', error)
    return false
  }
}

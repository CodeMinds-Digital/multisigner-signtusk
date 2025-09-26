import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/upstash-config'
import { UpstashAnalytics } from '@/lib/upstash-analytics'
import { RedisCacheService } from '@/lib/redis-cache-service'

// Rate limiting configuration for different endpoints
const RATE_LIMIT_CONFIG = {
  '/api/auth/': rateLimiters.auth,
  '/api/admin/': rateLimiters.corporateAdmin,
  '/api/signature-requests/sign': rateLimiters.api,
  '/api/auth/totp/verify': rateLimiters.totp,
  '/api/verify': rateLimiters.verify,
  '/api/jobs/generate-pdf': rateLimiters.pdfGeneration,
  '/api/jobs/send-email': rateLimiters.email,
  default: rateLimiters.api
}

// Analytics tracking configuration
const ANALYTICS_ENDPOINTS = [
  '/api/signature-requests/',
  '/api/documents/',
  '/api/auth/',
  '/api/verify',
  '/api/admin/',
  '/sign/',
  '/documents/'
]

export async function redisMiddleware(request: NextRequest) {
  const startTime = Date.now()
  const pathname = request.nextUrl.pathname
  const method = request.method
  const userAgent = request.headers.get('user-agent') || ''
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

  try {
    // 1. Rate Limiting
    const rateLimitResult = await applyRateLimit(request, pathname, ip)
    if (!rateLimitResult.success) {
      return rateLimitResult.response
    }

    // 2. Security checks
    const securityResult = await performSecurityChecks(request, ip, userAgent)
    if (!securityResult.success) {
      return securityResult.response
    }

    // 3. Cache checks for GET requests
    if (method === 'GET') {
      const cacheResult = await checkCache(request, pathname)
      if (cacheResult.hit && (cacheResult as any).response) {
        // Track cache hit
        await UpstashAnalytics.trackAPIPerformance(pathname, Date.now() - startTime, true)
        return (cacheResult as any).response
      }
    }

    // Continue to the actual handler
    return NextResponse.next()

  } catch (error) {
    console.error('❌ Redis middleware error:', error)

    // Track error
    await UpstashAnalytics.trackAPIPerformance(pathname, Date.now() - startTime, false)

    // Continue without middleware features if Redis is down
    return NextResponse.next()
  }
}

async function applyRateLimit(request: NextRequest, pathname: string, ip: string) {
  try {
    // Determine which rate limiter to use
    let rateLimiter = RATE_LIMIT_CONFIG.default

    for (const [path, limiter] of Object.entries(RATE_LIMIT_CONFIG)) {
      if (path !== 'default' && pathname.startsWith(path)) {
        rateLimiter = limiter
        break
      }
    }

    // Apply rate limiting
    const identifier = ip
    const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)

    if (!success) {
      console.log('🚫 Rate limit exceeded:', { pathname, ip, limit, remaining })

      // Track rate limit violation
      await RedisCacheService.trackFailedAttempt(`rate_limit:${ip}`)

      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            limit,
            remaining: 0,
            reset: new Date(reset).toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString()
            }
          }
        )
      }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Rate limiting error:', error)
    return { success: true } // Allow request if rate limiting fails
  }
}

async function performSecurityChecks(request: NextRequest, ip: string, userAgent: string) {
  try {
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i
    ]

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent))

    if (isSuspicious) {
      console.log('🚨 Suspicious user agent detected:', { ip, userAgent })

      // Track suspicious activity
      await RedisCacheService.trackFailedAttempt(`suspicious:${ip}`)

      // Check if this IP has too many suspicious attempts
      const suspiciousCount = await RedisCacheService.getFailedAttempts(`suspicious:${ip}`)

      if (suspiciousCount > 10) {
        return {
          success: false,
          response: new NextResponse(
            JSON.stringify({ error: 'Access denied' }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }

    // Check for failed login attempts
    const pathname = request.nextUrl.pathname
    if (pathname.includes('/auth/login') || pathname.includes('/auth/signup')) {
      const failedAttempts = await RedisCacheService.getFailedAttempts(`auth:${ip}`)

      if (failedAttempts > 5) {
        console.log('🚫 Too many failed auth attempts:', { ip, attempts: failedAttempts })

        return {
          success: false,
          response: new NextResponse(
            JSON.stringify({
              error: 'Too many failed attempts. Please try again later.',
              retryAfter: 3600 // 1 hour
            }),
            {
              status: 429,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Security check error:', error)
    return { success: true } // Allow request if security checks fail
  }
}

async function checkCache(request: NextRequest, pathname: string) {
  try {
    // Only cache specific GET endpoints
    const cacheableEndpoints = [
      '/api/documents/',
      '/api/notifications',
      '/api/user/profile',
      '/api/admin/analytics'
    ]

    const isCacheable = cacheableEndpoints.some(endpoint => pathname.startsWith(endpoint))

    if (!isCacheable) {
      return { hit: false }
    }

    // Generate cache key
    const url = request.url
    const cacheKey = `api_cache:${Buffer.from(url).toString('base64').slice(0, 32)}`

    // Check cache
    const cachedResponse = await RedisCacheService.getCacheStats() // This is a placeholder

    // For now, we'll skip actual response caching and just return cache miss
    // In a full implementation, you'd cache serialized responses

    return { hit: false }

  } catch (error) {
    console.error('❌ Cache check error:', error)
    return { hit: false }
  }
}

// Analytics tracking for responses
export async function trackResponse(
  request: NextRequest,
  response: NextResponse,
  startTime: number
) {
  try {
    const pathname = request.nextUrl.pathname
    const method = request.method
    const status = response.status
    const duration = Date.now() - startTime
    const success = status < 400

    // Track API performance
    await UpstashAnalytics.trackAPIPerformance(pathname, duration, success)

    // Track specific events
    if (pathname.includes('/sign/') && method === 'POST') {
      // Document signing event
      const userId = request.headers.get('x-user-id') // Assuming user ID is in header
      if (userId) {
        await UpstashAnalytics.trackSignatureCompletion(
          pathname.split('/').pop() || '',
          request.headers.get('x-user-email') || '',
          extractDomainFromEmail(request.headers.get('x-user-email') || '')
        )
      }
    }

    if (pathname.includes('/documents/') && method === 'GET') {
      // Document view event
      const userId = request.headers.get('x-user-id')
      const documentId = pathname.split('/').pop()
      if (userId && documentId) {
        await UpstashAnalytics.trackDocumentView(
          documentId,
          userId,
          extractDomainFromEmail(request.headers.get('x-user-email') || '')
        )
      }
    }

    if (pathname.includes('/auth/totp/verify') && method === 'POST') {
      // TOTP verification event
      const userId = request.headers.get('x-user-id')
      if (userId) {
        await UpstashAnalytics.trackTOTPVerification(
          userId,
          success,
          extractDomainFromEmail(request.headers.get('x-user-email') || '')
        )
      }
    }

  } catch (error) {
    console.error('❌ Analytics tracking error:', error)
  }
}

function extractDomainFromEmail(email: string): string | undefined {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : undefined
}

// Utility function to check if endpoint should be tracked
export function shouldTrackEndpoint(pathname: string): boolean {
  return ANALYTICS_ENDPOINTS.some(endpoint => pathname.startsWith(endpoint))
}

// =====================================================
// SIGNATURE RATE LIMITING MIDDLEWARE (Comment 9)
// Provides rate limiting for signature API endpoints
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { rateLimiters } from '@/lib/upstash-config'

export interface RateLimitResult {
  success: boolean
  response?: NextResponse
  limit?: number
  remaining?: number
  reset?: number
}

/**
 * Check rate limit for signature operations
 * @param userId - User ID for rate limiting
 * @param ip - IP address for additional rate limiting
 * @param key - Rate limit key (signature, bulk, reminder)
 */
export async function checkRateLimit(
  userId: string,
  ip: string,
  key: 'signature' | 'signatureBulk' | 'signatureReminder' = 'signature'
): Promise<RateLimitResult> {
  try {
    const rateLimiter = rateLimiters[key]
    const identifier = `${userId}:${ip}`

    const { success, limit, remaining, reset } = await rateLimiter.limit(identifier)

    if (!success) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests. Please try again later.',
              details: {
                limit,
                remaining: 0,
                reset: new Date(reset).toISOString(),
                retryAfter: Math.ceil((reset - Date.now()) / 1000),
              },
            },
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        ),
        limit,
        remaining: 0,
        reset,
      }
    }

    return {
      success: true,
      limit,
      remaining,
      reset,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Allow request if rate limiting fails
    return { success: true }
  }
}

/**
 * Apply rate limiting to a Next.js API route handler
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  key: 'signature' | 'signatureBulk' | 'signatureReminder' = 'signature'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Extract user ID from request (assuming it's in headers or context)
    const userId = request.headers.get('x-user-id') || 'anonymous'
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'

    const rateLimitResult = await checkRateLimit(userId, ip, key)

    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    // Add rate limit headers to response
    const response = await handler(request)

    if (rateLimitResult.limit && rateLimitResult.remaining !== undefined && rateLimitResult.reset) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
    }

    return response
  }
}


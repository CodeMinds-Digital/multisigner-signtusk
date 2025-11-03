// =====================================================
// SIGNATURE CACHING MIDDLEWARE (Comment 10)
// Provides Redis caching for signature templates and analytics
// =====================================================

import { NextResponse } from 'next/server'
import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from '@/lib/upstash-config'

/**
 * Cache signature template
 */
export async function cacheTemplate(templateId: string, template: any): Promise<void> {
  try {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_TEMPLATE, templateId)
    await RedisUtils.setWithTTL(key, template, CACHE_TTL.SIGNATURE_TEMPLATE)
  } catch (error) {
    console.error('Failed to cache template:', error)
  }
}

/**
 * Get cached signature template
 */
export async function getCachedTemplate(templateId: string): Promise<any | null> {
  try {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_TEMPLATE, templateId)
    return await RedisUtils.get(key)
  } catch (error) {
    console.error('Failed to get cached template:', error)
    return null
  }
}

/**
 * Invalidate signature template cache
 */
export async function invalidateTemplateCache(templateId: string): Promise<void> {
  try {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_TEMPLATE, templateId)
    await RedisUtils.del(key)
  } catch (error) {
    console.error('Failed to invalidate template cache:', error)
  }
}

/**
 * Cache signature analytics
 */
export async function cacheAnalytics(
  userId: string,
  analyticsType: string,
  data: any
): Promise<void> {
  try {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_ANALYTICS, userId, analyticsType)
    await RedisUtils.setWithTTL(key, data, CACHE_TTL.SIGNATURE_ANALYTICS)
  } catch (error) {
    console.error('Failed to cache analytics:', error)
  }
}

/**
 * Get cached signature analytics
 */
export async function getCachedAnalytics(
  userId: string,
  analyticsType: string
): Promise<any | null> {
  try {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_ANALYTICS, userId, analyticsType)
    return await RedisUtils.get(key)
  } catch (error) {
    console.error('Failed to get cached analytics:', error)
    return null
  }
}

/**
 * Invalidate signature analytics cache
 */
export async function invalidateAnalyticsCache(userId: string, analyticsType?: string): Promise<void> {
  try {
    if (analyticsType) {
      const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_ANALYTICS, userId, analyticsType)
      await RedisUtils.del(key)
    } else {
      // Invalidate all analytics for user
      const pattern = `${CACHE_KEYS.SIGNATURE_ANALYTICS}:${userId}:*`
      // Note: Pattern deletion requires scanning, which is expensive
      // For now, we'll just delete specific known types
      const types = ['stats', 'recent', 'trends']
      await Promise.all(
        types.map((type) => {
          const key = RedisUtils.buildKey(CACHE_KEYS.SIGNATURE_ANALYTICS, userId, type)
          return RedisUtils.del(key)
        })
      )
    }
  } catch (error) {
    console.error('Failed to invalidate analytics cache:', error)
  }
}

/**
 * Add Cache-Control headers to response
 */
export function addCacheHeaders(
  response: NextResponse,
  maxAge: number = CACHE_TTL.SIGNATURE_TEMPLATE,
  isPrivate: boolean = true
): NextResponse {
  const cacheControl = isPrivate
    ? `private, max-age=${maxAge}, must-revalidate`
    : `public, max-age=${maxAge}, s-maxage=${maxAge * 2}`

  response.headers.set('Cache-Control', cacheControl)
  response.headers.set('ETag', `W/"${Date.now()}"`)
  response.headers.set('Vary', 'Accept-Encoding')

  return response
}

/**
 * Wrap a handler with caching logic
 */
export function withCache<T>(
  cacheKey: string,
  ttl: number,
  handler: () => Promise<T>
): Promise<T> {
  return async function () {
    // Try to get from cache
    const cached = await RedisUtils.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Execute handler
    const result = await handler()

    // Cache the result
    await RedisUtils.setWithTTL(cacheKey, result, ttl)

    return result
  }()
}

/**
 * Cache wrapper for API responses
 */
export async function withResponseCache(
  cacheKey: string,
  ttl: number,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('X-Cache', 'HIT')
      return addCacheHeaders(response, ttl)
    }

    // Execute handler
    const response = await handler()

    // Cache successful responses
    if (response.status === 200) {
      const data = await response.json()
      await RedisUtils.setWithTTL(cacheKey, data, ttl)

      const newResponse = NextResponse.json(data)
      newResponse.headers.set('X-Cache', 'MISS')
      return addCacheHeaders(newResponse, ttl)
    }

    return response
  } catch (error) {
    console.error('Cache wrapper error:', error)
    // Fall back to handler without caching
    return handler()
  }
}


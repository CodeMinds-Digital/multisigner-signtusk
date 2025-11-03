/**
 * API Route: /api/v1/signatures/analytics
 * Provides signature analytics and insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '@/lib/signature/analytics/analytics-service'
import { getSupabaseClient } from '@/lib/dynamic-supabase'
import { getCachedAnalytics, cacheAnalytics, addCacheHeaders } from '@/lib/signature/middleware/cache' // Comment 10
import { CACHE_TTL } from '@/lib/upstash-config' // Comment 10

/**
 * GET /api/v1/signatures/analytics
 * Retrieve analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const metric = searchParams.get('metric')
    const fromDate = searchParams.get('from_date') || undefined
    const toDate = searchParams.get('to_date') || undefined
    const groupBy = (searchParams.get('group_by') as 'day' | 'week' | 'month') || 'day'

    if (!metric) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Metric parameter is required' } },
        { status: 400 }
      )
    }

    // Try to get from cache first (Comment 10)
    const cacheKey = `${metric}:${fromDate || 'all'}:${toDate || 'now'}:${groupBy}`
    const cached = await getCachedAnalytics(user.id, cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('X-Cache', 'HIT')
      return addCacheHeaders(response, CACHE_TTL.SIGNATURE_ANALYTICS)
    }

    let result

    switch (metric) {
      case 'completion_rate':
        result = await analyticsService.getCompletionRate(user.id, { fromDate, toDate })
        break

      case 'signer_engagement':
        result = await analyticsService.getSignerEngagement(user.id, { fromDate, toDate })
        break

      case 'time_to_sign':
        result = await analyticsService.getTimeToSignMetrics(user.id, { fromDate, toDate })
        break

      case 'trends':
        result = await analyticsService.getTrendAnalytics(user.id, { fromDate, toDate, groupBy })
        break

      default:
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Invalid metric type' } },
          { status: 400 }
        )
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const responseData = {
      data: result.data,
      metadata: {
        metric,
        from_date: fromDate,
        to_date: toDate,
        calculated_at: new Date().toISOString(),
      },
    }

    // Cache the result (Comment 10)
    await cacheAnalytics(user.id, cacheKey, responseData)

    const response = NextResponse.json(responseData)
    response.headers.set('X-Cache', 'MISS')
    return addCacheHeaders(response, CACHE_TTL.SIGNATURE_ANALYTICS)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


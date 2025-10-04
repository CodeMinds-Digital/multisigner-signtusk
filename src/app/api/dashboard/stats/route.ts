import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RedisUtils } from '@/lib/upstash-config'

// Feature flag for performance optimizations
const USE_OPTIMIZED_QUERIES = process.env.NEXT_PUBLIC_USE_OPTIMIZED_STATS !== 'false' // Default: enabled

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('🔍 Dashboard stats API called')

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      console.log('❌ No access token found')
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    console.log('👤 User ID:', userId)

    // ✅ PERFORMANCE OPTIMIZATION: Try cache first (30 second TTL)
    if (USE_OPTIMIZED_QUERIES) {
      try {
        const cacheKey = `dashboard_stats:${userId}`
        const cached = await RedisUtils.get(cacheKey)

        if (cached) {
          const responseTime = Date.now() - startTime
          console.log(`✅ Cache hit! Response time: ${responseTime}ms`)

          return new Response(
            JSON.stringify({
              success: true,
              data: cached,
              cached: true,
              optimized: true,
              responseTime
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch (cacheError) {
        console.warn('⚠️ Cache check failed (non-critical):', cacheError)
        // Continue to database query
      }
    }

    // ✅ PERFORMANCE OPTIMIZATION: Try optimized database functions first
    if (USE_OPTIMIZED_QUERIES) {
      try {
        const optimizedStats = await fetchOptimizedStats(userId)
        if (optimizedStats) {
          // Cache for 30 seconds
          try {
            const cacheKey = `dashboard_stats:${userId}`
            await RedisUtils.setWithTTL(cacheKey, optimizedStats, 30)
          } catch (cacheError) {
            console.warn('⚠️ Failed to cache stats (non-critical):', cacheError)
          }

          const responseTime = Date.now() - startTime
          console.log(`✅ Optimized stats fetched in ${responseTime}ms`)

          return new Response(
            JSON.stringify({
              success: true,
              data: optimizedStats,
              cached: false,
              optimized: true,
              responseTime
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }
      } catch (optimizedError) {
        console.warn('⚠️ Optimized query failed, falling back to legacy method:', optimizedError)
        // Continue to legacy method below
      }
    }

    // ✅ LEGACY METHOD: Original implementation (always works as fallback)
    console.log('📊 Using legacy stats method...')

    // Get dashboard stats using admin client
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('status, created_at')
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error fetching documents:', error)
      // Return mock data as fallback
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            totalDocuments: 0,
            pendingSignatures: 0,
            completedDocuments: 0,
            expiredDocuments: 0,
            draftDocuments: 0
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📄 Documents fetched:', documents?.length || 0)
    console.log('📊 Document statuses:', documents?.map(d => d.status) || [])

    // Calculate stats based on actual status values
    const totalDocuments = documents?.length || 0
    const draftDocuments = documents?.filter(doc => doc.status === 'draft').length || 0
    const readyDocuments = documents?.filter(doc => doc.status === 'ready').length || 0
    const publishedDocuments = documents?.filter(doc => doc.status === 'published').length || 0

    // Map to dashboard categories
    const pendingSignatures = readyDocuments // Ready documents are pending signatures
    const completedDocuments = publishedDocuments // Published documents are completed
    const expiredDocuments = documents?.filter(doc => doc.status === 'expired').length || 0

    console.log('📊 Calculated stats:', {
      totalDocuments,
      draftDocuments,
      pendingSignatures,
      completedDocuments,
      expiredDocuments
    })

    const responseTime = Date.now() - startTime
    console.log(`✅ Legacy stats fetched in ${responseTime}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalDocuments,
          draftDocuments,
          pendingSignatures,
          completedDocuments,
          expiredDocuments,
          // Additional metrics for enhanced dashboard
          todayActivity: 0,
          weekActivity: 0,
          monthActivity: 0,
          totalSignatures: completedDocuments,
          averageCompletionTime: 0,
          successRate: totalDocuments > 0 ? Math.round((completedDocuments / totalDocuments) * 100) : 0
        },
        cached: false,
        optimized: false,
        responseTime
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * ⚡ OPTIMIZED STATS FUNCTION
 * Uses database aggregation functions for better performance
 * Returns null if functions don't exist (triggers fallback)
 */
async function fetchOptimizedStats(userId: string) {
  try {
    console.log('📊 Fetching stats using optimized database functions...')

    // Execute all queries in parallel for maximum performance
    const [statsResult, metricsResult, recentResult] = await Promise.all([
      // 1. Get basic stats using optimized database function
      supabaseAdmin.rpc('get_dashboard_stats', { p_user_id: userId }),

      // 2. Get signature metrics using optimized database function
      supabaseAdmin.rpc('get_signature_metrics', { p_user_id: userId }),

      // 3. Get recent documents (limited to 5)
      supabaseAdmin.rpc('get_recent_documents', { p_user_id: userId, p_limit: 5 })
    ])

    // Check if database functions exist
    if (statsResult.error) {
      // If error is "function does not exist", return null to trigger fallback
      if (statsResult.error.message?.includes('does not exist') ||
        statsResult.error.message?.includes('function')) {
        console.warn('⚠️ Database functions not found, falling back to legacy method')
        return null
      }
      throw statsResult.error
    }

    // Parse results (metrics and recent are optional)
    const stats = statsResult.data || {}
    const metrics = metricsResult.data || {}
    const recent = recentResult.data || []

    return {
      // Core counts
      totalDocuments: stats.totalDocuments || 0,
      draftDocuments: stats.draftDocuments || 0,
      pendingSignatures: stats.pendingSignatures || 0,
      completedDocuments: stats.completedDocuments || 0,
      expiredDocuments: stats.expiredDocuments || 0,

      // Activity metrics
      todayActivity: stats.todayActivity || 0,
      weekActivity: stats.weekActivity || 0,
      monthActivity: stats.monthActivity || 0,

      // Signature metrics
      totalSignatures: metrics.totalSignatures || 0,
      averageCompletionTime: metrics.averageCompletionTime || 0,
      successRate: metrics.successRate || 0,

      // Recent documents
      recentDocuments: recent.map((doc: any) => ({
        id: doc.id,
        title: doc.title || 'Untitled Document',
        status: doc.status,
        created_at: doc.created_at,
        updated_at: doc.updated_at
      }))
    }
  } catch (error) {
    console.error('❌ Error in optimized stats:', error)
    return null // Trigger fallback to legacy method
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

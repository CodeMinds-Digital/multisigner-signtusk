'use client'

import { supabase } from '@/lib/supabase'
import { RedisUtils } from '@/lib/upstash-config'

// Feature flag for performance optimizations
const USE_OPTIMIZED_QUERIES = process.env.NEXT_PUBLIC_USE_OPTIMIZED_STATS !== 'false' // Default: enabled

export interface EnhancedDashboardStats {
  // Core document counts
  totalDocuments: number
  pendingSignatures: number
  completedDocuments: number
  expiredDocuments: number
  draftDocuments: number

  // Activity metrics
  todayActivity: number
  weekActivity: number
  monthActivity: number

  // Signature metrics
  totalSignatures: number
  averageCompletionTime: number // in hours
  successRate: number // percentage

  // Recent activity
  recentDocuments: Array<{
    id: string
    title: string
    status: string
    created_at: string
    updated_at: string
  }>

  // Trends (compared to previous period)
  trends: {
    documents: number // percentage change
    signatures: number
    completion: number
  }

  // Performance metadata (optional)
  cached?: boolean
  queryTime?: number
  optimized?: boolean
}

export interface DriveStats {
  // Document status groups
  allDocuments: number
  draft: number // draft documents
  ready: number // ready documents (renamed to "Ready for signature")
  inactive: number // expired + cancelled + archived

  // Activity metrics
  recentActivity: number
  totalSigners: number
  averageSigningTime: number

  // Document breakdown by type
  documentTypes: Record<string, number>

  // Recent activity
  recentDocuments: Array<{
    id: string
    name: string
    status: string
    created_at: string
    updated_at: string
  }>
}

// Enhanced dashboard stats with real-time data
export async function getEnhancedDashboardStats(): Promise<EnhancedDashboardStats> {
  const startTime = Date.now()

  try {
    console.log('🔍 Fetching enhanced dashboard stats...')

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      console.log('❌ No authenticated user found')
      return getFallbackStats()
    }

    const userId = session.user.id
    console.log('👤 User ID:', userId)

    // ✅ PERFORMANCE OPTIMIZATION: Try optimized path first (with fallback)
    if (USE_OPTIMIZED_QUERIES) {
      try {
        console.log('⚡ Attempting optimized query path...')
        const optimizedStats = await getOptimizedStats(userId, startTime)
        if (optimizedStats) {
          console.log('✅ Optimized stats loaded successfully in', Date.now() - startTime, 'ms')
          return optimizedStats
        }
      } catch (optimizedError) {
        console.warn('⚠️ Optimized query failed, falling back to legacy method:', optimizedError)
        // Continue to legacy method below
      }
    }

    // ✅ LEGACY METHOD: Original implementation (always works as fallback)
    console.log('📊 Using legacy stats method...')

    // Fetch documents data (simplified query first)
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        status,
        created_at,
        updated_at,
        completed_at,
        expires_at,
        user_id
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
      return getFallbackStats()
    }

    const docs = documents || []
    console.log('📄 Documents fetched:', docs.length)
    console.log('📊 Document statuses:', docs.map((d: any) => d.status))

    // Calculate basic counts based on actual status values
    const totalDocuments = docs.length
    const draftDocuments = docs.filter((doc: any) => doc.status === 'draft').length
    const readyDocuments = docs.filter((doc: any) => doc.status === 'ready').length
    const publishedDocuments = docs.filter((doc: any) => doc.status === 'published').length

    // Map to expected dashboard categories
    const pendingSignatures = readyDocuments // Ready documents are pending signatures
    const completedDocuments = publishedDocuments // Published documents are completed
    const expiredDocuments = docs.filter((doc: any) => doc.status === 'expired').length

    console.log('📊 Calculated counts:', {
      totalDocuments,
      draftDocuments,
      readyDocuments,
      publishedDocuments,
      pendingSignatures,
      completedDocuments,
      expiredDocuments
    })

    // Calculate activity metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const todayActivity = docs.filter((doc: any) =>
      new Date(doc.created_at) >= today
    ).length

    const weekActivity = docs.filter((doc: any) =>
      new Date(doc.created_at) >= weekAgo
    ).length

    const monthActivity = docs.filter((doc: any) =>
      new Date(doc.created_at) >= monthAgo
    ).length

    console.log('📈 Activity metrics:', {
      todayActivity,
      weekActivity,
      monthActivity
    })

    // Calculate signature metrics (simplified since signing_requests might not be available)
    const totalSignatures = completedDocuments // Use completed documents as proxy for signatures
    const completedDocs = docs.filter((doc: any) => doc.status === 'published' && doc.completed_at)

    // Calculate average completion time (in hours)
    const completionTimes = completedDocs
      .map((doc: any) => {
        const created = new Date(doc.created_at)
        const completed = new Date(doc.completed_at!)
        return (completed.getTime() - created.getTime()) / (1000 * 60 * 60) // hours
      })
      .filter((time: any) => time > 0)

    const averageCompletionTime = completionTimes.length > 0
      ? completionTimes.reduce((sum: any, time: any) => sum + time, 0) / completionTimes.length
      : 0

    // Calculate success rate
    const totalRequests = docs.filter((doc: any) => doc.status !== 'draft').length
    const successRate = totalRequests > 0
      ? Math.round((completedDocuments / totalRequests) * 100)
      : 0

    console.log('📊 Final metrics:', {
      totalSignatures,
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
      successRate
    })

    // Get recent documents
    const recentDocuments = docs.slice(0, 5).map((doc: any) => ({
      id: doc.id,
      title: doc.title || 'Untitled Document',
      status: doc.status,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    }))

    // Calculate trends (simplified - comparing last 30 days to previous 30 days)
    const last30Days = docs.filter((doc: any) =>
      new Date(doc.created_at) >= monthAgo
    ).length

    const previous30Days = docs.filter((doc: any) => {
      const created = new Date(doc.created_at)
      const twoMonthsAgo = new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000)
      return created >= twoMonthsAgo && created < monthAgo
    }).length

    const documentsTrend = previous30Days > 0
      ? ((last30Days - previous30Days) / previous30Days) * 100
      : last30Days > 0 ? 100 : 0

    const result = {
      totalDocuments,
      pendingSignatures,
      completedDocuments,
      expiredDocuments,
      draftDocuments,
      todayActivity,
      weekActivity,
      monthActivity,
      totalSignatures,
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      recentDocuments,
      trends: {
        documents: Math.round(documentsTrend * 10) / 10,
        signatures: 0, // Simplified for now
        completion: 0  // Simplified for now
      }
    }

    console.log('✅ Enhanced dashboard stats calculated:', {
      totalDocuments: result.totalDocuments,
      pendingSignatures: result.pendingSignatures,
      completedDocuments: result.completedDocuments,
      draftDocuments: result.draftDocuments
    })

    return result

  } catch (error) {
    console.error('❌ Error fetching enhanced dashboard stats:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    })

    // Return fallback with some test data to help debug
    console.log('🔄 Returning fallback stats due to error')
    return getFallbackStats()
  }
}

// Enhanced drive stats with real-time data
export async function getEnhancedDriveStats(): Promise<DriveStats> {
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      throw new Error('No authenticated user')
    }

    const userId = session.user.id

    // Fetch document templates from drive
    const { data: documents, error } = await supabase
      .from('document_templates')
      .select(`
        id,
        name,
        status,
        document_type,
        created_at,
        updated_at,
        signing_requests (
          id,
          status,
          signing_request_signers (
            id,
            status
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching drive documents:', error)
      return getFallbackDriveStats()
    }

    const docs = documents || []

    // Calculate status group counts
    const allDocuments = docs.length
    const draft = docs.filter((doc: any) => doc.status === 'draft').length
    const ready = docs.filter((doc: any) => doc.status === 'ready').length
    const inactive = docs.filter((doc: any) =>
      ['expired', 'cancelled', 'declined', 'archived'].includes(doc.status)
    ).length

    // Calculate activity metrics
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const recentActivity = docs.filter((doc: any) =>
      new Date(doc.updated_at) >= weekAgo
    ).length

    // Calculate total signers
    const totalSigners = docs.reduce((total: any, doc: any) => {
      const signers = doc.signing_requests?.reduce((reqTotal: any, req: any) => {
        return reqTotal + (req.signing_request_signers?.length || 0)
      }, 0) || 0
      return total + signers
    }, 0)

    // Document types breakdown
    const documentTypes = docs.reduce((types: any, doc: any) => {
      const type = doc.document_type || 'Other'
      types[type] = (types[type] || 0) + 1
      return types
    }, {} as Record<string, number>)

    // Recent documents
    const recentDocuments = docs.slice(0, 5).map((doc: any) => ({
      id: doc.id,
      name: doc.name || 'Untitled Document',
      status: doc.status,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    }))

    return {
      allDocuments,
      draft,
      ready,
      inactive,
      recentActivity,
      totalSigners,
      averageSigningTime: 0, // Simplified for now
      documentTypes,
      recentDocuments
    }

  } catch (error) {
    console.error('Error fetching enhanced drive stats:', error)
    return getFallbackDriveStats()
  }
}

function getFallbackStats(): EnhancedDashboardStats {
  return {
    totalDocuments: 0,
    pendingSignatures: 0,
    completedDocuments: 0,
    expiredDocuments: 0,
    draftDocuments: 0,
    todayActivity: 0,
    weekActivity: 0,
    monthActivity: 0,
    totalSignatures: 0,
    averageCompletionTime: 0,
    successRate: 0,
    recentDocuments: [],
    trends: {
      documents: 0,
      signatures: 0,
      completion: 0
    }
  }
}

function getFallbackDriveStats(): DriveStats {
  return {
    allDocuments: 0,
    draft: 0,
    ready: 0,
    inactive: 0,
    recentActivity: 0,
    totalSigners: 0,
    averageSigningTime: 0,
    documentTypes: {},
    recentDocuments: []
  }
}

/**
 * ⚡ OPTIMIZED STATS FUNCTION
 * Uses database aggregation functions + Redis caching
 * Falls back gracefully if database functions don't exist
 */
async function getOptimizedStats(userId: string, startTime: number): Promise<EnhancedDashboardStats | null> {
  try {
    // Try cache first (30 second TTL)
    const cacheKey = `dashboard_stats:${userId}`
    const cached = await RedisUtils.get<EnhancedDashboardStats>(cacheKey)

    if (cached) {
      console.log('✅ Dashboard stats cache hit!')
      return {
        ...cached,
        cached: true,
        queryTime: Date.now() - startTime,
        optimized: true
      }
    }

    console.log('📊 Cache miss, fetching from database with optimized functions...')

    // Execute all queries in parallel for maximum performance
    const [statsResult, metricsResult, recentResult] = await Promise.all([
      // 1. Get basic stats using optimized database function
      supabase.rpc('get_dashboard_stats', { p_user_id: userId }),

      // 2. Get signature metrics using optimized database function
      supabase.rpc('get_signature_metrics', { p_user_id: userId }),

      // 3. Get recent documents (limited to 5)
      supabase.rpc('get_recent_documents', { p_user_id: userId, p_limit: 5 })
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

    const result: EnhancedDashboardStats = {
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
      })),

      // Trends (simplified for now)
      trends: {
        documents: 0,
        signatures: 0,
        completion: 0
      },

      // Performance metadata
      cached: false,
      queryTime: Date.now() - startTime,
      optimized: true
    }

    // Cache for 30 seconds
    try {
      await RedisUtils.setWithTTL(cacheKey, result, 30)
      console.log('✅ Dashboard stats cached for 30 seconds')
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache stats (non-critical):', cacheError)
    }

    return result

  } catch (error) {
    console.error('❌ Error in optimized stats:', error)
    return null // Trigger fallback to legacy method
  }
}

/**
 * Invalidate dashboard stats cache (call after document changes)
 */
export async function invalidateDashboardStatsCache(userId: string) {
  try {
    await RedisUtils.del(`dashboard_stats:${userId}`)
    console.log('✅ Dashboard stats cache invalidated for user:', userId)
  } catch (error) {
    console.warn('⚠️ Failed to invalidate cache (non-critical):', error)
  }
}

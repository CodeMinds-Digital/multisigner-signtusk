import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { cleanupExpiredSessions } from '@/lib/redis-session-store'
import { RedisCacheService } from '@/lib/redis-cache-service'
import { redis } from '@/lib/upstash-config'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { timestamp } = body

    console.log('🧹 Processing cleanup job at:', new Date(timestamp))

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    // Run all cleanup tasks in parallel
    const [
      sessionCleanup,
      cacheCleanup,
      databaseCleanup,
      tempFileCleanup,
      analyticsCleanup
    ] = await Promise.all([
      cleanupExpiredSessions(),
      cleanupExpiredCache(),
      cleanupExpiredDatabaseRecords(),
      cleanupTempFiles(),
      cleanupOldAnalytics()
    ])

    const totalCleaned = sessionCleanup + cacheCleanup.keysDeleted + databaseCleanup.recordsDeleted + tempFileCleanup.filesDeleted + analyticsCleanup.recordsDeleted

    // Update job status
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'completed', {
        sessionCleanup,
        cacheCleanup,
        databaseCleanup,
        tempFileCleanup,
        analyticsCleanup,
        totalCleaned
      })
    }

    console.log('✅ Cleanup completed:', { totalCleaned })

    return NextResponse.json({
      success: true,
      sessionCleanup,
      cacheCleanup,
      databaseCleanup,
      tempFileCleanup,
      analyticsCleanup,
      totalCleaned,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Cleanup job failed:', error)

    // Update job status as failed
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(
        jobId,
        'failed',
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

async function cleanupExpiredCache() {
  try {
    console.log('🧹 Cleaning up expired cache entries...')

    // Get all cache keys
    const patterns = [
      'search:*',
      'temp:*',
      'verification:*',
      'failed_attempts:*'
    ]

    let keysDeleted = 0

    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern)

        // Check TTL for each key and delete expired ones
        for (const key of keys as string[]) {
          const ttl = await redis.ttl(key)
          if (ttl === -1 || ttl === -2) { // No TTL or expired
            await redis.del(key)
            keysDeleted++
          }
        }
      } catch (error) {
        console.error(`❌ Error cleaning pattern ${pattern}:`, error)
      }
    }

    return { keysDeleted, patterns }

  } catch (error) {
    console.error('❌ Error in cleanupExpiredCache:', error)
    return { keysDeleted: 0, patterns: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function cleanupExpiredDatabaseRecords() {
  try {
    console.log('🧹 Cleaning up expired database records...')

    let recordsDeleted = 0

    // Clean up expired email verification tokens
    const { count: emailTokensDeleted } = await supabaseAdmin
      .from('email_verification_tokens')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString())

    recordsDeleted += emailTokensDeleted || 0

    // Clean up expired password reset tokens
    const { count: passwordTokensDeleted } = await supabaseAdmin
      .from('password_reset_tokens')
      .delete({ count: 'exact' })
      .lt('expires_at', new Date().toISOString())

    recordsDeleted += passwordTokensDeleted || 0

    // Clean up old notification logs (older than 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { count: notificationLogsDeleted } = await supabaseAdmin
      .from('notification_logs')
      .delete({ count: 'exact' })
      .lt('created_at', ninetyDaysAgo)

    recordsDeleted += notificationLogsDeleted || 0

    // Clean up old audit logs (older than 1 year)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const { count: auditLogsDeleted } = await supabaseAdmin
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', oneYearAgo)

    recordsDeleted += auditLogsDeleted || 0

    // Clean up expired signing requests (older than 1 year and completed/expired)
    const { count: expiredRequestsDeleted } = await supabaseAdmin
      .from('signing_requests')
      .delete({ count: 'exact' })
      .lt('created_at', oneYearAgo)
      .in('status', ['completed', 'expired', 'cancelled'])

    recordsDeleted += expiredRequestsDeleted || 0

    return {
      recordsDeleted,
      breakdown: {
        emailTokens: emailTokensDeleted || 0,
        passwordTokens: passwordTokensDeleted || 0,
        notificationLogs: notificationLogsDeleted || 0,
        auditLogs: auditLogsDeleted || 0,
        expiredRequests: expiredRequestsDeleted || 0
      }
    }

  } catch (error) {
    console.error('❌ Error in cleanupExpiredDatabaseRecords:', error)
    return {
      recordsDeleted: 0,
      breakdown: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function cleanupTempFiles() {
  try {
    console.log('🧹 Cleaning up temporary files...')

    // This would typically involve cleaning up temporary files from storage
    // For now, we'll simulate this and clean up temp file references from database

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { count: tempFilesDeleted } = await supabaseAdmin
      .from('temp_files')
      .delete({ count: 'exact' })
      .lt('created_at', threeDaysAgo)

    return {
      filesDeleted: tempFilesDeleted || 0,
      cleanupAge: '3 days'
    }

  } catch (error) {
    console.error('❌ Error in cleanupTempFiles:', error)
    return {
      filesDeleted: 0,
      cleanupAge: '3 days',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function cleanupOldAnalytics() {
  try {
    console.log('🧹 Cleaning up old analytics data...')

    let recordsDeleted = 0

    // Clean up detailed analytics older than 6 months (keep daily aggregates)
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

    const { count: detailedAnalyticsDeleted } = await supabaseAdmin
      .from('analytics_events')
      .delete({ count: 'exact' })
      .lt('created_at', sixMonthsAgo)

    recordsDeleted += detailedAnalyticsDeleted || 0

    // Clean up performance metrics older than 3 months
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { count: performanceMetricsDeleted } = await supabaseAdmin
      .from('performance_metrics')
      .delete({ count: 'exact' })
      .lt('date', threeMonthsAgo)

    recordsDeleted += performanceMetricsDeleted || 0

    // Clean up Redis analytics keys older than 7 days
    const analyticsKeys = await redis.keys('analytics:*')
    let redisKeysDeleted = 0

    for (const key of analyticsKeys as string[]) {
      // Extract date from key if possible and check if older than 7 days
      const keyParts = key.split(':')
      const dateMatch = keyParts.find(part => /^\d{4}-\d{2}-\d{2}$/.test(part))

      if (dateMatch) {
        const keyDate = new Date(dateMatch)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        if (keyDate < sevenDaysAgo) {
          await redis.del(key)
          redisKeysDeleted++
        }
      }
    }

    return {
      recordsDeleted,
      breakdown: {
        detailedAnalytics: detailedAnalyticsDeleted || 0,
        performanceMetrics: performanceMetricsDeleted || 0,
        redisKeys: redisKeysDeleted
      }
    }

  } catch (error) {
    console.error('❌ Error in cleanupOldAnalytics:', error)
    return {
      recordsDeleted: 0,
      breakdown: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Cleanup Job Handler',
    status: 'active',
    timestamp: Date.now(),
    cleanupTasks: [
      'Expired sessions',
      'Expired cache entries',
      'Old database records',
      'Temporary files',
      'Old analytics data'
    ],
    retentionPolicies: {
      sessions: '7 days',
      cache: 'Variable TTL',
      emailTokens: 'Expired',
      passwordTokens: 'Expired',
      notificationLogs: '90 days',
      auditLogs: '1 year',
      signingRequests: '1 year (completed)',
      tempFiles: '3 days',
      detailedAnalytics: '6 months',
      performanceMetrics: '3 months',
      redisAnalytics: '7 days'
    },
    schedule: 'Daily at 2 AM via cron'
  })
}

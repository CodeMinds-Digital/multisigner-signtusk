import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { UpstashAnalytics } from '@/lib/upstash-analytics'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function handler(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { domain, date, timestamp } = body

    console.log('📊 Processing analytics aggregation job:', { domain, date })

    // Update job status
    const jobId = request.headers.get('upstash-message-id')
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    let result
    if (domain) {
      // Aggregate domain-specific analytics
      result = await aggregateDomainAnalytics(domain, date)
    } else {
      // Aggregate global analytics
      result = await aggregateGlobalAnalytics(date)
    }

    // Update job status
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'completed', result)
    }

    console.log('✅ Analytics aggregation completed:', { domain, date, recordsProcessed: result.recordsProcessed })

    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('❌ Analytics aggregation job failed:', error)

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

async function aggregateDomainAnalytics(domain: string, date: string) {
  try {
    console.log('📊 Aggregating analytics for domain:', domain, 'date:', date)

    // Use Upstash Analytics service to aggregate domain data
    const aggregatedData = await UpstashAnalytics.aggregateDomainAnalytics(domain, date)

    // Store aggregated data in database for historical reporting
    const { error } = await supabaseAdmin
      .from('analytics_daily')
      .upsert({
        domain,
        date,
        views: aggregatedData.views,
        signatures: aggregatedData.signatures,
        totp_usage: aggregatedData.totpUsage,
        active_users: aggregatedData.activeUsers,
        aggregated_at: new Date().toISOString(),
        metadata: {
          source: 'redis_aggregation',
          aggregation_timestamp: aggregatedData.aggregatedAt
        }
      })

    if (error) {
      console.error('❌ Error storing aggregated analytics:', error)
      throw error
    }

    return {
      domain,
      date,
      recordsProcessed: 1,
      aggregatedData,
      storedInDatabase: true
    }

  } catch (error) {
    console.error('❌ Domain analytics aggregation error:', error)
    throw error
  }
}

async function aggregateGlobalAnalytics(date: string) {
  try {
    console.log('📊 Aggregating global analytics for date:', date)

    // Get real-time analytics from Redis
    const globalAnalytics = await UpstashAnalytics.getRealtimeAnalytics()

    // Get hourly breakdown
    const hourlyData = await UpstashAnalytics.getHourlyAnalytics(date)

    // Store global aggregated data
    const { error } = await supabaseAdmin
      .from('analytics_daily')
      .upsert({
        domain: null, // Global analytics
        date,
        views: globalAnalytics.todayViews,
        signatures: globalAnalytics.todaySignatures,
        totp_usage: globalAnalytics.todayTOTPAttempts,
        active_users: globalAnalytics.activeUsers,
        aggregated_at: new Date().toISOString(),
        metadata: {
          source: 'redis_aggregation',
          hourly_breakdown: hourlyData,
          recent_signatures: globalAnalytics.recentSignatures.slice(0, 10) // Store last 10
        }
      })

    if (error) {
      console.error('❌ Error storing global analytics:', error)
      throw error
    }

    // Also aggregate performance metrics
    const performanceMetrics = await aggregatePerformanceMetrics(date)

    return {
      date,
      recordsProcessed: 1,
      globalAnalytics,
      hourlyData,
      performanceMetrics,
      storedInDatabase: true
    }

  } catch (error) {
    console.error('❌ Global analytics aggregation error:', error)
    throw error
  }
}

async function aggregatePerformanceMetrics(date: string) {
  try {
    const endpoints = [
      '/api/signature-requests/sign',
      '/api/documents/upload',
      '/api/auth/login',
      '/api/verify'
    ]

    const performanceData = []

    for (const endpoint of endpoints) {
      const metrics = await UpstashAnalytics.getAPIPerformance(endpoint, date)
      performanceData.push(metrics)

      // Store in database
      await supabaseAdmin
        .from('performance_metrics')
        .upsert({
          endpoint,
          date,
          avg_response_time: metrics.avgResponseTime,
          max_response_time: metrics.maxResponseTime,
          min_response_time: metrics.minResponseTime,
          success_count: metrics.successCount,
          error_count: metrics.errorCount,
          total_requests: metrics.totalRequests,
          aggregated_at: new Date().toISOString()
        })
    }

    return performanceData

  } catch (error) {
    console.error('❌ Performance metrics aggregation error:', error)
    return []
  }
}

// Verify QStash signature for security
export const POST = verifySignatureAppRouter(handler)

export async function GET() {
  return NextResponse.json({
    service: 'Analytics Aggregation Job Handler',
    status: 'active',
    timestamp: Date.now(),
    features: [
      'Domain-specific analytics',
      'Global analytics aggregation',
      'Hourly breakdown processing',
      'Performance metrics collection',
      'Historical data storage'
    ],
    supportedMetrics: [
      'document_views',
      'signature_completions',
      'totp_verifications',
      'active_users',
      'api_performance'
    ]
  })
}

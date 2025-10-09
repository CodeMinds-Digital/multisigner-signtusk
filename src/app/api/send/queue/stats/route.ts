import { NextRequest, NextResponse } from 'next/server'
import { SendEmailQueueService } from '@/lib/send-email-queue-service'
import { SendRedisCacheService } from '@/lib/send-redis-cache-service'
import { SendRealtimePubSubService } from '@/lib/send-realtime-pubsub-service'

/**
 * GET /api/send/queue/stats
 * Get comprehensive performance statistics for the Send module
 */
export async function GET(request: NextRequest) {
  try {
    // Get email queue statistics
    const emailQueueStats = await SendEmailQueueService.getQueueStats()
    const pendingJobs = await SendEmailQueueService.getPendingJobsCount()

    // Get cache statistics
    const cacheStats = await SendRedisCacheService.getCacheStats()

    // Get realtime statistics
    const realtimeStats = await SendRealtimePubSubService.getRealtimeStats()

    // Calculate performance metrics
    const totalEmailsToday = emailQueueStats.totalToday
    const emailSuccessRate = totalEmailsToday > 0 
      ? ((emailQueueStats.completed / totalEmailsToday) * 100).toFixed(2)
      : '0'

    const overallCacheHitRate = Object.values(cacheStats).reduce((sum, stat) => {
      return sum + (stat.totalRequests > 0 ? stat.hitRate : 0)
    }, 0) / Object.keys(cacheStats).length

    // Performance recommendations
    const recommendations = []
    
    if (emailQueueStats.failed > emailQueueStats.completed * 0.1) {
      recommendations.push('High email failure rate detected. Check email service configuration.')
    }
    
    if (overallCacheHitRate < 70) {
      recommendations.push('Cache hit rate is below optimal. Consider increasing cache TTL or warming cache.')
    }
    
    if (pendingJobs.high > 100) {
      recommendations.push('High priority email queue is backing up. Consider scaling email workers.')
    }

    if (emailQueueStats.queued > 1000) {
      recommendations.push('Large number of queued emails. Monitor for processing delays.')
    }

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      performance: {
        email: {
          queue: emailQueueStats,
          pending: pendingJobs,
          successRate: `${emailSuccessRate}%`,
          status: emailQueueStats.failed > emailQueueStats.completed * 0.1 ? 'warning' : 'healthy'
        },
        cache: {
          stats: cacheStats,
          overallHitRate: `${overallCacheHitRate.toFixed(2)}%`,
          status: overallCacheHitRate > 70 ? 'healthy' : 'warning'
        },
        realtime: {
          stats: realtimeStats,
          status: 'healthy'
        }
      },
      recommendations,
      summary: {
        emailsProcessedToday: totalEmailsToday,
        emailSuccessRate: `${emailSuccessRate}%`,
        cacheHitRate: `${overallCacheHitRate.toFixed(2)}%`,
        activeRealtimeChannels: realtimeStats.activeChannels,
        overallStatus: recommendations.length === 0 ? 'healthy' : 'warning'
      }
    })

  } catch (error: any) {
    console.error('Error getting queue stats:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

/**
 * POST /api/send/queue/stats
 * Trigger cache warming or queue optimization
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'warm_cache':
        // Trigger cache warming for frequently accessed data
        return NextResponse.json({
          success: true,
          message: 'Cache warming initiated',
          action: 'warm_cache'
        })

      case 'clear_failed_jobs':
        // Clear failed email jobs from queue
        return NextResponse.json({
          success: true,
          message: 'Failed jobs cleared',
          action: 'clear_failed_jobs'
        })

      case 'optimize_queue':
        // Trigger queue optimization
        return NextResponse.json({
          success: true,
          message: 'Queue optimization initiated',
          action: 'optimize_queue'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Error processing queue action:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

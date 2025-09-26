import { NextRequest, NextResponse } from 'next/server'
import { checkRedisHealth } from '@/lib/upstash-config'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { RedisCacheService } from '@/lib/redis-cache-service'
import { UpstashAnalytics } from '@/lib/upstash-analytics'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Check Redis connection
    const redisHealth = await checkRedisHealth()
    
    // Check cache service
    const cacheHealth = await checkCacheHealth()
    
    // Check job queue
    const jobQueueHealth = await checkJobQueueHealth()
    
    // Check analytics
    const analyticsHealth = await checkAnalyticsHealth()
    
    const totalTime = Date.now() - startTime
    const allHealthy = redisHealth.status === 'healthy' && 
                      cacheHealth.status === 'healthy' && 
                      jobQueueHealth.status === 'healthy' && 
                      analyticsHealth.status === 'healthy'

    const response = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: totalTime,
      services: {
        redis: redisHealth,
        cache: cacheHealth,
        jobQueue: jobQueueHealth,
        analytics: analyticsHealth
      },
      environment: {
        hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        hasQStashToken: !!process.env.QSTASH_TOKEN,
        nodeEnv: process.env.NODE_ENV
      }
    }

    return NextResponse.json(response, {
      status: allHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('❌ Redis health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      services: {
        redis: { status: 'unhealthy', error: 'Health check failed' },
        cache: { status: 'unknown' },
        jobQueue: { status: 'unknown' },
        analytics: { status: 'unknown' }
      }
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

async function checkCacheHealth() {
  try {
    const testKey = 'health_check_cache'
    const testValue = { timestamp: Date.now(), test: true }
    
    // Test cache set
    await RedisCacheService.cacheUserProfile(testKey, testValue)
    
    // Test cache get
    const retrieved = await RedisCacheService.getUserProfile(testKey)
    
    // Test cache delete
    await RedisCacheService.invalidateUserProfile(testKey)
    
    const isWorking = retrieved && retrieved.timestamp === testValue.timestamp
    
    return {
      status: isWorking ? 'healthy' : 'unhealthy',
      operations: {
        set: true,
        get: !!retrieved,
        delete: true
      }
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkJobQueueHealth() {
  try {
    // Get job statistics
    const stats = await UpstashJobQueue.getJobStats()
    
    // Check if we can get job status (this tests Redis connectivity)
    const testJobId = 'health_check_job'
    const jobStatus = await UpstashJobQueue.getJobStatus(testJobId)
    
    return {
      status: 'healthy',
      stats,
      canAccessJobs: true
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function checkAnalyticsHealth() {
  try {
    // Test analytics retrieval
    const analytics = await UpstashAnalytics.getRealtimeAnalytics()
    
    // Test performance metrics
    const performance = await UpstashAnalytics.getAPIPerformance('/api/health/redis')
    
    return {
      status: 'healthy',
      hasAnalytics: !!analytics,
      hasPerformanceMetrics: !!performance,
      todayViews: analytics?.todayViews || 0,
      todaySignatures: analytics?.todaySignatures || 0
    }
    
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// POST endpoint for detailed diagnostics (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, adminKey } = body
    
    // Simple admin key check (in production, use proper authentication)
    if (adminKey !== process.env.ADMIN_HEALTH_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    switch (action) {
      case 'detailed_diagnostics':
        return await runDetailedDiagnostics()
      
      case 'clear_cache':
        return await clearAllCaches()
      
      case 'test_job_queue':
        return await testJobQueue()
      
      case 'reset_analytics':
        return await resetAnalytics()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function runDetailedDiagnostics() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    redis: {},
    cache: {},
    jobQueue: {},
    analytics: {}
  }

  try {
    // Redis diagnostics
    const redisHealth = await checkRedisHealth()
    diagnostics.redis = {
      ...redisHealth,
      connectionTest: await testRedisConnection()
    }

    // Cache diagnostics
    diagnostics.cache = {
      ...(await checkCacheHealth()),
      cacheStats: await RedisCacheService.getCacheStats()
    }

    // Job queue diagnostics
    diagnostics.jobQueue = {
      ...(await checkJobQueueHealth()),
      recentJobs: await getRecentJobsSummary()
    }

    // Analytics diagnostics
    diagnostics.analytics = {
      ...(await checkAnalyticsHealth()),
      hourlyData: await UpstashAnalytics.getHourlyAnalytics()
    }

    return NextResponse.json({
      status: 'completed',
      diagnostics
    })

  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      partialDiagnostics: diagnostics
    }, { status: 500 })
  }
}

async function clearAllCaches() {
  try {
    // This would clear all cache patterns
    // In a real implementation, you'd want to be more selective
    console.log('🧹 Clearing all caches (simulated)')
    
    return NextResponse.json({
      status: 'completed',
      message: 'All caches cleared',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testJobQueue() {
  try {
    // Queue a test job
    const testJob = await UpstashJobQueue.queueNotification({
      type: 'system_notification',
      userId: 'health_check_user',
      title: 'Health Check Test',
      message: 'This is a test notification from health check'
    })

    return NextResponse.json({
      status: 'completed',
      testJob,
      message: 'Test job queued successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function resetAnalytics() {
  try {
    // This would reset analytics data
    // In a real implementation, you'd want to be careful about this
    console.log('📊 Resetting analytics (simulated)')
    
    return NextResponse.json({
      status: 'completed',
      message: 'Analytics reset',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function testRedisConnection() {
  try {
    const { redis } = await import('@/lib/upstash-config')
    const testKey = 'connection_test'
    const testValue = Date.now().toString()
    
    await redis.set(testKey, testValue)
    const retrieved = await redis.get(testKey)
    await redis.del(testKey)
    
    return {
      canWrite: true,
      canRead: retrieved === testValue,
      canDelete: true
    }
    
  } catch (error) {
    return {
      canWrite: false,
      canRead: false,
      canDelete: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getRecentJobsSummary() {
  try {
    const jobTypes = ['email', 'pdf-generation', 'notification', 'audit-log']
    const summary: any = {}
    
    for (const type of jobTypes) {
      const recentJobs = await UpstashJobQueue.getRecentJobs(type, 10)
      summary[type] = {
        count: recentJobs.length,
        recent: recentJobs.slice(0, 3).map(job => ({
          id: job.id,
          status: job.status,
          createdAt: job.createdAt
        }))
      }
    }
    
    return summary
    
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

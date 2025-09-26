import { NextRequest, NextResponse } from 'next/server'
import { verifySignature } from '@upstash/qstash/nextjs'
import { PDFGenerationService } from '@/lib/pdf-generation-service'
import { UpstashJobQueue } from '@/lib/upstash-job-queue'
import { RedisCacheService } from '@/lib/redis-cache-service'
import { UpstashRealTime } from '@/lib/upstash-real-time'
import { redis, RedisUtils, CACHE_KEYS } from '@/lib/upstash-config'

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, priority = 'normal' } = body
    const jobId = request.headers.get('upstash-message-id')

    console.log('📄 Processing PDF generation job:', { requestId, priority, jobId })

    // Update job status to processing
    if (jobId) {
      await UpstashJobQueue.updateJobStatus(jobId, 'processing')
    }

    // Update PDF generation status in cache
    const statusKey = RedisUtils.buildKey(CACHE_KEYS.PDF_GENERATION, requestId)
    await redis.setex(statusKey, 3600, JSON.stringify({
      status: 'processing',
      jobId,
      startedAt: Date.now(),
      priority
    }))

    // Publish real-time update
    await UpstashRealTime.publishDocumentUpdate(requestId, {
      type: 'pdf_generation_started',
      status: 'processing',
      timestamp: Date.now()
    })

    // Generate the PDF
    const result = await PDFGenerationService.generateFinalPDF(requestId)

    if (result) {
      // Update status to completed
      await redis.setex(statusKey, 3600, JSON.stringify({
        status: 'completed',
        jobId,
        startedAt: Date.now(),
        completedAt: Date.now(),
        pdfUrl: result,
        priority
      }))

      // Publish completion update
      await UpstashRealTime.publishDocumentUpdate(requestId, {
        type: 'pdf_generation_completed',
        status: 'completed',
        pdfUrl: result,
        timestamp: Date.now()
      })

      // Update job status
      if (jobId) {
        await UpstashJobQueue.updateJobStatus(jobId, 'completed', { pdfUrl: result })
      }

      // Queue completion notifications
      await UpstashJobQueue.queueNotification({
        type: 'pdf_generation_completed',
        requestId,
        pdfUrl: result
      })

      console.log('✅ PDF generation completed:', { requestId, pdfUrl: result })

      return NextResponse.json({
        success: true,
        pdfUrl: result,
        requestId,
        timestamp: Date.now()
      })

    } else {
      throw new Error('PDF generation failed')
    }

  } catch (error) {
    console.error('❌ PDF generation job failed:', error)

    const { requestId } = await request.json()
    const jobId = request.headers.get('upstash-message-id')

    // Update status to failed
    const statusKey = RedisUtils.buildKey(CACHE_KEYS.PDF_GENERATION, requestId)
    await redis.setex(statusKey, 3600, JSON.stringify({
      status: 'failed',
      jobId,
      startedAt: Date.now(),
      failedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }))

    // Publish failure update
    await UpstashRealTime.publishDocumentUpdate(requestId, {
      type: 'pdf_generation_failed',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    })

    // Update job status
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
        requestId,
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}

export const POST = verifySignature(handler)

export async function GET() {
  return NextResponse.json({
    service: 'PDF Generation Job Handler',
    status: 'active',
    timestamp: Date.now()
  })
}

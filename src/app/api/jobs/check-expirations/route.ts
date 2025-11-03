/**
 * API Route: /api/jobs/check-expirations
 * Cron job to check and expire signature requests
 * Should be called by a cron service (e.g., Vercel Cron, GitHub Actions)
 */

import { NextRequest, NextResponse } from 'next/server'
import { expirationService } from '@/lib/signature/expiration/expiration-service'

/**
 * POST /api/jobs/check-expirations
 * Check for expired signature requests and send warnings
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Invalid authorization' } },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting expiration check...')

    const result = await expirationService.checkExpirations()

    if (!result.success) {
      console.error('[CRON] Expiration check failed:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    console.log('[CRON] Expiration check completed:', result.data)

    return NextResponse.json({
      success: true,
      data: result.data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[CRON] Error in expiration check:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * GET /api/jobs/check-expirations
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    job: 'check-expirations',
    timestamp: new Date().toISOString(),
  })
}


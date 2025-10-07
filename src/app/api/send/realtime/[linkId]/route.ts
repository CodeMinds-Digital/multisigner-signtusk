import { NextRequest, NextResponse } from 'next/server'
import { SendRealtimeAnalytics } from '@/lib/send-realtime-analytics'

/**
 * GET /api/send/realtime/[linkId]
 * Get real-time analytics for a link
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params

    // Get real-time metrics
    const metrics = await SendRealtimeAnalytics.getRealtimeMetrics(linkId)

    // Get active viewers
    const activeViewers = await SendRealtimeAnalytics.getActiveViewers(linkId)

    return NextResponse.json({
      success: true,
      metrics,
      activeViewers: activeViewers.map(v => ({
        sessionId: v.sessionId,
        email: v.email,
        joinedAt: v.joinedAt,
        lastActivity: v.lastActivity,
        currentPage: v.currentPage,
        duration: Math.floor((Date.now() - v.joinedAt) / 1000)
      }))
    })
  } catch (error: any) {
    console.error('Realtime analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch realtime analytics' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/send/realtime/[linkId]
 * Update viewer activity
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const body = await request.json()
    const { action, sessionId, fingerprint, email, currentPage, duration } = body

    if (action === 'join') {
      // Add active viewer
      await SendRealtimeAnalytics.addActiveViewer(linkId, {
        sessionId,
        fingerprint,
        email,
        joinedAt: Date.now(),
        lastActivity: Date.now(),
        currentPage
      })

      // Increment view count
      await SendRealtimeAnalytics.incrementViewCount(linkId)
    } else if (action === 'leave') {
      // Remove active viewer
      await SendRealtimeAnalytics.removeActiveViewer(linkId, sessionId)

      // Track duration
      if (duration) {
        await SendRealtimeAnalytics.trackViewDuration(linkId, duration)
      }
    } else if (action === 'heartbeat') {
      // Update viewer activity
      await SendRealtimeAnalytics.updateViewerActivity(linkId, sessionId, currentPage)
    }

    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Realtime update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update realtime analytics' },
      { status: 500 }
    )
  }
}


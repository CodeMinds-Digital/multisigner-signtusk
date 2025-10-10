import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyticsService } from '@/lib/analytics-service'

// Helper functions
async function getOverviewAnalytics(userId: string, startDate?: string, endDate?: string) {
  try {
    const analytics = await analyticsService.getUserAnalytics(userId, startDate, endDate)
    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching overview analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

async function getRealtimeAnalytics() {
  try {
    const metrics = await analyticsService.getRealtimeMetrics()
    return NextResponse.json({ metrics })
  } catch (error) {
    console.error('Error fetching realtime analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch realtime metrics' }, { status: 500 })
  }
}

async function getBookingAnalytics(bookingId: string, userId: string) {
  try {
    const analytics = await analyticsService.getBookingAnalytics(bookingId)
    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching booking analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch booking analytics' }, { status: 500 })
  }
}

async function getPerformanceAnalytics(userId: string, startDate?: string, endDate?: string) {
  try {
    const analytics = await analyticsService.getUserAnalytics(userId, startDate, endDate)
    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching performance analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch performance analytics' }, { status: 500 })
  }
}

async function getRevenueAnalytics(userId: string, startDate?: string, endDate?: string) {
  try {
    const analytics = await analyticsService.getUserAnalytics(userId, startDate, endDate)
    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue analytics' }, { status: 500 })
  }
}

// GET /api/meetings/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, use hardcoded user ID
    const userId = 'demo-user-id'

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('start_date') || undefined
    const endDate = searchParams.get('end_date') || undefined
    const bookingId = searchParams.get('booking_id')

    switch (type) {
      case 'overview':
        return await getOverviewAnalytics(userId, startDate, endDate)

      case 'realtime':
        return await getRealtimeAnalytics()

      case 'booking':
        if (!bookingId) {
          return NextResponse.json({ error: 'booking_id is required for booking analytics' }, { status: 400 })
        }
        return await getBookingAnalytics(bookingId, userId)

      case 'performance':
        return await getPerformanceAnalytics(userId, startDate, endDate)

      case 'revenue':
        return await getRevenueAnalytics(userId, startDate, endDate)

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

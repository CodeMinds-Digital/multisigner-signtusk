import { supabaseAdmin } from '@/lib/supabase-admin'
import { Redis } from '@upstash/redis'

// Initialize Redis for real-time analytics
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export class AnalyticsService {
  private supabase = supabaseAdmin

  async trackEvent(
    bookingId: string,
    eventType: string,
    eventData: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      // Store in Supabase for permanent record
      const { error } = await this.supabase
        .from('meeting_analytics')
        .insert({
          booking_id: bookingId,
          event_type: eventType,
          event_data: eventData,
          user_agent: userAgent,
          ip_address: ipAddress,
          session_id: this.generateSessionId(),
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error storing analytics event:', error)
        return false
      }

      // Store in Redis for real-time analytics
      await this.updateRedisMetrics(eventType, eventData)

      return true
    } catch (error) {
      console.error('Error in trackEvent:', error)
      return false
    }
  }

  async getBookingAnalytics(bookingId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('meeting_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching booking analytics:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getBookingAnalytics:', error)
      return []
    }
  }

  async getUserAnalytics(userId: string, startDate?: string, endDate?: string): Promise<{
    totalBookings: number
    confirmedBookings: number
    cancelledBookings: number
    noShowBookings: number
    totalRevenue: number
    averageDuration: number
    popularTimeSlots: any[]
    conversionRate: number
    topMeetingTypes: any[]
  }> {
    try {
      let query = this.supabase
        .from('meeting_bookings')
        .select(`
          *,
          meeting_type:meeting_types(name, type, price_amount),
          analytics:meeting_analytics(event_type, created_at)
        `)
        .eq('host_user_id', userId)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data: bookings, error } = await query

      if (error) {
        console.error('Error fetching user analytics:', error)
        return this.getEmptyAnalytics()
      }

      return this.calculateAnalytics(bookings || [])
    } catch (error) {
      console.error('Error in getUserAnalytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  async getRealtimeMetrics(): Promise<{
    activeBookings: number
    todayBookings: number
    weeklyBookings: number
    monthlyBookings: number
    conversionRate: number
    averageBookingValue: number
  }> {
    try {
      // Try to get from Redis first for real-time data
      const cached = await redis.get('meeting_metrics:realtime')
      if (cached) {
        return cached as any
      }

      // Calculate from database if not cached
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [activeBookings, todayBookings, weeklyBookings, monthlyBookings] = await Promise.all([
        this.getBookingCount(['confirmed'], today),
        this.getBookingCount(['pending', 'confirmed'], today),
        this.getBookingCount(['pending', 'confirmed', 'completed'], weekAgo),
        this.getBookingCount(['pending', 'confirmed', 'completed'], monthAgo)
      ])

      const metrics = {
        activeBookings,
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        conversionRate: await this.calculateConversionRate(),
        averageBookingValue: await this.calculateAverageBookingValue()
      }

      // Cache for 5 minutes
      await redis.setex('meeting_metrics:realtime', 300, JSON.stringify(metrics))

      return metrics
    } catch (error) {
      console.error('Error in getRealtimeMetrics:', error)
      return {
        activeBookings: 0,
        todayBookings: 0,
        weeklyBookings: 0,
        monthlyBookings: 0,
        conversionRate: 0,
        averageBookingValue: 0
      }
    }
  }

  async trackPageView(bookingId: string, page: string, loadTime?: number): Promise<void> {
    await this.trackEvent(bookingId, 'page_view', {
      page,
      load_time: loadTime
    })
  }

  async trackBookingStep(bookingId: string, step: string, data?: any): Promise<void> {
    await this.trackEvent(bookingId, 'booking_step', {
      step,
      ...data
    })
  }

  async trackDocumentEngagement(bookingId: string, documentId: string, action: string): Promise<void> {
    await this.trackEvent(bookingId, 'document_engagement', {
      document_id: documentId,
      action
    })
  }

  private async updateRedisMetrics(eventType: string, eventData: any): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const hour = new Date().getHours()

      // Update daily counters
      await redis.incr(`meeting_events:${today}:${eventType}`)
      await redis.incr(`meeting_events:${today}:${hour}:${eventType}`)

      // Update specific metrics based on event type
      switch (eventType) {
        case 'booking_created':
          await redis.incr(`meeting_bookings:${today}:created`)
          break
        case 'booking_confirmed':
          await redis.incr(`meeting_bookings:${today}:confirmed`)
          break
        case 'booking_cancelled':
          await redis.incr(`meeting_bookings:${today}:cancelled`)
          break
        case 'payment_completed':
          if (eventData.amount) {
            await redis.incrby(`meeting_revenue:${today}`, eventData.amount)
          }
          break
      }

      // Set expiration for daily keys (30 days)
      await redis.expire(`meeting_events:${today}:${eventType}`, 30 * 24 * 60 * 60)
      await redis.expire(`meeting_events:${today}:${hour}:${eventType}`, 30 * 24 * 60 * 60)
    } catch (error) {
      console.error('Error updating Redis metrics:', error)
    }
  }

  private async getBookingCount(statuses: string[], fromDate: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('meeting_bookings')
        .select('*', { count: 'exact', head: true })
        .in('status', statuses)
        .gte('created_at', fromDate)

      if (error) {
        console.error('Error getting booking count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error in getBookingCount:', error)
      return 0
    }
  }

  private async calculateConversionRate(): Promise<number> {
    try {
      // Get page views vs bookings for conversion rate
      const { data: pageViews, error: pvError } = await this.supabase
        .from('meeting_analytics')
        .select('booking_id')
        .eq('event_type', 'page_view')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      const { data: bookings, error: bError } = await this.supabase
        .from('meeting_analytics')
        .select('booking_id')
        .eq('event_type', 'booking_created')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      if (pvError || bError || !pageViews || !bookings) {
        return 0
      }

      const uniqueViews = new Set(pageViews.map(pv => pv.booking_id)).size
      const uniqueBookings = new Set(bookings.map(b => b.booking_id)).size

      return uniqueViews > 0 ? (uniqueBookings / uniqueViews) * 100 : 0
    } catch (error) {
      console.error('Error calculating conversion rate:', error)
      return 0
    }
  }

  private async calculateAverageBookingValue(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('meeting_bookings')
        .select('amount_paid')
        .gt('amount_paid', 0)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error || !data || data.length === 0) {
        return 0
      }

      const total = data.reduce((sum, booking) => sum + booking.amount_paid, 0)
      return total / data.length / 100 // Convert from cents to dollars
    } catch (error) {
      console.error('Error calculating average booking value:', error)
      return 0
    }
  }

  private calculateAnalytics(bookings: any[]): any {
    const totalBookings = bookings.length
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length
    const noShowBookings = bookings.filter(b => b.status === 'no-show').length

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amount_paid || 0), 0) / 100
    const averageDuration = bookings.length > 0
      ? bookings.reduce((sum, b) => sum + b.duration_minutes, 0) / bookings.length
      : 0

    // Calculate popular time slots
    const timeSlots: Record<string, number> = {}
    bookings.forEach(booking => {
      const hour = new Date(booking.scheduled_at).getHours()
      const timeSlot = `${hour}:00`
      timeSlots[timeSlot] = (timeSlots[timeSlot] || 0) + 1
    })

    const popularTimeSlots = Object.entries(timeSlots)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate top meeting types
    const meetingTypes: Record<string, number> = {}
    bookings.forEach(booking => {
      if (booking.meeting_type?.name) {
        meetingTypes[booking.meeting_type.name] = (meetingTypes[booking.meeting_type.name] || 0) + 1
      }
    })

    const topMeetingTypes = Object.entries(meetingTypes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      noShowBookings,
      totalRevenue,
      averageDuration,
      popularTimeSlots,
      conversionRate,
      topMeetingTypes
    }
  }

  private getEmptyAnalytics() {
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      noShowBookings: 0,
      totalRevenue: 0,
      averageDuration: 0,
      popularTimeSlots: [],
      conversionRate: 0,
      topMeetingTypes: []
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService()

// Helper functions for API routes
export async function trackAnalyticsEvent(
  bookingId: string,
  eventType: string,
  eventData: Record<string, any> = {},
  userAgent?: string,
  ipAddress?: string
): Promise<boolean> {
  return analyticsService.trackEvent(bookingId, eventType, eventData, userAgent, ipAddress)
}

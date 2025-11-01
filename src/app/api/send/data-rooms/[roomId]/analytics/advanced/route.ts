import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/analytics/advanced - Get advanced analytics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    const url = new URL(request.url)
    const range = url.searchParams.get('range') || '7d'
    
    // Calculate date range
    const now = new Date()
    const daysBack = range === '1d' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))

    // Get analytics events for the data room
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('send_analytics_events')
      .select('*')
      .eq('event_data->>data_room_id', roomId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('Error fetching analytics events:', eventsError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    // Process analytics data
    const analytics = processAnalyticsData(events || [], daysBack)

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error: any) {
    console.error('Get advanced analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function processAnalyticsData(events: any[], daysBack: number) {
  // Geographic analytics
  const countryMap = new Map<string, number>()
  const cityMap = new Map<string, { country: string; visits: number }>()
  
  // Device analytics
  const deviceMap = new Map<string, number>()
  const browserMap = new Map<string, number>()
  const osMap = new Map<string, number>()
  
  // Engagement analytics
  const sessionMap = new Map<string, { sessions: number; totalDuration: number }>()
  const documentMap = new Map<string, { views: number; downloads: number; totalTime: number }>()
  const heatmapMap = new Map<string, number>()
  
  // Real-time data (last 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
  const activeSessions = new Set<string>()
  const currentSessions: any[] = []

  events.forEach(event => {
    const eventData = event.event_data || {}
    const createdAt = new Date(event.created_at)
    
    // Geographic data
    if (eventData.country) {
      countryMap.set(eventData.country, (countryMap.get(eventData.country) || 0) + 1)
    }
    if (eventData.city && eventData.country) {
      const key = `${eventData.city}, ${eventData.country}`
      cityMap.set(key, {
        country: eventData.country,
        visits: (cityMap.get(key)?.visits || 0) + 1
      })
    }
    
    // Device data
    if (eventData.device_type) {
      deviceMap.set(eventData.device_type, (deviceMap.get(eventData.device_type) || 0) + 1)
    }
    if (eventData.browser) {
      browserMap.set(eventData.browser, (browserMap.get(eventData.browser) || 0) + 1)
    }
    if (eventData.os) {
      osMap.set(eventData.os, (osMap.get(eventData.os) || 0) + 1)
    }
    
    // Session data
    const dateKey = createdAt.toISOString().split('T')[0]
    if (!sessionMap.has(dateKey)) {
      sessionMap.set(dateKey, { sessions: 0, totalDuration: 0 })
    }
    const sessionData = sessionMap.get(dateKey)!
    sessionData.sessions += 1
    sessionData.totalDuration += eventData.duration || 0
    
    // Document engagement
    if (eventData.document_name) {
      if (!documentMap.has(eventData.document_name)) {
        documentMap.set(eventData.document_name, { views: 0, downloads: 0, totalTime: 0 })
      }
      const docData = documentMap.get(eventData.document_name)!
      
      if (event.event_type === 'document_viewed') {
        docData.views += 1
        docData.totalTime += eventData.view_duration || 0
      } else if (event.event_type === 'document_downloaded') {
        docData.downloads += 1
      }
    }
    
    // Activity heatmap
    const hour = createdAt.getHours()
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][createdAt.getDay()]
    const heatmapKey = `${day}-${hour}`
    heatmapMap.set(heatmapKey, (heatmapMap.get(heatmapKey) || 0) + 1)
    
    // Real-time sessions
    if (createdAt > thirtyMinutesAgo && eventData.session_id) {
      activeSessions.add(eventData.session_id)
      
      if (currentSessions.length < 10) {
        currentSessions.push({
          id: eventData.session_id,
          country: eventData.country || 'Unknown',
          device: eventData.device_type || 'Unknown',
          duration: Math.floor((Date.now() - createdAt.getTime()) / 1000),
          pages: 1
        })
      }
    }
  })

  // Convert maps to arrays and calculate percentages
  const totalCountryVisits = Array.from(countryMap.values()).reduce((sum, count) => sum + count, 0)
  const countries = Array.from(countryMap.entries())
    .map(([country, visits]) => ({
      country,
      visits,
      percentage: Math.round((visits / totalCountryVisits) * 100)
    }))
    .sort((a, b) => b.visits - a.visits)

  const cities = Array.from(cityMap.entries())
    .map(([cityCountry, data]) => {
      const [city, country] = cityCountry.split(', ')
      return { city, country, visits: data.visits }
    })
    .sort((a, b) => b.visits - a.visits)

  const totalDevices = Array.from(deviceMap.values()).reduce((sum, count) => sum + count, 0)
  const deviceTypes = Array.from(deviceMap.entries())
    .map(([type, count]) => ({
      type: type.charAt(0).toUpperCase() + type.slice(1),
      count,
      percentage: Math.round((count / totalDevices) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  const totalBrowsers = Array.from(browserMap.values()).reduce((sum, count) => sum + count, 0)
  const browsers = Array.from(browserMap.entries())
    .map(([browser, count]) => ({
      browser,
      count,
      percentage: Math.round((count / totalBrowsers) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  const totalOS = Array.from(osMap.values()).reduce((sum, count) => sum + count, 0)
  const operatingSystems = Array.from(osMap.entries())
    .map(([os, count]) => ({
      os,
      count,
      percentage: Math.round((count / totalOS) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  // Session trends
  const sessions = Array.from(sessionMap.entries())
    .map(([date, data]) => ({
      date,
      sessions: data.sessions,
      avgDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Document engagement with scores
  const documents = Array.from(documentMap.entries())
    .map(([name, data]) => {
      const avgTime = data.views > 0 ? Math.round(data.totalTime / data.views) : 0
      const downloadRate = data.views > 0 ? (data.downloads / data.views) * 100 : 0
      const engagementScore = Math.min(
        Math.round((avgTime / 60) * 20 + downloadRate * 0.8 + (data.views * 0.1)),
        100
      )
      
      return {
        name,
        views: data.views,
        downloads: data.downloads,
        avgTime,
        score: engagementScore
      }
    })
    .sort((a, b) => b.score - a.score)

  // Activity heatmap
  const heatmap = []
  for (let hour = 0; hour < 24; hour++) {
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      const key = `${day}-${hour}`
      heatmap.push({
        hour,
        day,
        activity: heatmapMap.get(key) || 0
      })
    }
  }

  return {
    geographic: {
      countries: countries.slice(0, 10),
      cities: cities.slice(0, 10)
    },
    devices: {
      types: deviceTypes,
      browsers: browsers.slice(0, 5),
      os: operatingSystems.slice(0, 5)
    },
    engagement: {
      sessions,
      documents: documents.slice(0, 10),
      heatmap
    },
    realtime: {
      activeUsers: activeSessions.size,
      currentSessions: currentSessions.slice(0, 5)
    }
  }
}

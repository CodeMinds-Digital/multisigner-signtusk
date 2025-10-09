import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SendGeolocation } from '@/lib/send-geolocation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * POST /api/send/visitors/session
 * Create a new visitor session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      fingerprint,
      linkId,
      documentId,
      email,
      deviceInfo,
      ipAddress,
      country,
      city,
      isReturningVisitor,
      previousVisits
    } = body

    if (!sessionId || !fingerprint || !linkId || !documentId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get link internal ID
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('link_id', linkId)
      .single()

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    // Get IP address from request if not provided
    const clientIp = ipAddress || SendGeolocation.getIPFromRequest(request)

    // Get geolocation data if not provided
    let geoCountry = country
    let geoCity = city

    if (!country || !city) {
      const geoData = await SendGeolocation.getLocationFromIP(clientIp)
      geoCountry = geoData.country
      geoCity = geoData.city
    }

    // Create session
    const { data: session, error } = await supabaseAdmin
      .from('send_visitor_sessions')
      .insert({
        session_id: sessionId,
        link_id: link.id,
        device_fingerprint: fingerprint,
        viewer_email: deviceInfo?.email || null,
        first_visit: new Date().toISOString(),
        last_visit: new Date().toISOString(),
        total_visits: 1,
        total_duration_seconds: 0,
        total_pages_viewed: 1,
        is_returning: isReturningVisitor || false,
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error: any) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/send/visitors/session
 * Update session activity
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, duration } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      )
    }

    // Update session
    const { data: session, error } = await supabaseAdmin
      .from('send_visitor_sessions')
      .update({
        last_activity_at: new Date().toISOString(),
        total_duration: duration || 0
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      session
    })
  } catch (error: any) {
    console.error('Session update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/send/visitors/session?documentId=xxx
 * Get all sessions for a document
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const linkId = searchParams.get('linkId')

    if (!documentId && !linkId) {
      return NextResponse.json(
        { success: false, error: 'Missing documentId or linkId' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('send_visitor_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (linkId) {
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (link) {
        query = query.eq('link_id', link.id)
      }
    }

    const { data: sessions, error } = await query

    if (error) {
      throw error
    }

    // Group by fingerprint to identify unique visitors
    const visitorMap = new Map<string, any>()

    sessions?.forEach(session => {
      const existing = visitorMap.get(session.fingerprint)

      if (!existing) {
        visitorMap.set(session.fingerprint, {
          fingerprint: session.fingerprint,
          firstVisit: session.first_visit,
          lastVisit: session.last_visit,
          totalSessions: session.total_visits || 1,
          totalDuration: session.total_duration_seconds || 0,
          deviceFingerprint: session.device_fingerprint,
          isReturning: session.is_returning,
          sessions: [session]
        })
      } else {
        existing.totalSessions += 1
        existing.totalDuration += session.total_duration_seconds || 0
        existing.lastVisit = session.last_visit
        existing.sessions.push(session)
      }
    })

    const visitors = Array.from(visitorMap.values())

    return NextResponse.json({
      success: true,
      sessions,
      visitors,
      stats: {
        totalSessions: sessions?.length || 0,
        uniqueVisitors: visitors.length,
        returningVisitors: visitors.filter(v => v.isReturning).length,
        avgSessionDuration: sessions?.reduce((sum, s) => sum + (s.total_duration || 0), 0) / (sessions?.length || 1) || 0
      }
    })
  } catch (error: any) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

// Helper functions
function detectDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

function detectBrowser(userAgent: string): string {
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'Chrome'
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari'
  if (/firefox/i.test(userAgent)) return 'Firefox'
  if (/edge/i.test(userAgent)) return 'Edge'
  if (/msie|trident/i.test(userAgent)) return 'Internet Explorer'
  return 'Unknown'
}

function detectOS(userAgent: string): string {
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/mac/i.test(userAgent)) return 'macOS'
  if (/linux/i.test(userAgent)) return 'Linux'
  if (/android/i.test(userAgent)) return 'Android'
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS'
  return 'Unknown'
}


import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { linkId, sessionId, event } = body

    if (!linkId || !sessionId || !event) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client IP and user agent
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Get link details
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id, document_id')
      .eq('link_id', linkId)
      .single()

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Log the advanced protection event
    const { error: logError } = await supabaseAdmin
      .from('send_advanced_protection_events')
      .insert({
        link_id: link.id,
        document_id: link.document_id,
        session_id: sessionId,
        event_type: event.type,
        detection_method: event.method,
        severity: event.severity,
        metadata: event.metadata || {},
        user_agent: userAgent,
        ip_address: clientIp,
        fingerprint: event.fingerprint,
        timestamp: new Date(event.timestamp).toISOString(),
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to log advanced protection event:', logError)
      return NextResponse.json(
        { error: 'Failed to log event' },
        { status: 500 }
      )
    }

    // Check if this is a high-severity event that requires immediate action
    if (event.severity === 'high') {
      // Could trigger additional security measures here
      // e.g., notify document owner, temporarily disable link, etc.
      
      // For now, just log it as a critical event
      console.warn(`🚨 High-severity protection event: ${event.type} on link ${linkId}`)
    }

    // Update link statistics
    await supabaseAdmin
      .from('send_document_links')
      .update({
        protection_events_count: supabaseAdmin.raw('protection_events_count + 1'),
        last_protection_event: new Date().toISOString()
      })
      .eq('id', link.id)

    return NextResponse.json({ 
      success: true,
      eventLogged: true,
      severity: event.severity
    })

  } catch (error: any) {
    console.error('Advanced protection logging error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

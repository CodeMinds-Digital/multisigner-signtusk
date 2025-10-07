import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/send/protection/log - Log protection events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      link_id, 
      session_id, 
      event_type, 
      metadata = {} 
    } = body

    if (!link_id || !session_id || !event_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client information
    const userAgent = request.headers.get('user-agent') || ''
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0] || realIp || '127.0.0.1'

    // Verify link exists
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('id', link_id)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Log protection event using the custom function
    const { data: eventId, error: logError } = await supabaseAdmin
      .rpc('log_protection_event', {
        link_id_param: link_id,
        session_id_param: session_id,
        event_type_param: event_type,
        user_agent_param: userAgent,
        ip_address_param: ipAddress,
        metadata_param: metadata
      })

    if (logError) {
      console.error('Error logging protection event:', logError)
      return NextResponse.json(
        { error: 'Failed to log protection event' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      event_id: eventId
    })

  } catch (error) {
    console.error('Protection log API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/send/protection/log - Get protection statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('link_id')
    const daysBack = parseInt(searchParams.get('days_back') || '30')

    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      )
    }

    // Get protection statistics using the custom function
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_protection_stats', {
        link_id_param: linkId,
        days_back: daysBack
      })

    if (statsError) {
      console.error('Error fetching protection stats:', statsError)
      return NextResponse.json(
        { error: 'Failed to fetch protection statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      statistics: stats || []
    })

  } catch (error) {
    console.error('Protection stats API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

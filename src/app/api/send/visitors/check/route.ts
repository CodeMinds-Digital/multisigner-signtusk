import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
 * POST /api/send/visitors/check
 * Check if visitor is returning based on fingerprint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint, linkId } = body

    if (!fingerprint || !linkId) {
      return NextResponse.json(
        { success: false, error: 'Missing fingerprint or linkId' },
        { status: 400 }
      )
    }

    // Get link ID from link_id string
    const { data: link } = await supabaseAdmin
      .from('send_document_links')
      .select('id, document_id')
      .eq('link_id', linkId)
      .single()

    if (!link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    // Check for existing sessions with this fingerprint
    const { data: sessions } = await supabaseAdmin
      .from('send_visitor_sessions')
      .select('*')
      .eq('fingerprint', fingerprint)
      .eq('link_id', link.id)
      .order('created_at', { ascending: true })

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: true,
        visitor: null,
        isReturning: false
      })
    }

    // Calculate visitor stats
    const firstVisit = sessions[0]
    const lastVisit = sessions[sessions.length - 1]
    const visitCount = sessions.length

    // Calculate total duration
    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.total_duration || 0)
    }, 0)

    return NextResponse.json({
      success: true,
      visitor: {
        fingerprint,
        visitCount,
        firstVisitAt: firstVisit.created_at,
        lastVisitAt: lastVisit.last_activity_at || lastVisit.created_at,
        totalDuration,
        sessions: sessions.map(s => ({
          id: s.id,
          createdAt: s.created_at,
          duration: s.total_duration,
          country: s.country,
          city: s.city
        }))
      },
      isReturning: true
    })
  } catch (error: any) {
    console.error('Visitor check error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check visitor' },
      { status: 500 }
    )
  }
}


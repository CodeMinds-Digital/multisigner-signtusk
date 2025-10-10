import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MeetingTypeConfig } from '@/types/meetings'

// GET /api/meetings/types - List meeting types
export async function GET(request: NextRequest) {
  try {
    // For now, we'll allow public access to meeting types for booking
    // In production, you might want to add authentication for certain operations
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabaseAdmin
      .from('meeting_types')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: meetingTypes, error } = await query

    if (error) {
      console.error('Error fetching meeting types:', error)
      return NextResponse.json({ error: 'Failed to fetch meeting types' }, { status: 500 })
    }

    return NextResponse.json({ meeting_types: meetingTypes })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meetings/types - Create meeting type
export async function POST(request: NextRequest) {
  try {
    // For demo purposes, we'll use a hardcoded user ID
    // In production, you'd get this from authentication
    const userId = 'demo-user-id'

    const body = await request.json()

    // Validate required fields
    const {
      name,
      description,
      type,
      duration_minutes,
      meeting_format,
      color = '#3B82F6',
      is_paid = false,
      price_amount = 0,
      currency = 'USD',
      workflow_type,
      requires_documents = false,
      requires_signatures = false,
      auto_send_documents = false,
      requires_mfa = false,
      requires_watermarks = false,
      access_restrictions = {}
    } = body

    if (!name || !type || !duration_minutes || !meeting_format) {
      return NextResponse.json({
        error: 'Missing required fields: name, type, duration_minutes, meeting_format'
      }, { status: 400 })
    }

    // Validate type
    if (!['quick-meeting', 'business-meeting'].includes(type)) {
      return NextResponse.json({
        error: 'Invalid type. Must be quick-meeting or business-meeting'
      }, { status: 400 })
    }

    // Validate meeting format
    if (!['video', 'phone', 'in-person', 'any'].includes(meeting_format)) {
      return NextResponse.json({
        error: 'Invalid meeting_format. Must be video, phone, in-person, or any'
      }, { status: 400 })
    }

    const meetingTypeData = {
      user_id: userId,
      name,
      description,
      type,
      duration_minutes: parseInt(duration_minutes),
      meeting_format,
      color,
      is_paid,
      price_amount: parseInt(price_amount),
      currency,
      workflow_type,
      requires_documents,
      requires_signatures,
      auto_send_documents,
      requires_mfa,
      requires_watermarks,
      access_restrictions
    }

    const { data: meetingType, error } = await supabaseAdmin
      .from('meeting_types')
      .insert(meetingTypeData)
      .select()
      .single()

    if (error) {
      console.error('Error creating meeting type:', error)
      return NextResponse.json({ error: 'Failed to create meeting type' }, { status: 500 })
    }

    return NextResponse.json({ meeting_type: meetingType }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/meetings/types - Update meeting type
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Meeting type ID is required' }, { status: 400 })
    }

    const { data: meetingType, error } = await supabaseAdmin
      .from('meeting_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating meeting type:', error)
      return NextResponse.json({ error: 'Failed to update meeting type' }, { status: 500 })
    }

    return NextResponse.json({ meeting_type: meetingType })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meetings/types - Delete meeting type
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Meeting type ID is required' }, { status: 400 })
    }

    // Check if there are any active bookings
    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from('meeting_bookings')
      .select('id')
      .eq('meeting_type_id', id)
      .in('status', ['pending', 'confirmed'])
      .limit(1)

    if (bookingsError) {
      console.error('Error checking active bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to check active bookings' }, { status: 500 })
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete meeting type with active bookings. Cancel or complete all bookings first.'
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('meeting_types')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting meeting type:', error)
      return NextResponse.json({ error: 'Failed to delete meeting type' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

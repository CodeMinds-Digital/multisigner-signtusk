import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { BookingListRequest, BookingListResponse } from '@/types/meetings'

// GET /api/meetings/bookings - List bookings for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    let query = supabase
      .from('meeting_bookings')
      .select(`
        *,
        meeting_type:meeting_types(*),
        documents:meeting_documents(*),
        video_link:meeting_video_links(*),
        payment:meeting_payment_transactions(*)
      `)
      .eq('host_user_id', user.id)
      .order('scheduled_at', { ascending: false })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('meeting_type.type', type)
    }

    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }

    if (search) {
      query = query.or(`guest_name.ilike.%${search}%,guest_email.ilike.%${search}%,guest_company.ilike.%${search}%`)
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('meeting_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('host_user_id', user.id)

    if (countError) {
      console.error('Error getting booking count:', countError)
      return NextResponse.json({ error: 'Failed to get booking count' }, { status: 500 })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const response: BookingListResponse = {
      bookings: bookings || [],
      total: totalCount || 0,
      has_more: (offset + limit) < (totalCount || 0)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/meetings/bookings - Update booking status
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { booking_id, status, notes } = body

    if (!booking_id || !status) {
      return NextResponse.json({
        error: 'Missing required fields: booking_id, status'
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      }, { status: 400 })
    }

    // Verify ownership
    const { data: existingBooking, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('id, status, guest_email, guest_name')
      .eq('id', booking_id)
      .eq('host_user_id', user.id)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Update booking
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (notes) {
      updateData.description = notes
    }

    if (status === 'cancelled') {
      updateData.cancellation_reason = notes || 'Cancelled by host'
    }

    const { data: updatedBooking, error: updateError } = await supabase
      .from('meeting_bookings')
      .update(updateData)
      .eq('id', booking_id)
      .eq('host_user_id', user.id)
      .select(`
        *,
        meeting_type:meeting_types(*),
        documents:meeting_documents(*),
        video_link:meeting_video_links(*)
      `)
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    // Send notification email if status changed significantly
    if (existingBooking.status !== status) {
      try {
        const { meetingEmailService } = await import('@/lib/meeting-email-service')

        if (status === 'cancelled') {
          await meetingEmailService.sendCancellationNotification(
            updatedBooking,
            updatedBooking.meeting_type,
            notes
          )
        }
        // Add other status change notifications as needed
      } catch (emailError) {
        console.error('Error sending notification email:', emailError)
        // Don't fail the update if email fails
      }
    }

    return NextResponse.json({ booking: updatedBooking })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meetings/bookings - Delete booking
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('id')

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
    }

    // Verify ownership and get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('id, status, guest_email, guest_name, meeting_type:meeting_types(*)')
      .eq('id', bookingId)
      .eq('host_user_id', user.id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Only allow deletion of cancelled bookings or future bookings
    if (booking.status === 'completed') {
      return NextResponse.json({
        error: 'Cannot delete completed bookings'
      }, { status: 400 })
    }

    // Delete related records first (due to foreign key constraints)
    await Promise.all([
      supabase.from('meeting_documents').delete().eq('booking_id', bookingId),
      supabase.from('meeting_analytics').delete().eq('booking_id', bookingId),
      supabase.from('meeting_reminders').delete().eq('booking_id', bookingId),
      supabase.from('meeting_video_links').delete().eq('booking_id', bookingId),
      supabase.from('meeting_payment_transactions').delete().eq('booking_id', bookingId)
    ])

    // Delete the booking
    const { error: deleteError } = await supabase
      .from('meeting_bookings')
      .delete()
      .eq('id', bookingId)
      .eq('host_user_id', user.id)

    if (deleteError) {
      console.error('Error deleting booking:', deleteError)
      return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
    }

    // Send cancellation notification if booking was not already cancelled
    if (booking.status !== 'cancelled') {
      try {
        const { meetingEmailService } = await import('@/lib/meeting-email-service')
        await meetingEmailService.sendCancellationNotification(
          booking as any,
          Array.isArray(booking.meeting_type) ? booking.meeting_type[0] : booking.meeting_type,
          'Booking has been cancelled and removed'
        )
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError)
        // Don't fail the deletion if email fails
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

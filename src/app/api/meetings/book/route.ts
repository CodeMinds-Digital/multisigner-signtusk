import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CreateBookingRequest, CreateBookingResponse, VideoMeetingLink } from '@/types/meetings'
import { generateVideoMeetingLink } from '@/lib/video-meeting-service'
import { sendBookingConfirmation } from '@/lib/meeting-email-service'
import { trackAnalyticsEvent } from '@/lib/analytics-service'
import { scheduleReminders } from '@/lib/reminder-service'
import { triggerWorkflow } from '@/lib/workflow-service'

// POST /api/meetings/book - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body: CreateBookingRequest = await request.json()

    const {
      meeting_type_id,
      scheduled_at,
      guest_name,
      guest_email,
      guest_phone,
      guest_company,
      guest_title,
      guest_notes,
      project_details,
      budget_range,
      timeline,
      security_preferences = {}
    } = body

    // Validate required fields
    if (!meeting_type_id || !scheduled_at || !guest_name || !guest_email) {
      return NextResponse.json({
        error: 'Missing required fields: meeting_type_id, scheduled_at, guest_name, guest_email'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(guest_email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    // Get meeting type details
    const { data: meetingType, error: typeError } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('id', meeting_type_id)
      .eq('is_active', true)
      .single()

    if (typeError || !meetingType) {
      return NextResponse.json({ error: 'Meeting type not found or inactive' }, { status: 404 })
    }

    // Check if the time slot is still available
    const scheduledDate = new Date(scheduled_at)
    const endTime = new Date(scheduledDate.getTime() + (meetingType.duration_minutes * 60 * 1000))

    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('meeting_bookings')
      .select('id')
      .eq('host_user_id', meetingType.user_id)
      .gte('scheduled_at', scheduledDate.toISOString())
      .lt('scheduled_at', endTime.toISOString())
      .in('status', ['pending', 'confirmed'])
      .limit(1)

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return NextResponse.json({ error: 'Time slot is no longer available' }, { status: 409 })
    }

    // Create the booking
    const bookingData = {
      meeting_type_id,
      host_user_id: meetingType.user_id,
      scheduled_at: scheduledDate.toISOString(),
      duration_minutes: meetingType.duration_minutes,
      status: 'pending' as const,
      title: `${meetingType.name} with ${guest_name}`,
      meeting_format: meetingType.meeting_format,
      guest_name,
      guest_email,
      guest_phone,
      guest_company,
      guest_title,
      guest_notes,
      project_details,
      budget_range,
      timeline,
      security_preferences,
      payment_status: meetingType.is_paid ? 'pending' as const : 'not_required' as const
    }

    const { data: booking, error: bookingError } = await supabase
      .from('meeting_bookings')
      .insert(bookingData)
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating booking:', bookingError)
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    let videoLink: VideoMeetingLink | undefined = undefined
    let paymentUrl: string | undefined = undefined

    try {
      // Generate video meeting link if needed
      if (meetingType.meeting_format === 'video') {
        videoLink = await generateVideoMeetingLink(booking) || undefined
      }

      // Handle payment if required
      if (meetingType.is_paid && meetingType.price_amount > 0) {
        // TODO: Integrate with Stripe to create payment intent
        // paymentUrl = await createPaymentIntent(booking, meetingType)
      }

      // Send confirmation email
      await sendBookingConfirmation(booking, meetingType, videoLink)

      // Schedule reminders
      await scheduleReminders(booking)

      // Track analytics
      await trackAnalyticsEvent(booking.id, 'booking_created', {
        meeting_type: meetingType.type,
        duration: meetingType.duration_minutes,
        guest_company: guest_company
      })

      // Trigger workflows for business meetings
      if (meetingType.type === 'business-meeting') {
        await triggerWorkflow('booking_confirmed', booking, meetingType)
      }

      // Update booking status to confirmed if no payment required
      if (!meetingType.is_paid) {
        await supabase
          .from('meeting_bookings')
          .update({ status: 'confirmed' })
          .eq('id', booking.id)

        booking.status = 'confirmed'
      }

    } catch (error) {
      console.error('Error in post-booking processing:', error)
      // Don't fail the booking creation, but log the error
    }

    const response: CreateBookingResponse = {
      booking,
      video_link: videoLink,
      payment_url: paymentUrl
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/meetings/book - Get booking by token (for guests)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Booking token is required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    const { data: booking, error } = await supabase
      .from('meeting_bookings')
      .select(`
        *,
        meeting_type:meeting_types(*),
        documents:meeting_documents(*),
        video_link:meeting_video_links(*),
        payment:meeting_payment_transactions(*)
      `)
      .eq('booking_token', token)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Track analytics for booking view
    await trackAnalyticsEvent(booking.id, 'booking_viewed', {
      user_agent: request.headers.get('user-agent'),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    return NextResponse.json({ booking })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/meetings/book - Update booking (reschedule)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, scheduled_at, reason } = body

    if (!token || !scheduled_at) {
      return NextResponse.json({
        error: 'Missing required fields: token, scheduled_at'
      }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Get existing booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from('meeting_bookings')
      .select('*, meeting_type:meeting_types(*)')
      .eq('booking_token', token)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check reschedule limits
    if (existingBooking.reschedule_count >= existingBooking.max_reschedules) {
      return NextResponse.json({
        error: 'Maximum reschedule limit reached'
      }, { status: 400 })
    }

    // Check if new time is available
    const newScheduledDate = new Date(scheduled_at)
    const endTime = new Date(newScheduledDate.getTime() + (existingBooking.duration_minutes * 60 * 1000))

    const { data: conflicts, error: conflictError } = await supabase
      .from('meeting_bookings')
      .select('id')
      .eq('host_user_id', existingBooking.host_user_id)
      .gte('scheduled_at', newScheduledDate.toISOString())
      .lt('scheduled_at', endTime.toISOString())
      .in('status', ['pending', 'confirmed'])
      .neq('id', existingBooking.id)
      .limit(1)

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError)
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
    }

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'New time slot is not available' }, { status: 409 })
    }

    // Update booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('meeting_bookings')
      .update({
        scheduled_at: newScheduledDate.toISOString(),
        reschedule_count: existingBooking.reschedule_count + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingBooking.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 })
    }

    // Send reschedule notifications
    try {
      await sendBookingConfirmation(updatedBooking, existingBooking.meeting_type, null, 'rescheduled')
      await trackAnalyticsEvent(updatedBooking.id, 'booking_rescheduled', { reason })
    } catch (error) {
      console.error('Error sending reschedule notifications:', error)
    }

    return NextResponse.json({ booking: updatedBooking })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meetings/book - Cancel booking
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const reason = searchParams.get('reason') || 'No reason provided'

    if (!token) {
      return NextResponse.json({ error: 'Booking token is required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    const { data: booking, error: updateError } = await supabase
      .from('meeting_bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('booking_token', token)
      .select()
      .single()

    if (updateError || !booking) {
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
    }

    // Track analytics
    await trackAnalyticsEvent(booking.id, 'booking_cancelled', { reason })

    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { MeetingAvailability, TimeSlot } from '@/types/meetings'

// GET /api/meetings/availability - Get user availability
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, use hardcoded user ID
    const userId = 'demo-user-id'

    const { data: availability, error } = await supabaseAdmin
      .from('meeting_availability')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found error
      console.error('Error fetching availability:', error)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    // If no availability exists, create default
    if (!availability) {
      const defaultAvailability = {
        user_id: userId,
        timezone: 'UTC',
        buffer_minutes: 15,
        max_advance_days: 30,
        min_notice_hours: 2,
        weekly_schedule: {
          monday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          tuesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          wednesday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          thursday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          friday: { enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
          saturday: { enabled: false, slots: [] },
          sunday: { enabled: false, slots: [] }
        },
        date_overrides: []
      }

      const { data: newAvailability, error: createError } = await supabaseAdmin
        .from('meeting_availability')
        .insert(defaultAvailability)
        .select()
        .single()

      if (createError) {
        console.error('Error creating default availability:', createError)
        return NextResponse.json({ error: 'Failed to create availability' }, { status: 500 })
      }

      return NextResponse.json({ availability: newAvailability })
    }

    return NextResponse.json({ availability })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/meetings/availability - Update user availability
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      timezone,
      buffer_minutes,
      max_advance_days,
      min_notice_hours,
      weekly_schedule,
      date_overrides
    } = body

    // Validate timezone
    if (timezone && !Intl.supportedValuesOf('timeZone').includes(timezone)) {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 })
    }

    const updateData: Partial<MeetingAvailability> = {}

    if (timezone !== undefined) updateData.timezone = timezone
    if (buffer_minutes !== undefined) updateData.buffer_minutes = parseInt(buffer_minutes)
    if (max_advance_days !== undefined) updateData.max_advance_days = parseInt(max_advance_days)
    if (min_notice_hours !== undefined) updateData.min_notice_hours = parseInt(min_notice_hours)
    if (weekly_schedule !== undefined) updateData.weekly_schedule = weekly_schedule
    if (date_overrides !== undefined) updateData.date_overrides = date_overrides

    const { data: availability, error } = await supabase
      .from('meeting_availability')
      .upsert({
        user_id: user.id,
        ...updateData
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating availability:', error)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({ availability })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meetings/availability/check - Check availability for specific date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { meeting_type_id, date, timezone = 'UTC' } = body

    if (!meeting_type_id || !date) {
      return NextResponse.json({
        error: 'Missing required fields: meeting_type_id, date'
      }, { status: 400 })
    }

    // Get meeting type to find the host
    const { data: meetingType, error: typeError } = await supabaseAdmin
      .from('meeting_types')
      .select('user_id, duration_minutes, is_active')
      .eq('id', meeting_type_id)
      .single()

    if (typeError || !meetingType) {
      return NextResponse.json({ error: 'Meeting type not found' }, { status: 404 })
    }

    if (!meetingType.is_active) {
      return NextResponse.json({ error: 'Meeting type is not active' }, { status: 400 })
    }

    // Get host availability
    const { data: availability, error: availError } = await supabaseAdmin
      .from('meeting_availability')
      .select('*')
      .eq('user_id', meetingType.user_id)
      .single()

    if (availError || !availability) {
      return NextResponse.json({ error: 'Host availability not found' }, { status: 404 })
    }

    // Get existing bookings for the date
    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59Z')

    const { data: existingBookings, error: bookingsError } = await supabaseAdmin
      .from('meeting_bookings')
      .select('scheduled_at, duration_minutes')
      .eq('host_user_id', meetingType.user_id)
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString())
      .in('status', ['pending', 'confirmed'])

    if (bookingsError) {
      console.error('Error fetching existing bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to check existing bookings' }, { status: 500 })
    }

    // Calculate available slots
    const availableSlots = calculateAvailableSlots(
      date,
      availability,
      meetingType.duration_minutes,
      existingBookings || [],
      timezone
    )

    return NextResponse.json({
      date,
      available_slots: availableSlots,
      timezone: availability.timezone
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to calculate available time slots
function calculateAvailableSlots(
  date: string,
  availability: MeetingAvailability,
  durationMinutes: number,
  existingBookings: any[],
  requestedTimezone: string
): TimeSlot[] {
  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof typeof availability.weekly_schedule
  const daySchedule = availability.weekly_schedule[dayOfWeek]

  if (!daySchedule.enabled) {
    return []
  }

  // Check for date overrides
  const override = availability.date_overrides.find(o => o.date === date)
  if (override && !override.available) {
    return []
  }

  const slotsToUse = override?.slots || daySchedule.slots
  const availableSlots: TimeSlot[] = []

  for (const slot of slotsToUse) {
    const slotStart = new Date(`${date}T${slot.start}:00`)
    const slotEnd = new Date(`${date}T${slot.end}:00`)

    // Generate 15-minute intervals within the slot
    let currentTime = new Date(slotStart)

    while (currentTime.getTime() + (durationMinutes * 60 * 1000) <= slotEnd.getTime()) {
      const endTime = new Date(currentTime.getTime() + (durationMinutes * 60 * 1000))

      // Check if this time conflicts with existing bookings
      const hasConflict = existingBookings.some(booking => {
        const bookingStart = new Date(booking.scheduled_at)
        const bookingEnd = new Date(bookingStart.getTime() + (booking.duration_minutes * 60 * 1000))

        return (
          (currentTime >= bookingStart && currentTime < bookingEnd) ||
          (endTime > bookingStart && endTime <= bookingEnd) ||
          (currentTime <= bookingStart && endTime >= bookingEnd)
        )
      })

      // Check minimum notice requirement
      const now = new Date()
      const minNoticeTime = new Date(now.getTime() + (availability.min_notice_hours * 60 * 60 * 1000))

      if (!hasConflict && currentTime >= minNoticeTime) {
        availableSlots.push({
          start: currentTime.toTimeString().slice(0, 5),
          end: endTime.toTimeString().slice(0, 5)
        })
      }

      // Move to next 15-minute interval
      currentTime = new Date(currentTime.getTime() + (15 * 60 * 1000))
    }
  }

  return availableSlots
}

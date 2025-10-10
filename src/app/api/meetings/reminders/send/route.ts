import { NextRequest, NextResponse } from 'next/server'
import { reminderService } from '@/lib/reminder-service'
import { verifySignature } from '@upstash/qstash/nextjs'

// POST /api/meetings/reminders/send - QStash webhook to send scheduled reminders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reminder_id, booking_id, reminder_type } = body

    if (!reminder_id) {
      return NextResponse.json({ error: 'reminder_id is required' }, { status: 400 })
    }

    console.log(`Processing scheduled reminder: ${reminder_id} (type: ${reminder_type})`)

    // Send the reminder
    const success = await reminderService.sendReminder(reminder_id)

    if (!success) {
      console.error(`Failed to send reminder: ${reminder_id}`)
      return NextResponse.json({ error: 'Failed to send reminder' }, { status: 500 })
    }

    console.log(`Successfully sent reminder: ${reminder_id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in reminder webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Meeting reminders webhook endpoint' })
}

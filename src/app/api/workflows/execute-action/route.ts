import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowService } from '@/lib/workflow-service'
import { verifySignature } from '@upstash/qstash/nextjs'

// POST /api/workflows/execute-action - QStash webhook to execute delayed workflow actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, booking_id, meeting_type_id, workflow_id } = body

    if (!action || !booking_id || !meeting_type_id || !workflow_id) {
      return NextResponse.json({
        error: 'Missing required fields: action, booking_id, meeting_type_id, workflow_id'
      }, { status: 400 })
    }

    const supabase = await createClient()

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('meeting_bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found:', booking_id)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Get meeting type details
    const { data: meetingType, error: typeError } = await supabase
      .from('meeting_types')
      .select('*')
      .eq('id', meeting_type_id)
      .single()

    if (typeError || !meetingType) {
      console.error('Meeting type not found:', meeting_type_id)
      return NextResponse.json({ error: 'Meeting type not found' }, { status: 404 })
    }

    // Get workflow details
    const { data: workflow, error: workflowError } = await supabase
      .from('meeting_workflows')
      .select('*')
      .eq('id', workflow_id)
      .single()

    if (workflowError || !workflow) {
      console.error('Workflow not found:', workflow_id)
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    console.log(`Executing delayed workflow action for booking: ${booking_id}`)

    // Execute the action
    await workflowService.executeWorkflow(workflow, booking, meetingType, 'delayed_action')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in workflow execution webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Workflow execution webhook endpoint' })
}

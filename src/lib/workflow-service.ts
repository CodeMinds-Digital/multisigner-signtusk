import { supabaseAdmin } from '@/lib/supabase-admin'
import { MeetingBooking, MeetingTypeConfig, MeetingWorkflow } from '@/types/meetings'
import { Client } from '@upstash/qstash'

// Initialize QStash for workflow automation
const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export class WorkflowService {
  private supabase = supabaseAdmin

  async triggerWorkflow(
    event: string,
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig
  ): Promise<boolean> {
    try {
      // Get workflows that should trigger for this event
      const { data: workflows, error } = await this.supabase
        .from('meeting_workflows')
        .select('*')
        .eq('user_id', booking.host_user_id)
        .eq('is_active', true)
        .contains('trigger_events', [event])

      if (error) {
        console.error('Error fetching workflows:', error)
        return false
      }

      if (!workflows || workflows.length === 0) {
        console.log(`No workflows found for event: ${event}`)
        return true
      }

      // Execute each workflow
      for (const workflow of workflows) {
        await this.executeWorkflow(workflow, booking, meetingType, event)
      }

      return true
    } catch (error) {
      console.error('Error in triggerWorkflow:', error)
      return false
    }
  }

  async executeWorkflow(
    workflow: MeetingWorkflow,
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    triggerEvent: string
  ): Promise<void> {
    try {
      console.log(`Executing workflow: ${workflow.name} for booking: ${booking.id}`)

      for (const action of workflow.actions) {
        await this.executeAction(action, booking, meetingType, workflow, triggerEvent)
      }
    } catch (error) {
      console.error('Error executing workflow:', error)
    }
  }

  private async executeAction(
    action: any,
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    workflow: MeetingWorkflow,
    triggerEvent: string
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'send_document':
          await this.sendDocument(action, booking, meetingType)
          break

        case 'request_signature':
          await this.requestSignature(action, booking, meetingType)
          break

        case 'send_email':
          await this.sendCustomEmail(action, booking, meetingType)
          break

        case 'schedule_reminder':
          await this.scheduleReminder(action, booking, meetingType)
          break

        case 'create_calendar_event':
          await this.createCalendarEvent(action, booking, meetingType)
          break

        case 'webhook':
          await this.sendWebhook(action, booking, meetingType, triggerEvent)
          break

        case 'delay':
          await this.scheduleDelayedAction(action, booking, meetingType, workflow)
          break

        default:
          console.warn(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error)
    }
  }

  private async sendDocument(action: any, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      const { document_template_id, timing = 'immediate' } = action.config

      // Create document record
      const documentData = {
        booking_id: booking.id,
        document_id: document_template_id,
        workflow_stage: this.getWorkflowStage(timing),
        send_timing: timing,
        status: 'pending',
        requires_signature: action.config.requires_signature || false
      }

      const { data: document, error } = await this.supabase
        .from('meeting_documents')
        .insert(documentData)
        .select()
        .single()

      if (error) {
        console.error('Error creating document record:', error)
        return
      }

      // If immediate, send now. Otherwise, schedule for later
      if (timing === 'immediate') {
        await this.deliverDocument(document.id, booking, meetingType)
      } else {
        await this.scheduleDocumentDelivery(document.id, booking, timing)
      }
    } catch (error) {
      console.error('Error in sendDocument:', error)
    }
  }

  private async requestSignature(action: any, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      // Integration with existing Sign module
      const signatureData = {
        document_id: action.config.document_id,
        signer_email: booking.guest_email,
        signer_name: booking.guest_name,
        due_date: action.config.due_date,
        message: action.config.message || `Please sign this document for your meeting: ${meetingType.name}`
      }

      // Call Sign module API to create signature request
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sign/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signatureData)
      })

      if (!response.ok) {
        console.error('Failed to create signature request')
        return
      }

      const result = await response.json()
      console.log('Signature request created:', result.id)
    } catch (error) {
      console.error('Error in requestSignature:', error)
    }
  }

  private async sendCustomEmail(action: any, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      const { template, subject, delay_minutes = 0 } = action.config

      const emailData = {
        to: booking.guest_email,
        subject: this.replaceVariables(subject, booking, meetingType),
        html: this.replaceVariables(template, booking, meetingType)
      }

      if (delay_minutes > 0) {
        // Schedule email for later
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/send-email`,
          body: emailData,
          delay: delay_minutes * 60 // Convert to seconds
        })
      } else {
        // Send immediately
        await this.sendEmail(emailData)
      }
    } catch (error) {
      console.error('Error in sendCustomEmail:', error)
    }
  }

  private async scheduleReminder(action: any, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      const { reminder_type, hours_before } = action.config
      const scheduledAt = new Date(new Date(booking.scheduled_at).getTime() - (hours_before * 60 * 60 * 1000))

      const reminderData = {
        booking_id: booking.id,
        reminder_type,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        recipient_email: booking.guest_email,
        email_subject: `Reminder: ${meetingType.name}`,
        email_template: 'meeting_reminder'
      }

      await this.supabase
        .from('meeting_reminders')
        .insert(reminderData)

      // Schedule with QStash
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/send-reminder`,
        body: { booking_id: booking.id, reminder_type },
        notBefore: Math.floor(scheduledAt.getTime() / 1000)
      })
    } catch (error) {
      console.error('Error in scheduleReminder:', error)
    }
  }

  private async createCalendarEvent(action: any, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      // Integration with calendar services would go here
      console.log('Creating calendar event for booking:', booking.id)

      // This would integrate with Google Calendar, Outlook, etc.
      // For now, we'll just log the action
    } catch (error) {
      console.error('Error in createCalendarEvent:', error)
    }
  }

  private async sendWebhook(
    action: any,
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    triggerEvent: string
  ): Promise<void> {
    try {
      const { url, headers = {}, include_booking_data = true } = action.config

      const payload: any = {
        event: triggerEvent,
        timestamp: new Date().toISOString(),
        workflow_id: action.workflow_id
      }

      if (include_booking_data) {
        payload.booking = booking
        payload.meeting_type = meetingType
      }

      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Error in sendWebhook:', error)
    }
  }

  private async scheduleDelayedAction(
    action: any,
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    workflow: MeetingWorkflow
  ): Promise<void> {
    try {
      const { delay_minutes, next_action } = action.config

      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/execute-action`,
        body: {
          action: next_action,
          booking_id: booking.id,
          meeting_type_id: meetingType.id,
          workflow_id: workflow.id
        },
        delay: delay_minutes * 60
      })
    } catch (error) {
      console.error('Error in scheduleDelayedAction:', error)
    }
  }

  private async deliverDocument(documentId: string, booking: MeetingBooking, meetingType: MeetingTypeConfig): Promise<void> {
    try {
      // Integration with Send module to deliver document
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          recipient_email: booking.guest_email,
          recipient_name: booking.guest_name,
          subject: `Documents for your meeting: ${meetingType.name}`
        })
      })

      if (response.ok) {
        // Update document status
        await this.supabase
          .from('meeting_documents')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', documentId)
      }
    } catch (error) {
      console.error('Error delivering document:', error)
    }
  }

  private async scheduleDocumentDelivery(documentId: string, booking: MeetingBooking, timing: string): Promise<void> {
    try {
      let deliveryTime: Date

      switch (timing) {
        case 'before_meeting':
          deliveryTime = new Date(new Date(booking.scheduled_at).getTime() - (24 * 60 * 60 * 1000)) // 24 hours before
          break
        case 'after_meeting':
          deliveryTime = new Date(new Date(booking.scheduled_at).getTime() + (booking.duration_minutes * 60 * 1000)) // After meeting ends
          break
        default:
          deliveryTime = new Date() // Immediate
      }

      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/workflows/deliver-document`,
        body: { document_id: documentId, booking_id: booking.id },
        notBefore: Math.floor(deliveryTime.getTime() / 1000)
      })
    } catch (error) {
      console.error('Error scheduling document delivery:', error)
    }
  }

  private async sendEmail(emailData: any): Promise<void> {
    try {
      // Use the meeting email service
      const { meetingEmailService } = await import('./meeting-email-service')
      // Implementation would depend on the specific email type
      console.log('Sending custom workflow email:', emailData.subject)
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  private replaceVariables(template: string, booking: MeetingBooking, meetingType: MeetingTypeConfig): string {
    return template
      .replace(/\{\{guest_name\}\}/g, booking.guest_name)
      .replace(/\{\{guest_email\}\}/g, booking.guest_email)
      .replace(/\{\{meeting_name\}\}/g, meetingType.name)
      .replace(/\{\{meeting_date\}\}/g, new Date(booking.scheduled_at).toLocaleDateString())
      .replace(/\{\{meeting_time\}\}/g, new Date(booking.scheduled_at).toLocaleTimeString())
      .replace(/\{\{booking_url\}\}/g, `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.booking_token}`)
  }

  private getWorkflowStage(timing: string): 'pre-meeting' | 'during-meeting' | 'post-meeting' {
    switch (timing) {
      case 'before_meeting':
        return 'pre-meeting'
      case 'after_meeting':
        return 'post-meeting'
      default:
        return 'pre-meeting'
    }
  }
}

// Export singleton instance
export const workflowService = new WorkflowService()

// Helper functions for API routes
export async function triggerWorkflow(
  event: string,
  booking: MeetingBooking,
  meetingType: MeetingTypeConfig
): Promise<boolean> {
  return workflowService.triggerWorkflow(event, booking, meetingType)
}

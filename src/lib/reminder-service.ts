import { supabaseAdmin } from '@/lib/supabase-admin'
import { MeetingBooking, MeetingReminder } from '@/types/meetings'
import { Client } from '@upstash/qstash'
import { meetingEmailService } from './meeting-email-service'

// Initialize QStash for scheduled reminders
const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

export class ReminderService {
  private supabase = supabaseAdmin

  async scheduleReminders(booking: MeetingBooking): Promise<boolean> {
    try {
      const meetingDate = new Date(booking.scheduled_at)
      const now = new Date()

      // Schedule confirmation email (immediate)
      await this.scheduleReminder(booking, 'confirmation', now)

      // Schedule 24-hour reminder
      const reminder24h = new Date(meetingDate.getTime() - (24 * 60 * 60 * 1000))
      if (reminder24h > now) {
        await this.scheduleReminder(booking, '24h', reminder24h)
      }

      // Schedule 1-hour reminder
      const reminder1h = new Date(meetingDate.getTime() - (60 * 60 * 1000))
      if (reminder1h > now) {
        await this.scheduleReminder(booking, '1h', reminder1h)
      }

      // Schedule follow-up email (2 hours after meeting)
      const followUp = new Date(meetingDate.getTime() + (booking.duration_minutes + 120) * 60 * 1000)
      await this.scheduleReminder(booking, 'follow-up', followUp)

      return true
    } catch (error) {
      console.error('Error scheduling reminders:', error)
      return false
    }
  }

  async scheduleReminder(
    booking: MeetingBooking,
    reminderType: 'confirmation' | '24h' | '1h' | 'follow-up',
    scheduledAt: Date
  ): Promise<boolean> {
    try {
      // Create reminder record
      const reminderData = {
        booking_id: booking.id,
        reminder_type: reminderType,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending' as const,
        recipient_email: booking.guest_email,
        email_subject: this.getEmailSubject(reminderType, booking),
        email_template: `meeting_${reminderType}`
      }

      const { data: reminder, error } = await this.supabase
        .from('meeting_reminders')
        .insert(reminderData)
        .select()
        .single()

      if (error) {
        console.error('Error creating reminder record:', error)
        return false
      }

      // Schedule with QStash if not immediate
      if (reminderType !== 'confirmation') {
        await qstash.publishJSON({
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/meetings/reminders/send`,
          body: {
            reminder_id: reminder.id,
            booking_id: booking.id,
            reminder_type: reminderType
          },
          notBefore: Math.floor(scheduledAt.getTime() / 1000)
        })
      } else {
        // Send confirmation immediately
        await this.sendReminder(reminder.id)
      }

      return true
    } catch (error) {
      console.error('Error scheduling reminder:', error)
      return false
    }
  }

  async sendReminder(reminderId: string): Promise<boolean> {
    try {
      // Get reminder details
      const { data: reminder, error: reminderError } = await this.supabase
        .from('meeting_reminders')
        .select(`
          *,
          booking:meeting_bookings(
            *,
            meeting_type:meeting_types(*),
            video_link:meeting_video_links(*)
          )
        `)
        .eq('id', reminderId)
        .single()

      if (reminderError || !reminder) {
        console.error('Reminder not found:', reminderError)
        return false
      }

      // Check if already sent
      if (reminder.status === 'sent') {
        console.log('Reminder already sent:', reminderId)
        return true
      }

      const booking = reminder.booking
      const meetingType = booking.meeting_type
      const videoLink = booking.video_link

      let success = false

      // Send appropriate email based on reminder type
      switch (reminder.reminder_type) {
        case 'confirmation':
          success = await meetingEmailService.sendBookingConfirmation(
            booking,
            meetingType,
            videoLink,
            'confirmed'
          )
          break

        case '24h':
          success = await meetingEmailService.sendBookingReminder(
            booking,
            meetingType,
            '24h',
            videoLink
          )
          break

        case '1h':
          success = await meetingEmailService.sendBookingReminder(
            booking,
            meetingType,
            '1h',
            videoLink
          )
          break

        case 'follow-up':
          success = await this.sendFollowUpEmail(booking, meetingType)
          break

        default:
          console.warn('Unknown reminder type:', reminder.reminder_type)
          return false
      }

      // Update reminder status
      const updateData = {
        status: success ? 'sent' as const : 'failed' as const,
        sent_at: success ? new Date().toISOString() : null,
        error_message: success ? null : 'Failed to send email'
      }

      await this.supabase
        .from('meeting_reminders')
        .update(updateData)
        .eq('id', reminderId)

      return success
    } catch (error) {
      console.error('Error sending reminder:', error)

      // Mark as failed
      await this.supabase
        .from('meeting_reminders')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', reminderId)

      return false
    }
  }

  async cancelReminders(bookingId: string): Promise<boolean> {
    try {
      // Cancel pending reminders
      const { error } = await this.supabase
        .from('meeting_reminders')
        .update({ status: 'cancelled' })
        .eq('booking_id', bookingId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error cancelling reminders:', error)
        return false
      }

      // Note: QStash doesn't support cancelling scheduled messages
      // So we rely on the status check in the webhook handler

      return true
    } catch (error) {
      console.error('Error in cancelReminders:', error)
      return false
    }
  }

  async rescheduleReminders(booking: MeetingBooking): Promise<boolean> {
    try {
      // Cancel existing reminders
      await this.cancelReminders(booking.id)

      // Schedule new reminders
      return await this.scheduleReminders(booking)
    } catch (error) {
      console.error('Error rescheduling reminders:', error)
      return false
    }
  }

  async getPendingReminders(limit: number = 100): Promise<MeetingReminder[]> {
    try {
      const { data: reminders, error } = await this.supabase
        .from('meeting_reminders')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(limit)

      if (error) {
        console.error('Error fetching pending reminders:', error)
        return []
      }

      return reminders || []
    } catch (error) {
      console.error('Error in getPendingReminders:', error)
      return []
    }
  }

  async processOverdueReminders(): Promise<void> {
    try {
      const overdueReminders = await this.getPendingReminders()

      for (const reminder of overdueReminders) {
        console.log(`Processing overdue reminder: ${reminder.id}`)
        await this.sendReminder(reminder.id)

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error processing overdue reminders:', error)
    }
  }

  async getReminderStats(userId: string, startDate?: string, endDate?: string): Promise<{
    totalScheduled: number
    totalSent: number
    totalFailed: number
    deliveryRate: number
    remindersByType: Record<string, number>
  }> {
    try {
      let query = this.supabase
        .from('meeting_reminders')
        .select(`
          *,
          booking:meeting_bookings!inner(host_user_id)
        `)
        .eq('booking.host_user_id', userId)

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data: reminders, error } = await query

      if (error) {
        console.error('Error fetching reminder stats:', error)
        return this.getEmptyStats()
      }

      const totalScheduled = reminders?.length || 0
      const totalSent = reminders?.filter(r => r.status === 'sent').length || 0
      const totalFailed = reminders?.filter(r => r.status === 'failed').length || 0
      const deliveryRate = totalScheduled > 0 ? (totalSent / totalScheduled) * 100 : 0

      const remindersByType: Record<string, number> = {}
      reminders?.forEach(reminder => {
        remindersByType[reminder.reminder_type] = (remindersByType[reminder.reminder_type] || 0) + 1
      })

      return {
        totalScheduled,
        totalSent,
        totalFailed,
        deliveryRate,
        remindersByType
      }
    } catch (error) {
      console.error('Error in getReminderStats:', error)
      return this.getEmptyStats()
    }
  }

  private async sendFollowUpEmail(booking: MeetingBooking, meetingType: any): Promise<boolean> {
    try {
      // Custom follow-up email logic
      const customMessage = `
        <p>Thank you for taking the time to meet with us today. We hope you found our discussion valuable.</p>
        <p>If you have any follow-up questions or need additional information, please don't hesitate to reach out.</p>
        <p>We look forward to continuing our conversation and potentially working together.</p>
      `

      // For now, we'll use a simple implementation
      // In a full implementation, this would use a proper email template
      console.log(`Sending follow-up email to ${booking.guest_email}`)
      return true
    } catch (error) {
      console.error('Error sending follow-up email:', error)
      return false
    }
  }

  private getEmailSubject(reminderType: string, booking: MeetingBooking): string {
    switch (reminderType) {
      case 'confirmation':
        return `Meeting Confirmed - ${booking.title || 'Your Meeting'}`
      case '24h':
        return `Reminder: Meeting Tomorrow - ${booking.title || 'Your Meeting'}`
      case '1h':
        return `Reminder: Meeting in 1 Hour - ${booking.title || 'Your Meeting'}`
      case 'follow-up':
        return `Thank You - ${booking.title || 'Your Meeting'}`
      default:
        return `Meeting Reminder - ${booking.title || 'Your Meeting'}`
    }
  }

  private getEmptyStats() {
    return {
      totalScheduled: 0,
      totalSent: 0,
      totalFailed: 0,
      deliveryRate: 0,
      remindersByType: {}
    }
  }
}

// Export singleton instance
export const reminderService = new ReminderService()

// Helper functions for API routes
export async function scheduleReminders(booking: MeetingBooking): Promise<boolean> {
  return reminderService.scheduleReminders(booking)
}

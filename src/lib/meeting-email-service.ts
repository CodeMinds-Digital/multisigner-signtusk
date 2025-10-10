import { Resend } from 'resend'
import { MeetingBooking, MeetingTypeConfig, VideoMeetingLink } from '@/types/meetings'
import { supabaseAdmin } from '@/lib/supabase-admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export class MeetingEmailService {
  private supabase = supabaseAdmin

  async sendBookingConfirmation(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    videoLink?: VideoMeetingLink | null,
    type: 'confirmed' | 'rescheduled' = 'confirmed'
  ): Promise<boolean> {
    try {
      const subject = type === 'rescheduled'
        ? `Meeting Rescheduled: ${meetingType.name}`
        : `Meeting Confirmed: ${meetingType.name}`

      const emailData = {
        from: 'TuskHub Meetings <meetings@tuskhub.com>',
        to: [booking.guest_email],
        subject,
        html: this.generateBookingConfirmationHTML(booking, meetingType, videoLink, type),
        attachments: [
          {
            filename: 'meeting.ics',
            content: this.generateICSFile(booking, meetingType, videoLink)
          }
        ]
      }

      if (!process.env.RESEND_API_KEY) {
        console.log('📧 SIMULATED MEETING EMAIL:', {
          to: booking.guest_email,
          subject,
          type: 'booking_confirmation'
        })
        return true
      }

      const { data, error } = await resend.emails.send(emailData)

      if (error) {
        console.error('Error sending booking confirmation:', error)
        return false
      }

      // Track email sent
      await this.trackEmailSent(booking.id, 'confirmation', booking.guest_email)

      return true
    } catch (error) {
      console.error('Error in sendBookingConfirmation:', error)
      return false
    }
  }

  async sendBookingReminder(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    reminderType: '24h' | '1h',
    videoLink?: VideoMeetingLink | null
  ): Promise<boolean> {
    try {
      const timeText = reminderType === '24h' ? '24 hours' : '1 hour'
      const subject = `Reminder: Meeting in ${timeText} - ${meetingType.name}`

      const emailData = {
        from: 'TuskHub Meetings <meetings@tuskhub.com>',
        to: [booking.guest_email],
        subject,
        html: this.generateReminderHTML(booking, meetingType, videoLink, reminderType)
      }

      if (!process.env.RESEND_API_KEY) {
        console.log('📧 SIMULATED MEETING REMINDER:', {
          to: booking.guest_email,
          subject,
          type: reminderType
        })
        return true
      }

      const { data, error } = await resend.emails.send(emailData)

      if (error) {
        console.error('Error sending reminder:', error)
        return false
      }

      // Track email sent
      await this.trackEmailSent(booking.id, reminderType, booking.guest_email)

      return true
    } catch (error) {
      console.error('Error in sendBookingReminder:', error)
      return false
    }
  }

  async sendCancellationNotification(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    reason?: string
  ): Promise<boolean> {
    try {
      const subject = `Meeting Cancelled: ${meetingType.name}`

      const emailData = {
        from: 'TuskHub Meetings <meetings@tuskhub.com>',
        to: [booking.guest_email],
        subject,
        html: this.generateCancellationHTML(booking, meetingType, reason)
      }

      if (!process.env.RESEND_API_KEY) {
        console.log('📧 SIMULATED CANCELLATION EMAIL:', {
          to: booking.guest_email,
          subject,
          reason
        })
        return true
      }

      const { data, error } = await resend.emails.send(emailData)

      if (error) {
        console.error('Error sending cancellation:', error)
        return false
      }

      // Track email sent
      await this.trackEmailSent(booking.id, 'cancellation', booking.guest_email)

      return true
    } catch (error) {
      console.error('Error in sendCancellationNotification:', error)
      return false
    }
  }

  private generateBookingConfirmationHTML(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    videoLink?: VideoMeetingLink | null,
    type: 'confirmed' | 'rescheduled' = 'confirmed'
  ): string {
    const meetingDate = new Date(booking.scheduled_at)
    const endTime = new Date(meetingDate.getTime() + (booking.duration_minutes * 60 * 1000))

    const actionText = type === 'rescheduled' ? 'rescheduled' : 'confirmed'

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Meeting ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">TuskHub Meetings</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Professional Meeting Scheduling</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #8B5CF6; margin-top: 0;">Meeting ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
              
              <p>Hi ${booking.guest_name},</p>
              
              <p>Your meeting has been ${actionText}! Here are the details:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">${meetingType.name}</h3>
                <p><strong>Date:</strong> ${meetingDate.toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${meetingDate.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}</p>
                <p><strong>Duration:</strong> ${booking.duration_minutes} minutes</p>
                <p><strong>Format:</strong> ${booking.meeting_format}</p>
                
                ${videoLink ? `
                  <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <h4 style="margin-top: 0;">Video Meeting Details</h4>
                    <p><strong>Join URL:</strong> <a href="${videoLink.join_url}" style="color: #2563eb;">${videoLink.join_url}</a></p>
                    ${videoLink.password ? `<p><strong>Password:</strong> ${videoLink.password}</p>` : ''}
                  </div>
                ` : ''}
                
                ${booking.guest_notes ? `<p><strong>Notes:</strong> ${booking.guest_notes}</p>` : ''}
              </div>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.booking_token}" 
                   style="background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Booking Details
                </a>
              </div>
              
              <p>Need to reschedule or cancel? <a href="${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.booking_token}" style="color: #8B5CF6;">Click here</a></p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              
              <p style="color: #666; font-size: 14px;">
                This email was sent by TuskHub Meetings. If you have any questions, please contact support.
              </p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateReminderHTML(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    videoLink?: VideoMeetingLink | null,
    reminderType: '24h' | '1h' = '24h'
  ): string {
    const meetingDate = new Date(booking.scheduled_at)
    const timeText = reminderType === '24h' ? '24 hours' : '1 hour'

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Meeting Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">⏰ Meeting Reminder</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">TuskHub Meetings</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #f59e0b; margin-top: 0;">Meeting in ${timeText}</h2>
              
              <p>Hi ${booking.guest_name},</p>
              
              <p>This is a reminder that you have a meeting scheduled in ${timeText}.</p>
              
              <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">${meetingType.name}</h3>
                <p><strong>Date:</strong> ${meetingDate.toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${meetingDate.toLocaleTimeString()}</p>
                <p><strong>Duration:</strong> ${booking.duration_minutes} minutes</p>
                
                ${videoLink ? `
                  <div style="margin: 15px 0; text-align: center;">
                    <a href="${videoLink.join_url}" 
                       style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Join Meeting
                    </a>
                  </div>
                ` : ''}
              </div>
              
              <p>See you soon!</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateCancellationHTML(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    reason?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Meeting Cancelled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Meeting Cancelled</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">TuskHub Meetings</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #dc3545; margin-top: 0;">Meeting Cancelled</h2>
              
              <p>Hi ${booking.guest_name},</p>
              
              <p>Unfortunately, your meeting has been cancelled.</p>
              
              <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545;">
                <h3 style="margin-top: 0; color: #721c24;">${meetingType.name}</h3>
                <p><strong>Originally scheduled:</strong> ${new Date(booking.scheduled_at).toLocaleString()}</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
              </div>
              
              <p>We apologize for any inconvenience. Feel free to schedule a new meeting at your convenience.</p>
            </div>
          </div>
        </body>
      </html>
    `
  }

  private generateICSFile(
    booking: MeetingBooking,
    meetingType: MeetingTypeConfig,
    videoLink?: VideoMeetingLink | null
  ): string {
    const startDate = new Date(booking.scheduled_at)
    const endDate = new Date(startDate.getTime() + (booking.duration_minutes * 60 * 1000))

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const location = videoLink ? videoLink.join_url : (booking.location || 'TBD')

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TuskHub//Meeting Scheduler//EN
BEGIN:VEVENT
UID:${booking.id}@tuskhub.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${meetingType.name}
DESCRIPTION:Meeting with ${booking.guest_name}${booking.guest_notes ? '\\n\\nNotes: ' + booking.guest_notes : ''}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`
  }

  private async trackEmailSent(bookingId: string, type: string, recipient: string): Promise<void> {
    try {
      await this.supabase
        .from('meeting_reminders')
        .insert({
          booking_id: bookingId,
          reminder_type: type as any,
          scheduled_at: new Date().toISOString(),
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_email: recipient
        })
    } catch (error) {
      console.error('Error tracking email:', error)
    }
  }
}

// Export singleton instance
export const meetingEmailService = new MeetingEmailService()

// Helper functions for API routes
export async function sendBookingConfirmation(
  booking: MeetingBooking,
  meetingType: MeetingTypeConfig,
  videoLink?: VideoMeetingLink | null,
  type: 'confirmed' | 'rescheduled' = 'confirmed'
): Promise<boolean> {
  return meetingEmailService.sendBookingConfirmation(booking, meetingType, videoLink, type)
}

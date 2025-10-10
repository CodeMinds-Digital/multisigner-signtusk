import { MeetingBooking, VideoMeetingLink } from '@/types/meetings'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Video meeting service for generating meeting links
export class VideoMeetingService {
  private supabase = supabaseAdmin

  async generateMeetingLink(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
    try {
      // For now, we'll generate Google Meet links
      // In production, this would integrate with actual video providers
      const meetingId = this.generateMeetingId()
      const joinUrl = `https://meet.google.com/${meetingId}`

      const videoLinkData = {
        booking_id: booking.id,
        platform: 'google-meet' as const,
        meeting_id: meetingId,
        join_url: joinUrl,
        host_url: joinUrl,
        waiting_room_enabled: true,
        recording_enabled: false,
        status: 'active' as const
      }

      const { data: videoLink, error } = await this.supabase
        .from('meeting_video_links')
        .insert(videoLinkData)
        .select()
        .single()

      if (error) {
        console.error('Error creating video link:', error)
        return null
      }

      return videoLink
    } catch (error) {
      console.error('Error in generateMeetingLink:', error)
      return null
    }
  }

  async generateZoomMeeting(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
    // TODO: Integrate with Zoom API
    // This would require Zoom OAuth and API credentials
    try {
      const meetingData = {
        topic: booking.title || `Meeting with ${booking.guest_name}`,
        type: 2, // Scheduled meeting
        start_time: booking.scheduled_at,
        duration: booking.duration_minutes,
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
          mute_upon_entry: true,
          waiting_room: true,
          auto_recording: 'none'
        }
      }

      // Mock Zoom response for now
      const mockZoomResponse = {
        id: this.generateMeetingId(),
        join_url: `https://zoom.us/j/${this.generateMeetingId()}`,
        start_url: `https://zoom.us/s/${this.generateMeetingId()}`,
        password: this.generatePassword()
      }

      const videoLinkData = {
        booking_id: booking.id,
        platform: 'zoom' as const,
        meeting_id: mockZoomResponse.id,
        join_url: mockZoomResponse.join_url,
        host_url: mockZoomResponse.start_url,
        password: mockZoomResponse.password,
        waiting_room_enabled: true,
        recording_enabled: false,
        status: 'active' as const
      }

      const { data: videoLink, error } = await this.supabase
        .from('meeting_video_links')
        .insert(videoLinkData)
        .select()
        .single()

      if (error) {
        console.error('Error creating Zoom link:', error)
        return null
      }

      return videoLink
    } catch (error) {
      console.error('Error in generateZoomMeeting:', error)
      return null
    }
  }

  async generateTeamsMeeting(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
    // TODO: Integrate with Microsoft Teams API
    try {
      const meetingId = this.generateMeetingId()
      const joinUrl = `https://teams.microsoft.com/l/meetup-join/${meetingId}`

      const videoLinkData = {
        booking_id: booking.id,
        platform: 'teams' as const,
        meeting_id: meetingId,
        join_url: joinUrl,
        host_url: joinUrl,
        waiting_room_enabled: true,
        recording_enabled: false,
        status: 'active' as const
      }

      const { data: videoLink, error } = await this.supabase
        .from('meeting_video_links')
        .insert(videoLinkData)
        .select()
        .single()

      if (error) {
        console.error('Error creating Teams link:', error)
        return null
      }

      return videoLink
    } catch (error) {
      console.error('Error in generateTeamsMeeting:', error)
      return null
    }
  }

  async updateMeetingStatus(bookingId: string, status: 'active' | 'ended' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('meeting_video_links')
        .update({ status })
        .eq('booking_id', bookingId)

      if (error) {
        console.error('Error updating meeting status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateMeetingStatus:', error)
      return false
    }
  }

  async getMeetingLink(bookingId: string): Promise<VideoMeetingLink | null> {
    try {
      const { data: videoLink, error } = await this.supabase
        .from('meeting_video_links')
        .select('*')
        .eq('booking_id', bookingId)
        .single()

      if (error) {
        console.error('Error fetching video link:', error)
        return null
      }

      return videoLink
    } catch (error) {
      console.error('Error in getMeetingLink:', error)
      return null
    }
  }

  private generateMeetingId(): string {
    // Generate a random meeting ID
    const chars = '0123456789'
    let result = ''
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private generatePassword(): string {
    // Generate a random 6-digit password
    return Math.floor(100000 + Math.random() * 900000).toString()
  }
}

// Export singleton instance
export const videoMeetingService = new VideoMeetingService()

// Helper function for API routes
export async function generateVideoMeetingLink(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
  return videoMeetingService.generateMeetingLink(booking)
}

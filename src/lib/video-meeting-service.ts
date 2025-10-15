import { MeetingBooking, VideoMeetingLink } from '@/types/meetings'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Video meeting service for generating meeting links
export class VideoMeetingService {
  private supabase = supabaseAdmin

  async generateMeetingLink(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
    try {
      // Use Jitsi Meet - free, no API keys required, supports recording
      const roomName = `tuskhub-meeting-${booking.id}-${Date.now()}`
      const joinUrl = `https://meet.jit.si/${roomName}`

      const videoLinkData = {
        booking_id: booking.id,
        platform: 'jitsi' as const,
        meeting_id: roomName,
        join_url: joinUrl,
        host_url: joinUrl,
        waiting_room_enabled: true,
        recording_enabled: true, // Jitsi supports recording out of the box
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

  async generateJitsiMeeting(booking: MeetingBooking): Promise<VideoMeetingLink | null> {
    // Jitsi Meet - free, no API keys required, supports recording
    try {
      const roomName = `tuskhub-meeting-${booking.id}-${Date.now()}`
      const meetingTitle = booking.title || `Meeting with ${booking.guest_name}`

      // Generate Jitsi meeting URL with configuration
      const baseUrl = 'https://meet.jit.si'
      const configParams = new URLSearchParams({
        '#config.startWithVideoMuted': 'false',
        '#config.startWithAudioMuted': 'true',
        '#config.enableRecording': 'true',
        '#config.requireDisplayName': 'true',
        '#config.subject': meetingTitle,
        '#userInfo.displayName': booking.guest_name,
        '#userInfo.email': booking.guest_email
      })

      const joinUrl = `${baseUrl}/${roomName}?${configParams}`

      const videoLinkData = {
        booking_id: booking.id,
        platform: 'jitsi' as const,
        meeting_id: roomName,
        join_url: joinUrl,
        host_url: joinUrl,
        waiting_room_enabled: false, // Jitsi doesn't have traditional waiting room
        recording_enabled: true, // Recording available to all participants
        status: 'active' as const
      }

      const { data: videoLink, error } = await this.supabase
        .from('meeting_video_links')
        .insert(videoLinkData)
        .select()
        .single()

      if (error) {
        console.error('Error creating Jitsi link:', error)
        return null
      }

      return videoLink
    } catch (error) {
      console.error('Error in generateJitsiMeeting:', error)
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

  /**
   * Generate Jitsi meeting URL with custom configuration
   */
  generateJitsiMeetingUrl(roomName: string, options: {
    displayName?: string
    email?: string
    subject?: string
    enableRecording?: boolean
    startWithVideoMuted?: boolean
    startWithAudioMuted?: boolean
  } = {}): string {
    const baseUrl = 'https://meet.jit.si'
    const params = new URLSearchParams()

    // Add configuration parameters
    if (options.subject) {
      params.append('#config.subject', options.subject)
    }
    if (options.displayName) {
      params.append('#userInfo.displayName', options.displayName)
    }
    if (options.email) {
      params.append('#userInfo.email', options.email)
    }

    // Meeting configuration
    params.append('#config.startWithVideoMuted', String(options.startWithVideoMuted ?? false))
    params.append('#config.startWithAudioMuted', String(options.startWithAudioMuted ?? true))
    params.append('#config.enableRecording', String(options.enableRecording ?? true))
    params.append('#config.requireDisplayName', 'true')
    params.append('#config.enableWelcomePage', 'false')

    return `${baseUrl}/${roomName}?${params.toString()}`
  }

  /**
   * Create meeting with automatic recording setup
   */
  async createMeetingWithRecording(booking: MeetingBooking): Promise<{
    meetingUrl: string
    roomName: string
    recordingEnabled: boolean
  } | null> {
    try {
      const roomName = `tuskhub-${booking.id}-${Date.now()}`
      const meetingUrl = this.generateJitsiMeetingUrl(roomName, {
        displayName: booking.guest_name,
        email: booking.guest_email,
        subject: booking.title || `Meeting with ${booking.guest_name}`,
        enableRecording: true,
        startWithVideoMuted: false,
        startWithAudioMuted: true
      })

      // Save recording configuration to database
      await this.supabase
        .from('meeting_recordings')
        .insert({
          booking_id: booking.id,
          room_name: roomName,
          platform: 'jitsi',
          recording_enabled: true,
          auto_start_recording: true,
          status: 'scheduled'
        })

      return {
        meetingUrl,
        roomName,
        recordingEnabled: true
      }
    } catch (error) {
      console.error('Error creating meeting with recording:', error)
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

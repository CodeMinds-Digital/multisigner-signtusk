// Meeting Module TypeScript Types
// Comprehensive type definitions for the meeting system

export type MeetingType = 'quick-meeting' | 'business-meeting'
export type MeetingFormat = 'video' | 'phone' | 'in-person' | 'any'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show'
export type PaymentStatus = 'not_required' | 'pending' | 'completed' | 'failed' | 'refunded'
export type DocumentStatus = 'pending' | 'sent' | 'viewed' | 'downloaded' | 'signed' | 'expired'
export type WorkflowStage = 'pre-meeting' | 'during-meeting' | 'post-meeting'
export type SendTiming = 'immediate' | 'scheduled' | 'manual'
export type ReminderType = 'confirmation' | '24h' | '1h' | 'follow-up'
export type VideoProvider = 'zoom' | 'google-meet' | 'teams' | 'jitsi' | 'custom'
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'caldav'

// Core Meeting Type Configuration
export interface MeetingTypeConfig {
  id: string
  user_id: string
  name: string
  description?: string
  type: MeetingType
  duration_minutes: number
  meeting_format: MeetingFormat
  color: string
  is_active: boolean
  booking_url_slug: string

  // Pricing
  is_paid: boolean
  price_amount: number // in cents
  currency: string

  // Business meeting specific
  workflow_type?: string
  requires_documents: boolean
  requires_signatures: boolean
  auto_send_documents: boolean

  // Security
  requires_mfa: boolean
  requires_watermarks: boolean
  access_restrictions: Record<string, any>

  // Metadata
  total_bookings: number
  created_at: string
  updated_at: string
}

// User Availability Configuration
export interface TimeSlot {
  start: string // HH:MM format
  end: string   // HH:MM format
}

export interface DayAvailability {
  enabled: boolean
  slots: TimeSlot[]
}

export interface WeeklySchedule {
  monday: DayAvailability
  tuesday: DayAvailability
  wednesday: DayAvailability
  thursday: DayAvailability
  friday: DayAvailability
  saturday: DayAvailability
  sunday: DayAvailability
}

export interface DateOverride {
  date: string // YYYY-MM-DD format
  available: boolean
  slots?: TimeSlot[]
  reason?: string
}

export interface MeetingAvailability {
  id: string
  user_id: string
  timezone: string
  buffer_minutes: number
  max_advance_days: number
  min_notice_hours: number
  weekly_schedule: WeeklySchedule
  date_overrides: DateOverride[]
  created_at: string
  updated_at: string
}

// Meeting Booking
export interface MeetingBooking {
  id: string
  meeting_type_id: string
  host_user_id: string

  // Booking details
  scheduled_at: string
  duration_minutes: number
  status: BookingStatus

  // Meeting information
  title?: string
  description?: string
  meeting_format: MeetingFormat
  location?: string

  // Guest information
  guest_name: string
  guest_email: string
  guest_phone?: string
  guest_company?: string
  guest_title?: string
  guest_notes?: string
  guest_custom_data: Record<string, any>

  // Business meeting specific
  project_details?: string
  budget_range?: string
  timeline?: string
  security_preferences: Record<string, any>

  // Booking management
  booking_token: string
  reschedule_count: number
  max_reschedules: number
  cancellation_reason?: string

  // Payment
  payment_status: PaymentStatus
  payment_intent_id?: string
  amount_paid: number

  created_at: string
  updated_at: string
}

// Meeting Document
export interface MeetingDocument {
  id: string
  booking_id: string
  document_id?: string

  // Workflow
  workflow_stage: WorkflowStage
  send_timing: SendTiming
  scheduled_send_at?: string

  // Status
  status: DocumentStatus
  sent_at?: string
  viewed_at?: string
  downloaded_at?: string

  // Security
  requires_signature: boolean
  access_password?: string
  expires_at?: string

  created_at: string
  updated_at: string
}

// Workflow Configuration
export interface WorkflowAction {
  type: string
  config: Record<string, any>
  delay?: number // minutes
}

export interface MeetingWorkflow {
  id: string
  user_id: string
  meeting_type_id?: string

  name: string
  description?: string
  workflow_type: string
  is_active: boolean

  trigger_events: string[]
  actions: WorkflowAction[]
  document_templates: string[]

  created_at: string
  updated_at: string
}

// Analytics Event
export interface MeetingAnalyticsEvent {
  id: string
  booking_id: string

  event_type: string
  event_data: Record<string, any>

  user_agent?: string
  ip_address?: string
  session_id?: string

  country?: string
  region?: string
  city?: string

  page_load_time?: number
  interaction_time?: number

  created_at: string
}

// Email Reminder
export interface MeetingReminder {
  id: string
  booking_id: string

  reminder_type: ReminderType
  scheduled_at: string

  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  sent_at?: string
  error_message?: string

  recipient_email: string
  email_subject?: string
  email_template?: string

  created_at: string
}

// Calendar Integration
export interface CalendarIntegration {
  id: string
  user_id: string

  provider: CalendarProvider
  provider_account_id: string

  access_token?: string
  refresh_token?: string
  token_expires_at?: string

  calendar_id?: string
  calendar_name?: string
  is_primary: boolean
  sync_enabled: boolean

  last_sync_at?: string
  sync_status: 'active' | 'error' | 'disabled'
  sync_error?: string

  created_at: string
  updated_at: string
}

// Video Meeting Link
export interface VideoMeetingLink {
  id: string
  booking_id: string

  platform: VideoProvider
  meeting_id?: string
  join_url: string
  host_url?: string

  password?: string
  waiting_room_enabled: boolean
  recording_enabled: boolean

  status: 'active' | 'ended' | 'cancelled'

  created_at: string
}

// Payment Transaction
export interface PaymentTransaction {
  id: string
  booking_id: string

  stripe_payment_intent_id?: string
  amount: number
  currency: string

  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'

  payment_method_type?: string
  failure_reason?: string
  refund_amount: number
  refunded_at?: string

  created_at: string
  updated_at: string
}

// API Request/Response Types
export interface CreateBookingRequest {
  meeting_type_id: string
  scheduled_at: string
  guest_name: string
  guest_email: string
  guest_phone?: string
  guest_company?: string
  guest_title?: string
  guest_notes?: string
  project_details?: string
  budget_range?: string
  timeline?: string
  security_preferences?: Record<string, any>
}

export interface CreateBookingResponse {
  booking: MeetingBooking
  video_link?: VideoMeetingLink
  payment_url?: string
}

export interface AvailabilityRequest {
  meeting_type_id: string
  date: string // YYYY-MM-DD
  timezone?: string
}

export interface AvailabilityResponse {
  date: string
  available_slots: TimeSlot[]
  timezone: string
}

export interface BookingListRequest {
  status?: BookingStatus
  type?: MeetingType
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface BookingListResponse {
  bookings: (MeetingBooking & {
    meeting_type: MeetingTypeConfig
    documents?: MeetingDocument[]
    video_link?: VideoMeetingLink
  })[]
  total: number
  has_more: boolean
}

// Workflow Template
export interface WorkflowTemplate {
  id: string
  name: string
  description?: string
  category: string
  industry?: string
  template_data: Record<string, any>
  document_templates: string[]
  is_public: boolean
  usage_count: number
  rating: number
  created_by?: string
  created_at: string
  updated_at: string
}

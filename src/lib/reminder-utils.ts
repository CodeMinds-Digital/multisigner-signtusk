/**
 * Reminder Utilities
 * Comprehensive reminder management with 24-hour restrictions and analytics
 */

import { supabaseAdmin } from './supabase-admin'

export interface ReminderRestriction {
  allowed: boolean
  reason?: 'too_soon' | 'expired' | 'completed' | 'request_not_found'
  message: string
  lastReminderAt?: string
  nextAllowedAt?: string
  hoursRemaining?: number
  expiredAt?: string
  status?: string
}

export interface ReminderAnalytics {
  totalReminders: number
  lastReminderAt?: string
  nextAllowedAt?: string
  canSendNow: boolean
  reminderHistory: Array<{
    id: string
    sentAt: string
    channel: string
    reminderType: string
    totalTargets: number
    successfulSends: number
    failedSends: number
    deliveryResults: any[]
  }>
}

export interface ReminderTarget {
  email: string
  name: string
  status: string
}

export interface ReminderResult {
  success: boolean
  message: string
  reminderId?: string
  results?: {
    total: number
    successful: number
    failed: number
    details: Array<{
      email: string
      success: boolean
      error?: string
    }>
  }
}

/**
 * Check if a reminder can be sent (24-hour restriction)
 */
export async function canSendReminder(
  signingRequestId: string,
  userId: string
): Promise<ReminderRestriction> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('can_send_reminder', {
        p_signing_request_id: signingRequestId,
        p_initiated_by: userId
      })

    if (error) {
      console.error('Error checking reminder restriction:', error)
      return {
        allowed: false,
        reason: 'request_not_found',
        message: 'Unable to check reminder restrictions'
      }
    }

    return data as ReminderRestriction
  } catch (error) {
    console.error('Error in canSendReminder:', error)
    return {
      allowed: false,
      reason: 'request_not_found',
      message: 'Unable to check reminder restrictions'
    }
  }
}

/**
 * Get reminder analytics for a signing request
 */
export async function getReminderAnalytics(
  signingRequestId: string,
  userId: string
): Promise<ReminderAnalytics | null> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_reminder_analytics', {
        p_signing_request_id: signingRequestId,
        p_initiated_by: userId
      })

    if (error) {
      console.error('Error getting reminder analytics:', error)
      return null
    }

    if (data?.error) {
      console.error('Access denied for reminder analytics:', data.error)
      return null
    }

    return {
      totalReminders: data.total_reminders || 0,
      lastReminderAt: data.last_reminder_at,
      nextAllowedAt: data.next_allowed_at,
      canSendNow: data.can_send_now || false,
      reminderHistory: data.reminder_history || []
    }
  } catch (error) {
    console.error('Error in getReminderAnalytics:', error)
    return null
  }
}

/**
 * Log reminder activity to analytics
 */
export async function logReminderActivity(
  signingRequestId: string,
  userId: string,
  targetSigners: ReminderTarget[],
  results: Array<{ email: string; success: boolean; error?: string }>,
  reminderType: 'manual' | 'automatic' | 'scheduled' = 'manual',
  channel: 'email' | 'sms' | 'in_app' | 'push' = 'email',
  metadata: Record<string, any> = {}
): Promise<string | null> {
  try {
    const successfulSends = results.filter(r => r.success).length
    const failedSends = results.filter(r => !r.success).length

    const { data: reminderId, error } = await supabaseAdmin
      .rpc('log_reminder_activity', {
        p_signing_request_id: signingRequestId,
        p_initiated_by: userId,
        p_reminder_type: reminderType,
        p_channel: channel,
        p_target_signers: JSON.stringify(targetSigners),
        p_successful_sends: successfulSends,
        p_failed_sends: failedSends,
        p_delivery_results: JSON.stringify(results),
        p_metadata: JSON.stringify(metadata)
      })

    if (error) {
      console.error('Error logging reminder activity:', error)
      return null
    }

    return reminderId
  } catch (error) {
    console.error('Error in logReminderActivity:', error)
    return null
  }
}

/**
 * Format time remaining until next reminder can be sent
 */
export function formatTimeRemaining(nextAllowedAt: string): string {
  const now = new Date()
  const nextAllowed = new Date(nextAllowedAt)
  const diffMs = nextAllowed.getTime() - now.getTime()

  if (diffMs <= 0) {
    return 'Available now'
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  } else {
    return `${minutes}m remaining`
  }
}

/**
 * Get user-friendly restriction message
 */
export function getReminderRestrictionMessage(restriction: ReminderRestriction): string {
  switch (restriction.reason) {
    case 'too_soon':
      return `Must wait 24 hours between reminders. ${restriction.hoursRemaining ? `${restriction.hoursRemaining} hours remaining.` : ''}`

    case 'expired':
      return 'Cannot send reminders for expired documents.'

    case 'completed':
      return 'Cannot send reminders for completed or cancelled documents.'

    case 'request_not_found':
      return 'Signature request not found or access denied.'

    default:
      return restriction.message || 'Reminder not available'
  }
}

/**
 * Check if document has pending signers
 */
export async function hasPendingSigners(signingRequestId: string): Promise<boolean> {
  try {
    const { data: signers, error } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signer_status')
      .eq('signing_request_id', signingRequestId)
      .in('signer_status', ['initiated', 'viewed'])

    if (error) {
      console.error('Error checking pending signers:', error)
      return false
    }

    return (signers?.length || 0) > 0
  } catch (error) {
    console.error('Error in hasPendingSigners:', error)
    return false
  }
}

/**
 * Get pending signers for a signing request
 */
export async function getPendingSigners(signingRequestId: string): Promise<ReminderTarget[]> {
  try {
    const { data: signers, error } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signer_email, signer_name, signer_status')
      .eq('signing_request_id', signingRequestId)
      .in('signer_status', ['initiated', 'viewed'])

    if (error) {
      console.error('Error getting pending signers:', error)
      return []
    }

    return (signers || []).map(signer => ({
      email: signer.signer_email,
      name: signer.signer_name,
      status: signer.signer_status
    }))
  } catch (error) {
    console.error('Error in getPendingSigners:', error)
    return []
  }
}

/**
 * Multi-channel reminder framework (extensible for future SMS/push notifications)
 */
export interface NotificationChannel {
  type: 'email' | 'sms' | 'in_app' | 'push'
  enabled: boolean
  config?: Record<string, any>
}

export interface NotificationPreferences {
  channels: NotificationChannel[]
  frequency: 'immediate' | 'daily' | 'weekly'
  timezone?: string
}

/**
 * Get notification preferences for a user (placeholder for future implementation)
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  // TODO: Implement user notification preferences
  // For now, return default email-only configuration
  return {
    channels: [
      { type: 'email', enabled: true }
    ],
    frequency: 'immediate'
  }
}

/**
 * Send multi-channel reminder (extensible framework)
 */
export async function sendMultiChannelReminder(
  signingRequestId: string,
  targets: ReminderTarget[],
  preferences: NotificationPreferences
): Promise<ReminderResult[]> {
  const results: ReminderResult[] = []

  for (const channel of preferences.channels) {
    if (!channel.enabled) continue

    switch (channel.type) {
      case 'email':
        // Email implementation (existing)
        // This would call the existing email service
        break

      case 'sms':
        // TODO: Implement SMS notifications
        results.push({
          success: false,
          message: 'SMS notifications not yet implemented'
        })
        break

      case 'in_app':
        // TODO: Implement in-app notifications
        results.push({
          success: false,
          message: 'In-app notifications not yet implemented'
        })
        break

      case 'push':
        // TODO: Implement push notifications
        results.push({
          success: false,
          message: 'Push notifications not yet implemented'
        })
        break
    }
  }

  return results
}

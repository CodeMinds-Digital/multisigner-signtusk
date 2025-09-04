import { supabase } from './supabase'

export type NotificationType = 
  | 'signature_request_received'
  | 'signature_request_signed'
  | 'signature_request_declined'
  | 'signature_request_completed'
  | 'signature_request_cancelled'
  | 'signature_request_expired'
  | 'signature_request_reminder'
  | 'document_created'
  | 'document_updated'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  created_at: string
  expires_at?: string
}

export interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  signature_requests: boolean
  document_updates: boolean
  reminders: boolean
  marketing: boolean
}

export class NotificationService {
  private static readonly NOTIFICATIONS_TABLE = 'notifications'
  private static readonly PREFERENCES_TABLE = 'notification_preferences'

  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
    expiresAt?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.NOTIFICATIONS_TABLE)
        .insert([{
          user_id: userId,
          type,
          title,
          message,
          data,
          expires_at: expiresAt,
          read: false,
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error creating notification:', error)
        return false
      }

      // Also send email notification if enabled
      await this.sendEmailNotification(userId, type, title, message, data)

      return true
    } catch (error) {
      console.error('Error creating notification:', error)
      return false
    }
  }

  /**
   * Get notifications for a user
   */
  static async getNotifications(
    userId: string,
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from(this.NOTIFICATIONS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (unreadOnly) {
        query = query.eq('read', false)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.NOTIFICATIONS_TABLE)
        .update({ read: true })
        .eq('id', notificationId)

      return !error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.NOTIFICATIONS_TABLE)
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)

      return !error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.NOTIFICATIONS_TABLE)
        .delete()
        .eq('id', notificationId)

      return !error
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.NOTIFICATIONS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Send email notification (placeholder implementation)
   */
  private static async sendEmailNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ): Promise<boolean> {
    try {
      // Check user preferences
      const preferences = await this.getNotificationPreferences(userId)
      if (!preferences.email_notifications) {
        return true // User has disabled email notifications
      }

      // Check if this type of notification is enabled
      if (type.includes('signature') && !preferences.signature_requests) {
        return true
      }

      if (type.includes('document') && !preferences.document_updates) {
        return true
      }

      // Get user email
      const { data: user, error } = await supabase.auth.getUser()
      if (error || !user.user?.email) {
        console.error('Error getting user email:', error)
        return false
      }

      // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
      console.log('Would send email notification:', {
        to: user.user.email,
        subject: title,
        body: message,
        type,
        data
      })

      return true
    } catch (error) {
      console.error('Error sending email notification:', error)
      return false
    }
  }

  /**
   * Get notification preferences for a user
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from(this.PREFERENCES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !data) {
        // Return default preferences
        return {
          email_notifications: true,
          push_notifications: true,
          signature_requests: true,
          document_updates: true,
          reminders: true,
          marketing: false
        }
      }

      return data
    } catch (error) {
      console.error('Error getting notification preferences:', error)
      return {
        email_notifications: true,
        push_notifications: true,
        signature_requests: true,
        document_updates: true,
        reminders: true,
        marketing: false
      }
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.PREFERENCES_TABLE)
        .upsert([{
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        }])

      return !error
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return false
    }
  }

  /**
   * Create signature request notifications
   */
  static async notifySignatureRequest(
    requestId: string,
    documentName: string,
    requesterEmail: string,
    recipientEmails: string[]
  ): Promise<void> {
    try {
      for (const email of recipientEmails) {
        // Get user ID from email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single()

        if (profile) {
          await this.createNotification(
            profile.id,
            'signature_request_received',
            'New Signature Request',
            `${requesterEmail} has requested your signature on "${documentName}"`,
            {
              request_id: requestId,
              document_name: documentName,
              requester_email: requesterEmail
            }
          )
        }
      }
    } catch (error) {
      console.error('Error creating signature request notifications:', error)
    }
  }

  /**
   * Create signature completion notification
   */
  static async notifySignatureCompleted(
    requestId: string,
    documentName: string,
    signerEmail: string,
    requesterId: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'signature_request_signed',
        'Document Signed',
        `${signerEmail} has signed "${documentName}"`,
        {
          request_id: requestId,
          document_name: documentName,
          signer_email: signerEmail
        }
      )
    } catch (error) {
      console.error('Error creating signature completion notification:', error)
    }
  }

  /**
   * Create document completion notification
   */
  static async notifyDocumentCompleted(
    requestId: string,
    documentName: string,
    requesterId: string,
    allSignerEmails: string[]
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'signature_request_completed',
        'All Signatures Collected',
        `"${documentName}" has been signed by all parties`,
        {
          request_id: requestId,
          document_name: documentName,
          signers: allSignerEmails
        }
      )
    } catch (error) {
      console.error('Error creating document completion notification:', error)
    }
  }

  /**
   * Create reminder notification
   */
  static async notifyReminder(
    requestId: string,
    documentName: string,
    recipientEmail: string,
    daysRemaining: number
  ): Promise<void> {
    try {
      // Get user ID from email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', recipientEmail)
        .single()

      if (profile) {
        await this.createNotification(
          profile.id,
          'signature_request_reminder',
          'Signature Request Reminder',
          `Reminder: "${documentName}" is waiting for your signature (${daysRemaining} days remaining)`,
          {
            request_id: requestId,
            document_name: documentName,
            days_remaining: daysRemaining
          }
        )
      }
    } catch (error) {
      console.error('Error creating reminder notification:', error)
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): () => void {
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: this.NOTIFICATIONS_TABLE,
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }
}

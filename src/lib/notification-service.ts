import { supabase } from './supabase'
import { supabaseAdmin } from './supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export type NotificationType =
  | 'signature_request_received'
  | 'signature_request_updated'
  | 'signature_request_cancelled'
  | 'signature_request_signed'
  | 'signature_request_declined'
  | 'signature_request_completed'
  | 'signature_request_expired'
  | 'signature_request_reminder'
  | 'document_viewed'
  | 'document_accessed'
  | 'document_signed'
  | 'document_declined_by_signer'
  | 'document_expired'
  | 'all_signatures_complete'
  | 'final_document_ready'
  | 'reminder_sent'
  | 'reminder_received'
  | 'expiry_warning'
  | 'deadline_approaching'
  | 'deadline_extended'
  | 'pdf_generated'
  | 'qr_verification'
  | 'document_created'
  | 'document_updated'
  | 'signer_added'
  | 'signer_removed'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
  action_url?: string
  is_read: boolean
  created_at: string
  updated_at: string
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
    actionUrl?: string
  ): Promise<boolean> {
    try {
      console.log('📧 Creating notification:', { userId, type, title })
      const { error } = await supabaseAdmin
        .from(this.NOTIFICATIONS_TABLE)
        .insert([{
          user_id: userId,
          type,
          title,
          message,
          metadata: data,
          action_url: actionUrl,
          is_read: false,
          created_at: new Date().toISOString()
        }])

      if (error) {
        console.error('❌ Error creating notification:', error)
        return false
      }

      console.log('✅ Notification created successfully')

      // Also send email notification if enabled
      await this.sendEmailNotification(userId, type, title, message, data)

      return true
    } catch (error) {
      console.error('❌ Error creating notification:', error)
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
      let query = supabaseAdmin
        .from(this.NOTIFICATIONS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (unreadOnly) {
        query = query.eq('is_read', false)
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
      const { error } = await supabaseAdmin
        .from(this.NOTIFICATIONS_TABLE)
        .update({ is_read: true, updated_at: new Date().toISOString() })
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
      const { error } = await supabaseAdmin
        .from(this.NOTIFICATIONS_TABLE)
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

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
      const { error } = await supabaseAdmin
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
      const { count, error } = await supabaseAdmin
        .from(this.NOTIFICATIONS_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

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
   * Send email notification using Resend
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
        console.log('📧 Email notifications disabled for user:', userId)
        return true // User has disabled email notifications
      }

      // Check if this type of notification is enabled
      if (type.includes('signature') && !preferences.signature_requests) {
        console.log('📧 Signature request emails disabled for user:', userId)
        return true
      }

      if (type.includes('document') && !preferences.document_updates) {
        console.log('📧 Document update emails disabled for user:', userId)
        return true
      }

      // Get user email from user_profiles table
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single()

      if (profileError || !profile?.email) {
        console.error('❌ Error getting user email for notifications:', profileError)
        return false
      }

      // Skip email sending if no Resend API key
      if (!process.env.RESEND_API_KEY) {
        console.log('📧 RESEND_API_KEY not configured, skipping email send to:', profile.email)
        return true
      }

      // Generate action URL if provided
      const actionUrl = data?.action_url ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://multisigner.netlify.app'}${data.action_url}` : undefined

      // Create email content
      const emailHtml = this.generateEmailTemplate(type, title, message, profile.full_name || profile.email, data, actionUrl)
      const emailText = this.generateEmailText(title, message, actionUrl)

      // Send email using Resend
      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME || 'SignTusk'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@notifications.signtusk.com'}>`,
        to: [profile.email],
        subject: title,
        html: emailHtml,
        text: emailText,
        headers: {
          'X-SignTusk-Type': type,
          'X-SignTusk-User-ID': userId
        }
      })

      if (emailError) {
        console.error('❌ Error sending email notification:', emailError)
        return false
      }

      console.log('✅ Email notification sent successfully:', {
        to: profile.email,
        type,
        messageId: emailResult?.id
      })

      return true
    } catch (error) {
      console.error('❌ Error sending email notification:', error)
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
   * Notify when document is declined by a signer
   */
  static async notifyDocumentDeclined(
    requestId: string,
    documentName: string,
    declinerEmail: string,
    declinerName: string,
    requesterId: string,
    reason: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'signature_request_declined',
        'Document Declined',
        `${declinerName || declinerEmail} has declined to sign "${documentName}". Reason: ${reason}`,
        {
          request_id: requestId,
          document_name: documentName,
          decliner_email: declinerEmail,
          decliner_name: declinerName,
          decline_reason: reason,
          action_url: `/signatures/${requestId}`
        }
      )
      console.log('📧 Created decline notification for requester:', requesterId)
    } catch (error) {
      console.error('Error creating decline notification:', error)
    }
  }

  /**
   * Notify other signers when someone signs a document
   */
  static async notifyOtherSignersOfSignature(
    requestId: string,
    documentName: string,
    signerEmail: string,
    signerName: string,
    otherSignerEmails: string[]
  ): Promise<void> {
    try {
      console.log('📧 Starting signature notifications for other signers:', otherSignerEmails)

      for (const otherSignerEmail of otherSignerEmails) {
        console.log('📧 Looking up user profile for:', otherSignerEmail)

        // Get user ID from email - try both user_profiles and profiles tables
        let profile = null

        // First try user_profiles table
        const { data: userProfile, error: userProfileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', otherSignerEmail)
          .single()

        if (userProfile) {
          profile = { user_id: userProfile.id }
          console.log('📧 Found user in user_profiles:', otherSignerEmail)
        } else {
          console.log('📧 User not found in user_profiles, trying profiles table:', userProfileError)

          // Try profiles table as fallback
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', otherSignerEmail)
            .single()

          if (profileData) {
            profile = { user_id: profileData.id }
            console.log('📧 Found user in profiles table:', otherSignerEmail)
          } else {
            console.log('📧 User not found in profiles table either:', profileError)
          }
        }

        if (profile) {
          await this.createNotification(
            profile.user_id,
            'signature_request_signed',
            'Document Progress Update',
            `${signerName || signerEmail} has signed "${documentName}". You may still need to sign this document.`,
            {
              request_id: requestId,
              document_name: documentName,
              signer_email: signerEmail,
              signer_name: signerName
            }
          )
          console.log('📧 Created signature progress notification for:', otherSignerEmail)
        } else {
          console.log('📧 Skipping notification for unregistered user:', otherSignerEmail)
        }
      }
    } catch (error) {
      console.error('Error creating signature progress notifications:', error)
    }
  }

  /**
   * Notify other signers when document is declined
   */
  static async notifyOtherSignersOfDecline(
    requestId: string,
    documentName: string,
    declinerEmail: string,
    declinerName: string,
    otherSignerEmails: string[]
  ): Promise<void> {
    try {
      console.log('📧 Starting decline notifications for signers:', otherSignerEmails)

      for (const signerEmail of otherSignerEmails) {
        console.log('📧 Looking up user profile for:', signerEmail)

        // Get user ID from email - try both user_profiles and profiles tables
        let profile = null

        // First try user_profiles table
        const { data: userProfile, error: userProfileError } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', signerEmail)
          .single()

        if (userProfile) {
          profile = { user_id: userProfile.id }
          console.log('📧 Found user in user_profiles:', signerEmail)
        } else {
          console.log('📧 User not found in user_profiles, trying profiles table:', userProfileError)

          // Try profiles table as fallback
          const { data: profileData, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', signerEmail)
            .single()

          if (profileData) {
            profile = { user_id: profileData.id }
            console.log('📧 Found user in profiles table:', signerEmail)
          } else {
            console.log('📧 User not found in profiles table either:', profileError)
          }
        }

        if (profile) {
          await this.createNotification(
            profile.user_id,
            'document_declined_by_signer',
            'Document Signing Cancelled',
            `The document "${documentName}" has been declined by ${declinerName || declinerEmail}. No further action is required.`,
            {
              request_id: requestId,
              document_name: documentName,
              decliner_email: declinerEmail,
              decliner_name: declinerName
            }
          )
          console.log('📧 Created decline cascade notification for:', signerEmail)
        } else {
          console.log('📧 Skipping notification for unregistered user:', signerEmail)
        }
      }
    } catch (error) {
      console.error('Error creating decline cascade notifications:', error)
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
        (payload: any) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  /**
   * Notify when document is viewed
   */
  static async notifyDocumentViewed(
    requesterId: string,
    signerEmail: string,
    documentTitle: string,
    requestId: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'document_viewed',
        'Document Viewed',
        `${signerEmail} viewed "${documentTitle}"`,
        {
          request_id: requestId,
          document_title: documentTitle,
          signer_email: signerEmail,
          action_url: `/signature-requests/${requestId}`
        }
      )
    } catch (error) {
      console.error('Error creating document viewed notification:', error)
    }
  }

  /**
   * Notify when PDF is generated
   */
  static async notifyPdfGenerated(
    requesterId: string,
    documentTitle: string,
    requestId: string,
    pdfUrl?: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'pdf_generated',
        'Final PDF Ready',
        `Final signed PDF is ready for "${documentTitle}"`,
        {
          request_id: requestId,
          document_title: documentTitle,
          pdf_url: pdfUrl,
          action_url: `/signature-requests/${requestId}`
        }
      )
    } catch (error) {
      console.error('Error creating PDF generated notification:', error)
    }
  }

  /**
   * Notify about QR verification
   */
  static async notifyQrVerification(
    requesterId: string,
    documentTitle: string,
    requestId: string,
    verifierInfo?: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'qr_verification',
        'Document Verified',
        `Someone verified "${documentTitle}" using QR code`,
        {
          request_id: requestId,
          document_title: documentTitle,
          verifier_info: verifierInfo,
          action_url: `/signature-requests/${requestId}`
        }
      )
    } catch (error) {
      console.error('Error creating QR verification notification:', error)
    }
  }

  /**
   * Notify about expiry warning
   */
  static async notifyExpiryWarning(
    signerUserId: string,
    documentTitle: string,
    requestId: string,
    hoursRemaining: number
  ): Promise<void> {
    try {
      await this.createNotification(
        signerUserId,
        'expiry_warning',
        'Document Expiring Soon',
        `"${documentTitle}" expires in ${hoursRemaining} hours`,
        {
          request_id: requestId,
          document_title: documentTitle,
          hours_remaining: hoursRemaining,
          action_url: `/sign/${requestId}`
        }
      )
    } catch (error) {
      console.error('Error creating expiry warning notification:', error)
    }
  }

  /**
   * Notify when document has expired
   */
  static async notifyDocumentExpired(
    requestId: string,
    documentTitle: string,
    requesterId: string,
    allSignerEmails: string[]
  ): Promise<void> {
    try {
      // Notify requester
      await this.createNotification(
        requesterId,
        'document_expired',
        'Document Expired',
        `The signature request for "${documentTitle}" has expired without all signatures being completed.`,
        {
          request_id: requestId,
          document_title: documentTitle,
          action_url: `/signatures/${requestId}`
        }
      )

      // Notify all signers who haven't signed yet
      for (const signerEmail of allSignerEmails) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .eq('email', signerEmail)
          .single()

        if (profile) {
          await this.createNotification(
            profile.user_id,
            'document_expired',
            'Signature Request Expired',
            `The signature request for "${documentTitle}" has expired. No further action is required.`,
            {
              request_id: requestId,
              document_title: documentTitle
            }
          )
        }
      }
      console.log('📧 Created expiry notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating expiry notifications:', error)
    }
  }

  /**
   * Notify when deadline is approaching
   */
  static async notifyDeadlineApproaching(
    requestId: string,
    documentTitle: string,
    signerEmails: string[],
    hoursRemaining: number
  ): Promise<void> {
    try {
      for (const signerEmail of signerEmails) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('id')
          .eq('email', signerEmail)
          .single()

        if (profile) {
          await this.createNotification(
            profile.id,
            'deadline_approaching',
            'Signature Deadline Approaching',
            `"${documentTitle}" needs to be signed within ${hoursRemaining} hours.`,
            {
              request_id: requestId,
              document_title: documentTitle,
              hours_remaining: hoursRemaining,
              action_url: `/sign/${requestId}?signer=${encodeURIComponent(signerEmail)}`
            }
          )
        }
      }
      console.log('📧 Created deadline approaching notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating deadline approaching notifications:', error)
    }
  }

  /**
   * Notify when a new signer is added to a request
   */
  static async notifySignerAdded(
    requestId: string,
    documentTitle: string,
    newSignerEmail: string,
    newSignerName: string,
    requesterId: string
  ): Promise<void> {
    try {
      // Notify the requester
      await this.createNotification(
        requesterId,
        'signer_added',
        'Signer Added',
        `${newSignerName || newSignerEmail} has been added as a signer for "${documentTitle}".`,
        {
          request_id: requestId,
          document_title: documentTitle,
          new_signer_email: newSignerEmail,
          new_signer_name: newSignerName,
          action_url: `/signatures/${requestId}`
        }
      )

      // Notify the new signer
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', newSignerEmail)
        .single()

      if (profile) {
        await this.createNotification(
          profile.id,
          'signature_request_received',
          'New Signature Request',
          `You have been added as a signer for "${documentTitle}".`,
          {
            request_id: requestId,
            document_title: documentTitle,
            action_url: `/sign/${requestId}?signer=${encodeURIComponent(newSignerEmail)}`
          }
        )
      }
      console.log('📧 Created signer added notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating signer added notifications:', error)
    }
  }

  /**
   * Notify when a signer is removed from a request
   */
  static async notifySignerRemoved(
    requestId: string,
    documentTitle: string,
    removedSignerEmail: string,
    removedSignerName: string,
    requesterId: string
  ): Promise<void> {
    try {
      // Notify the requester
      await this.createNotification(
        requesterId,
        'signer_removed',
        'Signer Removed',
        `${removedSignerName || removedSignerEmail} has been removed from the signature request for "${documentTitle}".`,
        {
          request_id: requestId,
          document_title: documentTitle,
          removed_signer_email: removedSignerEmail,
          removed_signer_name: removedSignerName,
          action_url: `/signatures/${requestId}`
        }
      )

      // Notify the removed signer
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('email', removedSignerEmail)
        .single()

      if (profile) {
        await this.createNotification(
          profile.user_id,
          'signer_removed',
          'Removed from Signature Request',
          `You have been removed from the signature request for "${documentTitle}".`,
          {
            request_id: requestId,
            document_title: documentTitle
          }
        )
      }
      console.log('📧 Created signer removed notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating signer removed notifications:', error)
    }
  }

  /**
   * Notify when deadline is extended
   */
  static async notifyDeadlineExtended(
    requestId: string,
    documentTitle: string,
    newExpiryDate: string,
    requesterId: string,
    allSignerEmails: string[]
  ): Promise<void> {
    try {
      // Notify requester
      await this.createNotification(
        requesterId,
        'deadline_extended',
        'Deadline Extended',
        `The deadline for "${documentTitle}" has been extended to ${new Date(newExpiryDate).toLocaleDateString()}.`,
        {
          request_id: requestId,
          document_title: documentTitle,
          new_expiry_date: newExpiryDate,
          action_url: `/signatures/${requestId}`
        }
      )

      // Notify all signers
      for (const signerEmail of allSignerEmails) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .eq('email', signerEmail)
          .single()

        if (profile) {
          await this.createNotification(
            profile.user_id,
            'deadline_extended',
            'Signature Deadline Extended',
            `The deadline for "${documentTitle}" has been extended to ${new Date(newExpiryDate).toLocaleDateString()}.`,
            {
              request_id: requestId,
              document_title: documentTitle,
              new_expiry_date: newExpiryDate,
              action_url: `/sign/${requestId}?signer=${encodeURIComponent(signerEmail)}`
            }
          )
        }
      }
      console.log('📧 Created deadline extended notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating deadline extended notifications:', error)
    }
  }

  /**
   * Notify when document is accessed for the first time
   */
  static async notifyDocumentAccessed(
    requestId: string,
    documentTitle: string,
    signerEmail: string,
    signerName: string,
    requesterId: string
  ): Promise<void> {
    try {
      await this.createNotification(
        requesterId,
        'document_accessed',
        'Document Accessed',
        `${signerName || signerEmail} has accessed "${documentTitle}" for the first time.`,
        {
          request_id: requestId,
          document_title: documentTitle,
          signer_email: signerEmail,
          signer_name: signerName,
          action_url: `/signatures/${requestId}`
        }
      )
      console.log('📧 Created document access notification for requester:', requesterId)
    } catch (error) {
      console.error('Error creating document access notification:', error)
    }
  }

  /**
   * Notify when final document is ready
   */
  static async notifyFinalDocumentReady(
    requestId: string,
    documentTitle: string,
    requesterId: string,
    allSignerEmails: string[],
    finalPdfUrl: string
  ): Promise<void> {
    try {
      // Notify requester
      await this.createNotification(
        requesterId,
        'final_document_ready',
        'Final Document Ready',
        `The fully signed document "${documentTitle}" is now ready for download.`,
        {
          request_id: requestId,
          document_title: documentTitle,
          final_pdf_url: finalPdfUrl,
          action_url: `/signatures/${requestId}`
        }
      )

      // Notify all signers
      for (const signerEmail of allSignerEmails) {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('user_id')
          .eq('email', signerEmail)
          .single()

        if (profile) {
          await this.createNotification(
            profile.user_id,
            'final_document_ready',
            'Signed Document Available',
            `The fully signed document "${documentTitle}" is now available for download.`,
            {
              request_id: requestId,
              document_title: documentTitle,
              final_pdf_url: finalPdfUrl,
              action_url: `/signatures/${requestId}`
            }
          )
        }
      }
      console.log('📧 Created final document ready notifications for request:', requestId)
    } catch (error) {
      console.error('Error creating final document ready notifications:', error)
    }
  }

  /**
   * Generate HTML email template
   */
  private static generateEmailTemplate(
    type: NotificationType,
    title: string,
    message: string,
    userName: string,
    data?: any,
    actionUrl?: string
  ): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multisigner.netlify.app'

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .icon { font-size: 24px; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">${this.getNotificationIcon(type)}</div>
            <h1>SignTusk</h1>
        </div>
        <div class="content">
            <h2>${title}</h2>
            <p>Hello ${userName},</p>
            <p>${message}</p>
            ${actionUrl ? `<a href="${actionUrl}" class="button">Take Action</a>` : ''}
            ${data?.document_title ? `<p><strong>Document:</strong> ${data.document_title}</p>` : ''}
            ${data?.expires_at ? `<p><strong>Expires:</strong> ${new Date(data.expires_at).toLocaleDateString()}</p>` : ''}
        </div>
        <div class="footer">
            <p>This email was sent by SignTusk. If you no longer wish to receive these emails, you can update your notification preferences in your account settings.</p>
            <p><a href="${baseUrl}">Visit SignTusk</a></p>
        </div>
    </div>
</body>
</html>`
  }

  /**
   * Generate plain text email
   */
  private static generateEmailText(
    title: string,
    message: string,
    actionUrl?: string
  ): string {
    let text = `${title}\n\n${message}\n\n`

    if (actionUrl) {
      text += `Take action: ${actionUrl}\n\n`
    }

    text += `---\nThis email was sent by SignTusk.\nVisit: ${process.env.NEXT_PUBLIC_APP_URL || 'https://multisigner.netlify.app'}`

    return text
  }

  /**
   * Get notification icon for email templates
   */
  private static getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case 'signature_request_received':
      case 'reminder_received':
        return '📝'
      case 'document_viewed':
      case 'document_accessed':
        return '👁️'
      case 'document_signed':
      case 'signature_request_signed':
        return '✅'
      case 'signature_request_declined':
      case 'document_declined_by_signer':
        return '❌'
      case 'all_signatures_complete':
      case 'signature_request_completed':
        return '🎉'
      case 'pdf_generated':
      case 'final_document_ready':
        return '📄'
      case 'expiry_warning':
      case 'deadline_approaching':
        return '⚠️'
      case 'document_expired':
        return '⏰'
      case 'signer_added':
        return '➕'
      case 'signer_removed':
        return '➖'
      case 'deadline_extended':
        return '📅'
      default:
        return '🔔'
    }
  }
}

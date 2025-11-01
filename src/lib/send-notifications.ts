/**
 * Send Notifications Service
 * Real-time notifications for document events
 */

import { createClient } from '@supabase/supabase-js'
import * as SendEmailService from './send-email-service'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export type NotificationType =
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_printed'
  | 'nda_accepted'
  | 'email_verified'
  | 'feedback_submitted'
  | 'high_engagement'
  | 'returning_visitor'

export interface NotificationData {
  type: NotificationType
  documentId: string
  documentTitle: string
  linkId?: string
  visitorEmail?: string
  visitorFingerprint?: string
  visitorLocation?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  emailNotifications: boolean
  realtimeNotifications: boolean
  slackNotifications: boolean
  webhookNotifications: boolean
  notifyOnView: boolean
  notifyOnDownload: boolean
  notifyOnPrint: boolean
  notifyOnNDA: boolean
  notifyOnHighEngagement: boolean
  notifyOnReturningVisitor: boolean
}

export class SendNotifications {
  /**
   * Send real-time notification via Supabase Realtime
   */
  static async sendRealtimeNotification(
    userId: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      // Insert notification into database
      // This will trigger Supabase Realtime to broadcast to subscribers
      await supabaseAdmin
        .from('send_notifications')
        .insert({
          user_id: userId,
          type: notification.type,
          document_id: notification.documentId,
          link_id: notification.linkId,
          title: this.getNotificationTitle(notification),
          message: this.getNotificationMessage(notification),
          metadata: notification.metadata || {},
          read: false
        })
    } catch (error) {
      console.error('Failed to send realtime notification:', error)
    }
  }

  /**
   * Send email notification (now uses queue for better performance)
   */
  static async sendEmailNotification(
    userId: string,
    userEmail: string,
    userName: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      // Import queue service dynamically to avoid circular dependencies
      const { SendEmailQueueService } = await import('./send-email-queue-service')

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const analyticsUrl = `${appUrl}/send/analytics/${notification.documentId}`

      // Queue appropriate email based on notification type
      switch (notification.type) {
        case 'document_viewed':
          await SendEmailQueueService.queueDocumentViewedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            viewerEmail: notification.visitorEmail,
            viewerLocation: notification.visitorLocation,
            viewTime: new Date().toLocaleString(),
            analyticsUrl,
            userId: userId,
            documentId: notification.documentId
          }, 'normal')
          break

        case 'document_downloaded':
          await SendEmailQueueService.queueDocumentDownloadedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            downloaderEmail: notification.visitorEmail,
            downloadTime: new Date().toLocaleString(),
            analyticsUrl,
            userId: userId,
            documentId: notification.documentId
          }, 'normal')
          break

        case 'nda_accepted':
          await SendEmailQueueService.queueNDAAcceptedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            signerName: notification.metadata?.signerName || 'Unknown',
            signerEmail: notification.visitorEmail || 'Unknown',
            signedAt: new Date().toLocaleString(),
            analyticsUrl,
            userId: userId,
            documentId: notification.documentId
          }, 'high')
          break

        case 'high_engagement':
          await SendEmailQueueService.queueHighEngagementEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            visitorEmail: notification.visitorEmail,
            engagementScore: notification.metadata?.engagementScore || 0,
            pagesViewed: notification.metadata?.pagesViewed || 0,
            timeSpent: notification.metadata?.timeSpent || '0 min',
            analyticsUrl,
            userId: userId,
            documentId: notification.documentId
          }, 'high')
          break

        default:
          console.log('No email template for notification type:', notification.type)
      }

      console.log(`📧 Queued ${notification.type} email for ${userEmail}`)
    } catch (error) {
      console.error('Failed to queue email notification:', error)

      // Fallback to synchronous sending if queue fails
      console.warn('⚠️ Falling back to synchronous email sending')
      await this.sendEmailNotificationSync(userId, userEmail, userName, notification)
    }
  }

  /**
   * Synchronous email sending (fallback)
   */
  private static async sendEmailNotificationSync(
    userId: string,
    userEmail: string,
    userName: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const analyticsUrl = `${appUrl}/send/analytics/${notification.documentId}`

      // Send appropriate email based on notification type
      switch (notification.type) {
        case 'document_viewed':
          await SendEmailService.sendDocumentViewedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            viewerEmail: notification.visitorEmail,
            viewerLocation: notification.visitorLocation,
            viewTime: new Date().toLocaleString(),
            analyticsUrl
          })
          break

        case 'document_downloaded':
          await SendEmailService.sendDocumentDownloadedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            downloaderEmail: notification.visitorEmail,
            downloadTime: new Date().toLocaleString(),
            analyticsUrl
          })
          break

        case 'nda_accepted':
          await SendEmailService.sendNDAAcceptedEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            signerName: notification.metadata?.signerName || 'Unknown',
            signerEmail: notification.visitorEmail || 'Unknown',
            signedAt: new Date().toLocaleString(),
            analyticsUrl
          })
          break

        case 'high_engagement':
          await SendEmailService.sendHighEngagementEmail({
            to: userEmail,
            ownerName: userName,
            documentTitle: notification.documentTitle,
            visitorEmail: notification.visitorEmail,
            engagementScore: notification.metadata?.engagementScore || 0,
            pagesViewed: notification.metadata?.pagesViewed || 0,
            timeSpent: notification.metadata?.timeSpent || '0 min',
            analyticsUrl
          })
          break

        default:
          console.log('No email template for notification type:', notification.type)
      }
    } catch (error) {
      console.error('Failed to send email notification synchronously:', error)
    }
  }

  /**
   * Send Slack notification
   */
  static async sendSlackNotification(
    webhookUrl: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      const message = {
        text: this.getNotificationTitle(notification),
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: this.getNotificationTitle(notification),
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: this.getNotificationMessage(notification)
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Document: *${notification.documentTitle}*`
              }
            ]
          }
        ]
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })
    } catch (error) {
      console.error('Failed to send Slack notification:', error)
    }
  }

  /**
   * Send webhook notification
   */
  static async sendWebhookNotification(
    webhookUrl: string,
    notification: NotificationData
  ): Promise<void> {
    try {
      const payload = {
        event: notification.type,
        timestamp: new Date().toISOString(),
        data: {
          documentId: notification.documentId,
          documentTitle: notification.documentTitle,
          linkId: notification.linkId,
          visitorEmail: notification.visitorEmail,
          visitorFingerprint: notification.visitorFingerprint,
          visitorLocation: notification.visitorLocation,
          metadata: notification.metadata
        }
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SendTusk-Event': notification.type,
          'X-SendTusk-Timestamp': new Date().toISOString()
        },
        body: JSON.stringify(payload)
      })
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
    }
  }

  /**
   * Get notification title based on type
   */
  private static getNotificationTitle(notification: NotificationData): string {
    switch (notification.type) {
      case 'document_viewed':
        return '👁️ Document Viewed'
      case 'document_downloaded':
        return '⬇️ Document Downloaded'
      case 'document_printed':
        return '🖨️ Document Printed'
      case 'nda_accepted':
        return '✍️ NDA Accepted'
      case 'email_verified':
        return '✅ Email Verified'
      case 'feedback_submitted':
        return '💬 Feedback Submitted'
      case 'high_engagement':
        return '🌟 High Engagement Detected'
      case 'returning_visitor':
        return '🔄 Returning Visitor'
      default:
        return '📄 Document Activity'
    }
  }

  /**
   * Get notification message based on type
   */
  private static getNotificationMessage(notification: NotificationData): string {
    const visitor = notification.visitorEmail || notification.visitorFingerprint?.substring(0, 12) || 'Someone'
    const location = notification.visitorLocation ? ` from ${notification.visitorLocation}` : ''

    switch (notification.type) {
      case 'document_viewed':
        return `${visitor}${location} is viewing "${notification.documentTitle}"`
      case 'document_downloaded':
        return `${visitor}${location} downloaded "${notification.documentTitle}"`
      case 'document_printed':
        return `${visitor}${location} printed "${notification.documentTitle}"`
      case 'nda_accepted':
        return `${visitor}${location} accepted the NDA for "${notification.documentTitle}"`
      case 'email_verified':
        return `${visitor}${location} verified their email for "${notification.documentTitle}"`
      case 'feedback_submitted':
        return `${visitor}${location} submitted feedback for "${notification.documentTitle}"`
      case 'high_engagement':
        return `${visitor}${location} is highly engaged with "${notification.documentTitle}"`
      case 'returning_visitor':
        return `${visitor}${location} returned to view "${notification.documentTitle}"`
      default:
        return `Activity on "${notification.documentTitle}"`
    }
  }

  /**
   * Get user notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data } = await supabaseAdmin
        .from('send_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        return {
          emailNotifications: data.email_notifications ?? true,
          realtimeNotifications: data.realtime_notifications ?? true,
          slackNotifications: data.slack_notifications ?? false,
          webhookNotifications: data.webhook_notifications ?? false,
          notifyOnView: data.notify_on_view ?? true,
          notifyOnDownload: data.notify_on_download ?? true,
          notifyOnPrint: data.notify_on_print ?? true,
          notifyOnNDA: data.notify_on_nda ?? true,
          notifyOnHighEngagement: data.notify_on_high_engagement ?? true,
          notifyOnReturningVisitor: data.notify_on_returning_visitor ?? true
        }
      }

      // Default preferences
      return {
        emailNotifications: true,
        realtimeNotifications: true,
        slackNotifications: false,
        webhookNotifications: false,
        notifyOnView: true,
        notifyOnDownload: true,
        notifyOnPrint: true,
        notifyOnNDA: true,
        notifyOnHighEngagement: true,
        notifyOnReturningVisitor: true
      }
    } catch (error) {
      console.error('Failed to get notification preferences:', error)
      // Return defaults on error
      return {
        emailNotifications: true,
        realtimeNotifications: true,
        slackNotifications: false,
        webhookNotifications: false,
        notifyOnView: true,
        notifyOnDownload: true,
        notifyOnPrint: true,
        notifyOnNDA: true,
        notifyOnHighEngagement: true,
        notifyOnReturningVisitor: true
      }
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  static shouldNotify(
    preferences: NotificationPreferences,
    notificationType: NotificationType
  ): boolean {
    switch (notificationType) {
      case 'document_viewed':
        return preferences.notifyOnView
      case 'document_downloaded':
        return preferences.notifyOnDownload
      case 'document_printed':
        return preferences.notifyOnPrint
      case 'nda_accepted':
        return preferences.notifyOnNDA
      case 'high_engagement':
        return preferences.notifyOnHighEngagement
      case 'returning_visitor':
        return preferences.notifyOnReturningVisitor
      default:
        return true
    }
  }

  /**
   * Send notification through all enabled channels
   */
  static async notify(
    userId: string,
    userEmail: string,
    userName: string,
    notification: NotificationData,
    webhookUrl?: string,
    slackWebhookUrl?: string
  ): Promise<void> {
    const preferences = await this.getNotificationPreferences(userId)

    // Check if this type of notification should be sent
    if (!this.shouldNotify(preferences, notification.type)) {
      return
    }

    // Send through enabled channels
    const promises: Promise<void>[] = []

    if (preferences.realtimeNotifications) {
      promises.push(this.sendRealtimeNotification(userId, notification))
    }

    if (preferences.emailNotifications) {
      promises.push(this.sendEmailNotification(userId, userEmail, userName, notification))
    }

    if (preferences.slackNotifications && slackWebhookUrl) {
      promises.push(this.sendSlackNotification(slackWebhookUrl, notification))
    }

    if (preferences.webhookNotifications && webhookUrl) {
      promises.push(this.sendWebhookNotification(webhookUrl, notification))
    }

    await Promise.allSettled(promises)
  }
}


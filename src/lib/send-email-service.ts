/**
 * Send Tab Email Service
 * Email notifications for document sharing events using Resend
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface DocumentViewedEmail {
  to: string
  ownerName: string
  documentTitle: string
  viewerEmail?: string
  viewerLocation?: string
  viewTime: string
  analyticsUrl: string
}

export interface DocumentDownloadedEmail {
  to: string
  ownerName: string
  documentTitle: string
  downloaderEmail?: string
  downloadTime: string
  analyticsUrl: string
}

export interface NDAAcceptedEmail {
  to: string
  ownerName: string
  documentTitle: string
  signerName: string
  signerEmail: string
  signedAt: string
  analyticsUrl: string
}

export interface HighEngagementEmail {
  to: string
  ownerName: string
  documentTitle: string
  visitorEmail?: string
  engagementScore: number
  pagesViewed: number
  timeSpent: string
  analyticsUrl: string
}

export interface LinkExpiringEmail {
  to: string
  ownerName: string
  documentTitle: string
  linkUrl: string
  expiresAt: string
  daysRemaining: number
}

export interface WeeklyDigestEmail {
  to: string
  ownerName: string
  weekStart: string
  weekEnd: string
  stats: {
    totalViews: number
    uniqueVisitors: number
    documentsShared: number
    avgEngagement: number
  }
  topDocuments: Array<{
    title: string
    views: number
    url: string
  }>
  dashboardUrl: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Send document viewed notification
export async function sendDocumentViewedEmail(emailData: DocumentViewedEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending document viewed email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `📄 ${emailData.documentTitle} was viewed`,
      html: generateDocumentViewedHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send document downloaded notification
export async function sendDocumentDownloadedEmail(emailData: DocumentDownloadedEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending document downloaded email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `⬇️ ${emailData.documentTitle} was downloaded`,
      html: generateDocumentDownloadedHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send NDA accepted notification
export async function sendNDAAcceptedEmail(emailData: NDAAcceptedEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending NDA accepted email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `✅ NDA Accepted for ${emailData.documentTitle}`,
      html: generateNDAAcceptedHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send high engagement notification
export async function sendHighEngagementEmail(emailData: HighEngagementEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending high engagement email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `🔥 High engagement on ${emailData.documentTitle}`,
      html: generateHighEngagementHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send link expiring warning
export async function sendLinkExpiringEmail(emailData: LinkExpiringEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending link expiring email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `⚠️ Link expiring soon: ${emailData.documentTitle}`,
      html: generateLinkExpiringHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send weekly digest
export async function sendWeeklyDigestEmail(emailData: WeeklyDigestEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending weekly digest email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `📊 Your SendTusk Weekly Summary`,
      html: generateWeeklyDigestHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Simulate email send for development/testing
function simulateEmailSend(emailData: any): EmailResult {
  console.log('📧 Simulating email send:', {
    recipient: emailData.to,
    subject: emailData.documentTitle || 'Email notification',
    type: emailData.engagementScore ? 'high_engagement' : 'notification'
  })

  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

// HTML Email Templates
function generateDocumentViewedHTML(emailData: DocumentViewedEmail): string {
  const viewerInfo = emailData.viewerEmail
    ? `<p><strong>Viewer:</strong> ${emailData.viewerEmail}</p>`
    : ''

  const locationInfo = emailData.viewerLocation
    ? `<p><strong>Location:</strong> ${emailData.viewerLocation}</p>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Viewed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📄 Document Viewed</h1>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Your document <strong>${emailData.documentTitle}</strong> was just viewed.</p>

        ${viewerInfo}
        ${locationInfo}
        <p><strong>Time:</strong> ${emailData.viewTime}</p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.analyticsUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Analytics
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from SendTusk. You can manage your notification preferences in your account settings.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateDocumentDownloadedHTML(emailData: DocumentDownloadedEmail): string {
  const downloaderInfo = emailData.downloaderEmail
    ? `<p><strong>Downloaded by:</strong> ${emailData.downloaderEmail}</p>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Downloaded</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⬇️ Document Downloaded</h1>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Your document <strong>${emailData.documentTitle}</strong> was downloaded.</p>

        ${downloaderInfo}
        <p><strong>Time:</strong> ${emailData.downloadTime}</p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.analyticsUrl}" style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Analytics
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from SendTusk.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateNDAAcceptedHTML(emailData: NDAAcceptedEmail): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NDA Accepted</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">✅ NDA Accepted</h1>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Great news! The NDA for <strong>${emailData.documentTitle}</strong> has been accepted.</p>

        <div style="background-color: white; padding: 15px; border-left: 4px solid #8b5cf6; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Signer:</strong> ${emailData.signerName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${emailData.signerEmail}</p>
          <p style="margin: 5px 0;"><strong>Signed at:</strong> ${emailData.signedAt}</p>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.analyticsUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from SendTusk.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateHighEngagementHTML(emailData: HighEngagementEmail): string {
  const visitorInfo = emailData.visitorEmail
    ? `<p style="margin: 5px 0;"><strong>Visitor:</strong> ${emailData.visitorEmail}</p>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>High Engagement Detected</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🔥 High Engagement Detected!</h1>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Someone is showing high interest in <strong>${emailData.documentTitle}</strong>!</p>

        <div style="background-color: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          ${visitorInfo}
          <p style="margin: 5px 0;"><strong>Engagement Score:</strong> ${emailData.engagementScore}/100</p>
          <p style="margin: 5px 0;"><strong>Pages Viewed:</strong> ${emailData.pagesViewed}</p>
          <p style="margin: 5px 0;"><strong>Time Spent:</strong> ${emailData.timeSpent}</p>
        </div>

        <p style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          💡 <strong>Tip:</strong> This visitor is highly engaged. Consider following up soon!
        </p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.analyticsUrl}" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Full Analytics
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from SendTusk.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateLinkExpiringHTML(emailData: LinkExpiringEmail): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Link Expiring Soon</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">⚠️ Link Expiring Soon</h1>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Your share link for <strong>${emailData.documentTitle}</strong> will expire soon.</p>

        <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Expires:</strong> ${emailData.expiresAt}</p>
          <p style="margin: 5px 0;"><strong>Days Remaining:</strong> ${emailData.daysRemaining}</p>
        </div>

        <p>If you want to extend the link or create a new one, visit your dashboard.</p>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.linkUrl}" style="background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Manage Link
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from SendTusk.
        </p>
      </div>
    </body>
    </html>
  `
}

function generateWeeklyDigestHTML(emailData: WeeklyDigestEmail): string {
  const topDocsHTML = emailData.topDocuments.map((doc, index) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <strong>#${index + 1}</strong>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
        <a href="${doc.url}" style="color: #10b981; text-decoration: none;">${doc.title}</a>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${doc.views} views
      </td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Summary</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">📊 Your Weekly Summary</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">${emailData.weekStart} - ${emailData.weekEnd}</p>
      </div>

      <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
        <p>Hi ${emailData.ownerName},</p>

        <p>Here's your SendTusk activity summary for the past week:</p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background-color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #10b981;">${emailData.stats.totalViews}</div>
            <div style="color: #6b7280; font-size: 14px;">Total Views</div>
          </div>
          <div style="background-color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${emailData.stats.uniqueVisitors}</div>
            <div style="color: #6b7280; font-size: 14px;">Unique Visitors</div>
          </div>
          <div style="background-color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${emailData.stats.documentsShared}</div>
            <div style="color: #6b7280; font-size: 14px;">Documents Shared</div>
          </div>
          <div style="background-color: white; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${emailData.stats.avgEngagement}%</div>
            <div style="color: #6b7280; font-size: 14px;">Avg Engagement</div>
          </div>
        </div>

        <h3 style="margin-top: 30px;">🏆 Top Performing Documents</h3>
        <table style="width: 100%; background-color: white; border-radius: 8px; overflow: hidden;">
          ${topDocsHTML}
        </table>

        <div style="margin: 30px 0; text-align: center;">
          <a href="${emailData.dashboardUrl}" style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            View Full Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          You're receiving this weekly summary because you have email notifications enabled. You can manage your preferences in your account settings.
        </p>
      </div>
    </body>
    </html>
  `
}


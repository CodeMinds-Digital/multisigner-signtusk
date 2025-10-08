/**
 * Send Document Email Service
 * Comprehensive email service for document sharing with all features
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface DocumentShareEmail {
  to: string
  documentTitle: string
  shareUrl: string
  senderName: string
  message?: string
  password?: string
  expiresAt?: string
  viewLimit?: number
  requiresEmail?: boolean
  requiresNda?: boolean
  customBranding?: {
    logoUrl?: string
    brandColor?: string
    companyName?: string
  }
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendDocumentShareEmail(emailData: DocumentShareEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending document share email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `📄 ${emailData.senderName} shared "${emailData.documentTitle}" with you`,
      html: generateDocumentShareHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('📧 Document share email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

function generateDocumentShareHTML(emailData: DocumentShareEmail): string {
  const {
    documentTitle,
    shareUrl,
    senderName,
    message,
    password,
    expiresAt,
    viewLimit,
    requiresEmail,
    requiresNda,
    customBranding
  } = emailData

  const brandColor = customBranding?.brandColor || '#3B82F6'
  const companyName = customBranding?.companyName || 'SendTusk'
  const logoUrl = customBranding?.logoUrl

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Shared: ${documentTitle}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${brandColor} 0%, ${adjustBrightness(brandColor, -20)} 100%); padding: 30px 40px; text-align: center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; margin-bottom: 20px;">` : ''}
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
            📄 Document Shared
          </h1>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
            ${senderName} has shared a document with you
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px;">
          <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 30px; border-left: 4px solid ${brandColor};">
            <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #1f2937;">
              ${documentTitle}
            </h2>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Shared by ${senderName}
            </p>
          </div>

          ${message ? `
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #374151;">Message from ${senderName}:</h3>
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #4b5563; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          ` : ''}

          <!-- Access Information -->
          ${(password || expiresAt || viewLimit || requiresEmail || requiresNda) ? `
            <div style="margin-bottom: 30px;">
              <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #374151;">📋 Access Information</h3>
              <div style="background-color: #fef3c7; border-radius: 6px; padding: 16px; border: 1px solid #fbbf24;">
                ${password ? `<p style="margin: 0 0 8px 0; color: #92400e;"><strong>🔒 Password Required:</strong> ${password}</p>` : ''}
                ${expiresAt ? `<p style="margin: 0 0 8px 0; color: #92400e;"><strong>⏰ Expires:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
                ${viewLimit ? `<p style="margin: 0 0 8px 0; color: #92400e;"><strong>👁️ View Limit:</strong> ${viewLimit} views</p>` : ''}
                ${requiresEmail ? `<p style="margin: 0 0 8px 0; color: #92400e;"><strong>📧 Email Verification Required</strong></p>` : ''}
                ${requiresNda ? `<p style="margin: 0 0 8px 0; color: #92400e;"><strong>📝 NDA Acceptance Required</strong></p>` : ''}
              </div>
            </div>
          ` : ''}

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shareUrl}" 
               style="display: inline-block; background-color: ${brandColor}; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); transition: all 0.2s;">
              📖 View Document
            </a>
          </div>

          <!-- Security Notice -->
          <div style="background-color: #f0f9ff; border-radius: 6px; padding: 16px; border: 1px solid #0ea5e9; margin-top: 30px;">
            <p style="margin: 0; color: #0c4a6e; font-size: 14px; text-align: center;">
              🔒 This document is securely shared and tracked. Your viewing activity may be monitored.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af;">
            This document was shared using ${companyName}
          </p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            If you have trouble viewing this document, copy and paste this link into your browser:<br>
            <span style="word-break: break-all;">${shareUrl}</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace('#', '')
  
  // Parse RGB values
  const num = parseInt(hex, 16)
  const r = (num >> 16) + percent
  const g = (num >> 8 & 0x00FF) + percent
  const b = (num & 0x0000FF) + percent
  
  // Ensure values stay within 0-255 range
  const newR = Math.max(0, Math.min(255, r))
  const newG = Math.max(0, Math.min(255, g))
  const newB = Math.max(0, Math.min(255, b))
  
  return `#${((newR << 16) | (newG << 8) | newB).toString(16).padStart(6, '0')}`
}

function simulateEmailSend(emailData: any): EmailResult {
  console.log('📧 Simulating document share email send:', {
    recipient: emailData.to,
    document: emailData.documentTitle,
    sender: emailData.senderName,
    hasPassword: !!emailData.password,
    hasExpiry: !!emailData.expiresAt,
    hasViewLimit: !!emailData.viewLimit
  })

  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

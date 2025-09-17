import { supabaseAdmin } from './supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SequentialNotificationConfig {
  requestId: string
  nextSignerEmail: string
  nextSignerName?: string
  documentTitle: string
  requesterName: string
  requesterEmail: string
  signingUrl: string
  expiresAt?: string
  currentSignerOrder: number
  totalSigners: number
  previousSignerName?: string
}

export class SequentialNotificationService {
  /**
   * Send notification to next signer in sequential workflow
   */
  static async notifyNextSigner(config: SequentialNotificationConfig): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    try {
      console.log('📧 Sending sequential notification to:', config.nextSignerEmail)

      // Create signing URL with access token
      const signingUrl = await this.generateSigningUrl(config.requestId, config.nextSignerEmail)
      
      // Send email notification
      const emailResult = await this.sendSequentialNotificationEmail({
        ...config,
        signingUrl
      })

      if (emailResult.success) {
        // Log notification in database
        await this.logNotification(config.requestId, config.nextSignerEmail, 'sequential_next', emailResult.messageId)
        
        console.log('✅ Sequential notification sent successfully')
        return { success: true, messageId: emailResult.messageId }
      } else {
        console.error('❌ Failed to send sequential notification:', emailResult.error)
        return { success: false, error: emailResult.error }
      }
    } catch (error) {
      console.error('❌ Error in sequential notification service:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Generate secure signing URL for specific signer
   */
  private static async generateSigningUrl(requestId: string, signerEmail: string): Promise<string> {
    try {
      // Get or create access token for this signer
      const { data: signer, error } = await supabaseAdmin
        .from('signing_request_signers')
        .select('access_token, id')
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)
        .single()

      if (error || !signer) {
        console.error('❌ Error finding signer:', error)
        return `${process.env.NEXT_PUBLIC_APP_URL}/sign/${requestId}`
      }

      // Generate secure URL with access token
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return `${baseUrl}/sign/${requestId}?token=${signer.access_token}&email=${encodeURIComponent(signerEmail)}`
    } catch (error) {
      console.error('❌ Error generating signing URL:', error)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      return `${baseUrl}/sign/${requestId}`
    }
  }

  /**
   * Send sequential notification email
   */
  private static async sendSequentialNotificationEmail(config: SequentialNotificationConfig): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    try {
      const emailHtml = this.generateSequentialEmailTemplate(config)
      const emailText = this.generateSequentialEmailText(config)

      const result = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME || 'SignTusk'} <${process.env.EMAIL_FROM_ADDRESS || 'noreply@signtusk.com'}>`,
        to: [config.nextSignerEmail],
        subject: `Your turn to sign: ${config.documentTitle}`,
        html: emailHtml,
        text: emailText,
        headers: {
          'X-SignTusk-Type': 'sequential-notification',
          'X-SignTusk-Request-ID': config.requestId,
          'X-SignTusk-Signer-Order': config.currentSignerOrder.toString()
        }
      })

      if (result.error) {
        return { success: false, error: result.error.message }
      }

      return { success: true, messageId: result.data?.id }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email sending failed' 
      }
    }
  }

  /**
   * Generate HTML email template for sequential notification
   */
  private static generateSequentialEmailTemplate(config: SequentialNotificationConfig): string {
    const expirationText = config.expiresAt 
      ? `This request expires on ${new Date(config.expiresAt).toLocaleDateString()}.`
      : ''

    const previousSignerText = config.previousSignerName
      ? `${config.previousSignerName} has completed their signature, and now it's your turn.`
      : 'It\'s your turn to sign this document.'

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Turn to Sign - ${config.documentTitle}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📝 Your Turn to Sign</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Hello ${config.nextSignerName || config.nextSignerEmail}!</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${previousSignerText}
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #495057;">📄 Document: ${config.documentTitle}</h3>
              <p style="margin: 10px 0;"><strong>Requested by:</strong> ${config.requesterName}</p>
              <p style="margin: 10px 0;"><strong>Your position:</strong> Signer ${config.currentSignerOrder} of ${config.totalSigners}</p>
              ${expirationText ? `<p style="margin: 10px 0; color: #dc3545;"><strong>⏰ ${expirationText}</strong></p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${config.signingUrl}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                🖊️ Sign Document Now
              </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1976d2;">📋 Sequential Signing Process</h4>
              <p style="margin-bottom: 0; font-size: 14px;">
                This document requires signatures in a specific order. Previous signers have completed their signatures, 
                and you're next in line. Please sign promptly to keep the process moving smoothly.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #6c757d; text-align: center; margin-bottom: 0;">
              If you have any questions, please contact ${config.requesterEmail}<br>
              This is an automated message from SignTusk.
            </p>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate plain text email for sequential notification
   */
  private static generateSequentialEmailText(config: SequentialNotificationConfig): string {
    const expirationText = config.expiresAt 
      ? `This request expires on ${new Date(config.expiresAt).toLocaleDateString()}.`
      : ''

    const previousSignerText = config.previousSignerName
      ? `${config.previousSignerName} has completed their signature, and now it's your turn.`
      : 'It\'s your turn to sign this document.'

    return `
Your Turn to Sign - ${config.documentTitle}

Hello ${config.nextSignerName || config.nextSignerEmail}!

${previousSignerText}

Document Details:
- Title: ${config.documentTitle}
- Requested by: ${config.requesterName}
- Your position: Signer ${config.currentSignerOrder} of ${config.totalSigners}
${expirationText ? `- Expiration: ${expirationText}` : ''}

Sequential Signing Process:
This document requires signatures in a specific order. Previous signers have completed their signatures, and you're next in line. Please sign promptly to keep the process moving smoothly.

Sign the document here: ${config.signingUrl}

If you have any questions, please contact ${config.requesterEmail}

This is an automated message from SignTusk.
    `
  }

  /**
   * Log notification in database for tracking
   */
  private static async logNotification(
    requestId: string, 
    recipientEmail: string, 
    type: string, 
    messageId?: string
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('notification_logs')
        .insert({
          signing_request_id: requestId,
          recipient_email: recipientEmail,
          notification_type: type,
          message_id: messageId,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
    } catch (error) {
      console.error('❌ Error logging notification:', error)
      // Don't throw - notification logging failure shouldn't break the main flow
    }
  }

  /**
   * Send reminder notification for overdue sequential signing
   */
  static async sendSequentialReminder(requestId: string, signerEmail: string): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    try {
      // Get signing request details
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*),
          signers:signing_request_signers(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, error: 'Signing request not found' }
      }

      // Find the signer
      const signer = signingRequest.signers.find((s: any) => s.signer_email === signerEmail)
      if (!signer) {
        return { success: false, error: 'Signer not found' }
      }

      // Check if it's actually their turn
      const allSigners = signingRequest.signers.sort((a: any, b: any) => a.signing_order - b.signing_order)
      const currentSignerIndex = allSigners.findIndex((s: any) => s.signer_email === signerEmail)
      const previousSigners = allSigners.slice(0, currentSignerIndex)
      const incompletePreviousSigners = previousSigners.filter((s: any) => 
        s.status !== 'signed' && s.signer_status !== 'signed'
      )

      if (incompletePreviousSigners.length > 0) {
        return { success: false, error: 'Previous signers have not completed yet' }
      }

      // Send reminder
      const config: SequentialNotificationConfig = {
        requestId,
        nextSignerEmail: signerEmail,
        nextSignerName: signer.signer_name,
        documentTitle: signingRequest.title || signingRequest.document?.name || 'Document',
        requesterName: signingRequest.initiated_by || 'Document Requester',
        requesterEmail: signingRequest.initiated_by || '',
        signingUrl: '', // Will be generated in notifyNextSigner
        expiresAt: signingRequest.expires_at,
        currentSignerOrder: signer.signing_order,
        totalSigners: allSigners.length
      }

      return await this.notifyNextSigner(config)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Check for overdue sequential signers and send reminders
   */
  static async processSequentialReminders(): Promise<{
    processed: number
    sent: number
    errors: string[]
  }> {
    try {
      console.log('🔄 Processing sequential signing reminders...')

      // Find signing requests that are overdue for sequential signing
      const { data: overdueRequests, error } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          id,
          title,
          created_at,
          expires_at,
          signers:signing_request_signers(*)
        `)
        .eq('status', 'in_progress')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours

      if (error || !overdueRequests) {
        return { processed: 0, sent: 0, errors: ['Failed to fetch overdue requests'] }
      }

      let processed = 0
      let sent = 0
      const errors: string[] = []

      for (const request of overdueRequests) {
        processed++

        try {
          // Find next signer in sequential order
          const allSigners = request.signers.sort((a: any, b: any) => a.signing_order - b.signing_order)
          const nextSigner = allSigners.find((s: any) => 
            s.status !== 'signed' && s.signer_status !== 'signed' && s.status !== 'declined'
          )

          if (nextSigner) {
            const reminderResult = await this.sendSequentialReminder(request.id, nextSigner.signer_email)
            if (reminderResult.success) {
              sent++
            } else {
              errors.push(`Failed to send reminder for ${request.id}: ${reminderResult.error}`)
            }
          }
        } catch (error) {
          errors.push(`Error processing request ${request.id}: ${error}`)
        }
      }

      console.log(`✅ Processed ${processed} requests, sent ${sent} reminders`)
      return { processed, sent, errors }
    } catch (error) {
      return { 
        processed: 0, 
        sent: 0, 
        errors: [error instanceof Error ? error.message : 'Unknown error'] 
      }
    }
  }
}

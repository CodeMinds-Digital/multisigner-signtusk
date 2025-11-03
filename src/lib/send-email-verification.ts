/**
 * Send Email Verification Service
 * Handles OTP generation, verification, and email sending
 */

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

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

const resend = new Resend(process.env.RESEND_API_KEY)

export class SendEmailVerification {
  /**
   * Generate a random 6-digit OTP code
   */
  static generateOTP(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  /**
   * Generate a numeric 6-digit OTP code
   */
  static generateNumericOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Send verification code via email
   */
  static async sendVerificationCode(
    email: string,
    linkId: string,
    documentTitle: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email address' }
      }

      // Get link details
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return { success: false, error: 'Link not found' }
      }

      // Generate verification code
      const verificationCode = this.generateOTP()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store verification code
      const { error: insertError } = await supabaseAdmin
        .from('send_email_verifications')
        .insert({
          link_id: link.id,
          email,
          verification_code: verificationCode,
          expires_at: expiresAt.toISOString(),
          verified: false
        })

      if (insertError) {
        console.error('Failed to store verification code:', insertError)
        return { success: false, error: 'Failed to generate verification code' }
      }

      // Send email using Resend
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, simulating email send')
        console.log('Verification email:', {
          to: email,
          subject: `Verification code for ${documentTitle}`,
          code: verificationCode,
          expiresIn: '15 minutes'
        })
        return { success: true }
      }

      const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Verification code for ${documentTitle}`,
        html: this.generateVerificationHTML(verificationCode, documentTitle, email),
        text: `Your verification code for ${documentTitle} is: ${verificationCode}. This code expires in 15 minutes.`
      })

      if (error) {
        console.error('Resend API error:', error)
        return { success: false, error: 'Failed to send verification code' }
      }

      console.log('✅ Verification email sent successfully:', data?.id)
      return { success: true }
    } catch (error) {
      console.error('Send verification error:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  /**
   * Verify OTP code
   */
  static async verifyCode(
    email: string,
    linkId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get link details
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return { success: false, error: 'Link not found' }
      }

      // Get verification record
      const { data: verification, error: verifyError } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*')
        .eq('link_id', link.id)
        .eq('email', email)
        .eq('verification_code', code.toUpperCase())
        .single()

      if (verifyError || !verification) {
        return { success: false, error: 'Invalid verification code' }
      }

      // Check if already verified
      if (verification.verified) {
        return { success: true }
      }

      // Check if expired
      if (new Date(verification.expires_at) < new Date()) {
        return { success: false, error: 'Verification code expired' }
      }

      // Mark as verified
      const { error: updateError } = await supabaseAdmin
        .from('send_email_verifications')
        .update({
          verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', verification.id)

      if (updateError) {
        console.error('Failed to mark as verified:', updateError)
        return { success: false, error: 'Failed to verify code' }
      }

      return { success: true }
    } catch (error) {
      console.error('Verify code error:', error)
      return { success: false, error: 'Failed to verify code' }
    }
  }

  /**
   * Check if email is verified for a link
   */
  static async isEmailVerified(email: string, linkId: string): Promise<boolean> {
    try {
      // Get link details
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return false
      }

      // Check for verified email
      const { data: verification } = await supabaseAdmin
        .from('send_email_verifications')
        .select('verified')
        .eq('link_id', link.id)
        .eq('email', email)
        .eq('verified', true)
        .single()

      return !!verification
    } catch (error) {
      return false
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(
    email: string,
    linkId: string,
    documentTitle: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get link details
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return { success: false, error: 'Link not found' }
      }

      // Delete old unverified codes
      await supabaseAdmin
        .from('send_email_verifications')
        .delete()
        .eq('link_id', link.id)
        .eq('email', email)
        .eq('verified', false)

      // Send new code
      return await this.sendVerificationCode(email, linkId, documentTitle)
    } catch (error) {
      console.error('Resend code error:', error)
      return { success: false, error: 'Failed to resend verification code' }
    }
  }

  /**
   * Clean up expired verification codes
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      await supabaseAdmin
        .from('send_email_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .eq('verified', false)
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }

  /**
   * Get verification attempts count
   */
  static async getAttemptCount(email: string, linkId: string): Promise<number> {
    try {
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return 0
      }

      const { count } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('link_id', link.id)
        .eq('email', email)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour

      return count || 0
    } catch (error) {
      return 0
    }
  }

  /**
   * Send verification code for dataroom link (using UUID link_id directly)
   */
  static async sendDataroomVerificationCode(
    email: string,
    dataroomLinkId: string,
    dataroomName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate email
      if (!this.isValidEmail(email)) {
        return { success: false, error: 'Invalid email address' }
      }

      // Generate verification code
      const verificationCode = this.generateOTP()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

      // Store verification code using dataroom link UUID directly
      const { error: insertError } = await supabaseAdmin
        .from('send_email_verifications')
        .insert({
          link_id: dataroomLinkId,
          email,
          verification_code: verificationCode,
          expires_at: expiresAt.toISOString(),
          verified: false
        })

      if (insertError) {
        console.error('Failed to store verification code:', insertError)
        return { success: false, error: 'Failed to generate verification code' }
      }

      // Send email using Resend
      if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not configured, simulating email send')
        console.log('Verification email:', {
          to: email,
          subject: `Verification code for ${dataroomName}`,
          code: verificationCode,
          expiresIn: '15 minutes'
        })
        return { success: true }
      }

      const fromEmail = 'SendTusk <noreply@notifications.signtusk.com>'

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Verification code for ${dataroomName}`,
        html: this.generateVerificationHTML(verificationCode, dataroomName, email),
        text: `Your verification code for ${dataroomName} is: ${verificationCode}. This code expires in 15 minutes.`
      })

      if (error) {
        console.error('Resend API error:', error)
        return { success: false, error: 'Failed to send verification code' }
      }

      console.log('✅ Verification email sent successfully:', data?.id)
      return { success: true }
    } catch (error) {
      console.error('Send verification error:', error)
      return { success: false, error: 'Failed to send verification code' }
    }
  }

  /**
   * Verify OTP code for dataroom link (using UUID link_id directly)
   */
  static async verifyDataroomCode(
    email: string,
    dataroomLinkId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get verification record
      const { data: verification, error: verifyError } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*')
        .eq('link_id', dataroomLinkId)
        .eq('email', email)
        .eq('verification_code', code.toUpperCase())
        .single()

      if (verifyError || !verification) {
        return { success: false, error: 'Invalid verification code' }
      }

      // Check if already verified
      if (verification.verified) {
        return { success: true }
      }

      // Check if expired
      if (new Date(verification.expires_at) < new Date()) {
        return { success: false, error: 'Verification code expired' }
      }

      // Mark as verified
      const { error: updateError } = await supabaseAdmin
        .from('send_email_verifications')
        .update({
          verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('id', verification.id)

      if (updateError) {
        console.error('Failed to mark as verified:', updateError)
        return { success: false, error: 'Failed to verify code' }
      }

      return { success: true }
    } catch (error) {
      console.error('Verify code error:', error)
      return { success: false, error: 'Failed to verify code' }
    }
  }



  /**
   * Generate HTML email template for verification code
   */
  private static generateVerificationHTML(
    verificationCode: string,
    documentTitle: string,
    email: string
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Access Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
        .header p { color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px; }
        .content { padding: 40px 20px; }
        .verification-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
        .verification-code { font-size: 32px; font-weight: bold; color: #1e293b; letter-spacing: 4px; margin: 10px 0; font-family: 'Courier New', monospace; }
        .document-info { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Document Access Verification</h1>
          <p>Secure access to your shared document</p>
        </div>

        <div class="content">
          <h2>Verification Required</h2>
          <p>Hello,</p>
          <p>You've requested access to a secure document. Please use the verification code below to proceed:</p>

          <div class="verification-box">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #475569;">Your Verification Code</p>
            <div class="verification-code">${verificationCode}</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">Enter this code to access the document</p>
          </div>

          <div class="document-info">
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">📄 Document Details</h3>
            <p style="margin: 0; color: #475569;"><strong>Document:</strong> ${documentTitle}</p>
            <p style="margin: 5px 0 0 0; color: #475569;"><strong>Requested by:</strong> ${email}</p>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> This verification code expires in 15 minutes for security reasons. If you didn't request access to this document, please ignore this email.
          </div>

          <p>If you're having trouble accessing the document, please contact the person who shared it with you.</p>
        </div>

        <div class="footer">
          <p>This email was sent by SendTusk - Secure Document Sharing</p>
          <p>© ${new Date().getFullYear()} SignTusk. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `
  }
}


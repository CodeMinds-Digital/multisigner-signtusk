/**
 * Send Email Verification Service
 * Handles OTP generation, verification, and email sending
 */

import { createClient } from '@supabase/supabase-js'

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

      // Send email (placeholder - implement with email service)
      // TODO: Integrate with email service (SendGrid, Resend, etc.)
      console.log('Verification email:', {
        to: email,
        subject: `Verification code for ${documentTitle}`,
        code: verificationCode,
        expiresIn: '15 minutes'
      })

      // In production, you would:
      // await sendEmail({
      //   to: email,
      //   subject: `Verification code for ${documentTitle}`,
      //   html: `Your verification code is: <strong>${verificationCode}</strong>`
      // })

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
}


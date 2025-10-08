import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY!)

interface VerificationToken {
  id: string
  email: string
  token: string
  expires_at: string
  created_at: string
  used: boolean
}

export class EmailVerificationService {
  private static readonly TOKEN_EXPIRY_HOURS = 24
  private static readonly FROM_EMAIL = 'SignTusk <noreply@notifications.signtusk.com>'

  /**
   * Generate a secure verification token
   */
  private static generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Store verification token in database
   */
  private static async storeToken(email: string, token: string): Promise<boolean> {
    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS)

      const { error } = await supabaseAdmin
        .from('email_verification_tokens')
        .insert({
          email: email.toLowerCase(),
          token,
          expires_at: expiresAt.toISOString(),
          used: false
        })

      return !error
    } catch (error) {
      console.error('Error storing verification token:', error)
      return false
    }
  }

  /**
   * Send verification email using Resend
   */
  static async sendVerificationEmail(email: string, firstName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate verification token
      const token = this.generateToken()

      // Store token in database
      const tokenStored = await this.storeToken(email, token)
      if (!tokenStored) {
        return { success: false, error: 'Failed to generate verification token' }
      }

      // Create verification URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`

      // Send email using Resend
      const { data, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: [email],
        subject: 'Verify your SignTusk account',
        html: this.generateVerificationHTML(firstName || 'User', verificationUrl),
        text: this.generateVerificationText(firstName || 'User', verificationUrl)
      })

      if (error) {
        console.error('Resend API error:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Verification email sent successfully:', { email, messageId: data?.id })
      return { success: true }

    } catch (error) {
      console.error('Error sending verification email:', error)
      return { success: false, error: 'Failed to send verification email' }
    }
  }

  /**
   * Verify email token and confirm user
   */
  static async verifyToken(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find and validate token
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from('email_verification_tokens')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('token', token)
        .eq('used', false)
        .single()

      if (tokenError || !tokenData) {
        return { success: false, error: 'Invalid or expired verification token' }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(tokenData.expires_at)
      if (now > expiresAt) {
        return { success: false, error: 'Verification token has expired' }
      }

      // Mark token as used
      const { error: updateError } = await supabaseAdmin
        .from('email_verification_tokens')
        .update({ used: true })
        .eq('id', tokenData.id)

      if (updateError) {
        console.error('Error updating token:', updateError)
        return { success: false, error: 'Failed to verify token' }
      }

      // Update user's email verification status in user_profiles
      const { error: userUpdateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ email_verified: true })
        .eq('email', email.toLowerCase())

      if (userUpdateError) {
        console.error('Error updating user verification status:', userUpdateError)
        return { success: false, error: 'Failed to update verification status' }
      }

      // Also update Supabase's auth.users email_confirmed_at field for consistency
      try {
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
        const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

        if (authUser && !authUser.email_confirmed_at) {
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            email_confirm: true
          })
          console.log('✅ Updated Supabase auth email confirmation for:', email)
        }
      } catch (authUpdateError) {
        console.warn('⚠️ Failed to update Supabase auth email confirmation (non-critical):', authUpdateError)
        // Don't fail the verification if this update fails
      }

      console.log('✅ Email verified successfully:', email)
      return { success: true }

    } catch (error) {
      console.error('Error verifying token:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Generate HTML email content
   */
  private static generateVerificationHTML(firstName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - SignTusk</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SignTusk!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${firstName},</h2>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Thank you for signing up for SignTusk! To complete your registration and start using our digital signature platform, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            
            <p style="font-size: 12px; color: #999; margin-bottom: 0;">
              This verification link will expire in 24 hours. If you didn't create an account with SignTusk, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `
  }

  /**
   * Generate plain text email content
   */
  private static generateVerificationText(firstName: string, verificationUrl: string): string {
    return `
Hi ${firstName},

Welcome to SignTusk! 

To complete your registration and start using our digital signature platform, please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with SignTusk, you can safely ignore this email.

Best regards,
The SignTusk Team
    `.trim()
  }
}

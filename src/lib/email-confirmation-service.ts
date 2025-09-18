import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface EmailConfirmation {
  id: string
  email: string
  confirmation_token: string
  confirmation_type: 'registration' | 'email_change' | 'password_reset'
  expires_at: string
  confirmed_at?: string
  attempts: number
  max_attempts: number
  created_at: string
  user_data?: any
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content: string
  variables: string[]
}

export class EmailConfirmationService {
  private static readonly MAX_ATTEMPTS = 3
  private static readonly EXPIRY_HOURS = 24
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@signtusk.com'

  /**
   * Send email confirmation for user registration
   */
  static async sendRegistrationConfirmation(
    email: string,
    userData: any,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ): Promise<{ success: boolean; confirmationId?: string; error?: string }> {
    try {
      // Generate confirmation token
      const confirmationToken = this.generateConfirmationToken()
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.EXPIRY_HOURS)

      // Store confirmation record
      const { data: confirmation, error: dbError } = await supabase
        .from('email_confirmations')
        .insert([{
          email,
          confirmation_token: confirmationToken,
          confirmation_type: 'registration',
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          max_attempts: this.MAX_ATTEMPTS,
          created_at: new Date().toISOString(),
          user_data: userData
        }])
        .select()
        .single()

      if (dbError) {
        console.error('Error storing confirmation:', dbError)
        return { success: false, error: 'Failed to create confirmation record' }
      }

      // Generate confirmation URL
      const confirmationUrl = `${baseUrl}/auth/confirm-email?token=${confirmationToken}&email=${encodeURIComponent(email)}`

      // Send confirmation email
      const emailSent = await this.sendConfirmationEmail(
        email,
        userData.first_name || 'User',
        confirmationUrl,
        'registration'
      )

      if (!emailSent) {
        return { success: false, error: 'Failed to send confirmation email' }
      }

      return { success: true, confirmationId: confirmation.id }
    } catch (error) {
      console.error('Error sending registration confirmation:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Verify email confirmation token
   */
  static async verifyConfirmationToken(
    email: string,
    token: string
  ): Promise<{ success: boolean; userData?: any; error?: string }> {
    try {
      // Find confirmation record
      const { data: confirmation, error: fetchError } = await supabase
        .from('email_confirmations')
        .select('*')
        .eq('email', email)
        .eq('confirmation_token', token)
        .eq('confirmation_type', 'registration')
        .is('confirmed_at', null)
        .single()

      if (fetchError || !confirmation) {
        return { success: false, error: 'Invalid or expired confirmation token' }
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(confirmation.expires_at)

      if (now > expiresAt) {
        return { success: false, error: 'Confirmation token has expired' }
      }

      // Check attempt limits
      if (confirmation.attempts >= confirmation.max_attempts) {
        return { success: false, error: 'Maximum confirmation attempts exceeded' }
      }

      // Mark as confirmed
      const { error: updateError } = await supabase
        .from('email_confirmations')
        .update({
          confirmed_at: new Date().toISOString(),
          attempts: confirmation.attempts + 1
        })
        .eq('id', confirmation.id)

      if (updateError) {
        console.error('Error updating confirmation:', updateError)
        return { success: false, error: 'Failed to confirm email' }
      }

      // Create user account
      const userCreated = await this.createUserAccount(email, confirmation.user_data)

      if (!userCreated.success) {
        return { success: false, error: userCreated.error }
      }

      return {
        success: true,
        userData: confirmation.user_data
      }
    } catch (error) {
      console.error('Error verifying confirmation token:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Resend confirmation email
   */
  static async resendConfirmation(
    email: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find existing unconfirmed record
      const { data: confirmation, error: fetchError } = await supabase
        .from('email_confirmations')
        .select('*')
        .eq('email', email)
        .eq('confirmation_type', 'registration')
        .is('confirmed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !confirmation) {
        return { success: false, error: 'No pending confirmation found for this email' }
      }

      // Check if we can resend (not exceeded max attempts)
      if (confirmation.attempts >= confirmation.max_attempts) {
        return { success: false, error: 'Maximum resend attempts exceeded' }
      }

      // Generate new token and extend expiry
      const newToken = this.generateConfirmationToken()
      const newExpiresAt = new Date()
      newExpiresAt.setHours(newExpiresAt.getHours() + this.EXPIRY_HOURS)

      // Update confirmation record
      const { error: updateError } = await supabase
        .from('email_confirmations')
        .update({
          confirmation_token: newToken,
          expires_at: newExpiresAt.toISOString(),
          attempts: confirmation.attempts + 1
        })
        .eq('id', confirmation.id)

      if (updateError) {
        console.error('Error updating confirmation for resend:', updateError)
        return { success: false, error: 'Failed to update confirmation' }
      }

      // Generate new confirmation URL
      const confirmationUrl = `${baseUrl}/auth/confirm-email?token=${newToken}&email=${encodeURIComponent(email)}`

      // Send confirmation email
      const emailSent = await this.sendConfirmationEmail(
        email,
        confirmation.user_data?.first_name || 'User',
        confirmationUrl,
        'registration'
      )

      if (!emailSent) {
        return { success: false, error: 'Failed to send confirmation email' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error resending confirmation:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Send confirmation email using Resend
   */
  private static async sendConfirmationEmail(
    email: string,
    firstName: string,
    confirmationUrl: string,
    type: 'registration' | 'email_change' | 'password_reset'
  ): Promise<boolean> {
    try {
      const template = this.getEmailTemplate(type)

      const htmlContent = template.html_content
        .replace('{{firstName}}', firstName)
        .replace('{{confirmationUrl}}', confirmationUrl)
        .replace('{{email}}', email)

      const textContent = template.text_content
        .replace('{{firstName}}', firstName)
        .replace('{{confirmationUrl}}', confirmationUrl)
        .replace('{{email}}', email)

      const { data, error } = await resend.emails.send({
        from: this.FROM_EMAIL,
        to: [email],
        subject: template.subject,
        html: htmlContent,
        text: textContent
      })

      if (error) {
        console.error('Error sending email:', error)
        return false
      }

      console.log('Confirmation email sent:', data?.id)
      return true
    } catch (error) {
      console.error('Error sending confirmation email:', error)
      return false
    }
  }

  /**
   * Create user account after email confirmation
   */
  private static async createUserAccount(
    email: string,
    userData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          first_name: userData.first_name,
          last_name: userData.last_name,
          display_name: userData.display_name || `${userData.first_name} ${userData.last_name}`.trim()
        }
      })

      if (authError) {
        console.error('Error creating auth user:', authError)
        return { success: false, error: 'Failed to create user account' }
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authUser.user.id,
          email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          display_name: userData.display_name || `${userData.first_name} ${userData.last_name}`.trim(),
          email_verified: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Try to clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(authUser.user.id)
        return { success: false, error: 'Failed to create user profile' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error creating user account:', error)
      return { success: false, error: 'Internal server error' }
    }
  }

  /**
   * Get email template based on type
   */
  private static getEmailTemplate(type: 'registration' | 'email_change' | 'password_reset'): EmailTemplate {
    const templates = {
      registration: {
        id: 'registration-confirmation',
        name: 'Registration Confirmation',
        subject: 'Welcome to SignTusk - Confirm Your Email',
        html_content: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Your Email - SignTusk</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to SignTusk!</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #333; margin-top: 0;">Hi {{firstName}},</h2>
              
              <p>Thank you for signing up for SignTusk! We're excited to have you join our digital signature platform.</p>
              
              <p>To complete your registration and start using SignTusk, please confirm your email address by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{confirmationUrl}}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Confirm Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">{{confirmationUrl}}</p>
              
              <p><strong>This confirmation link will expire in 24 hours.</strong></p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="font-size: 14px; color: #666;">
                If you didn't create an account with SignTusk, you can safely ignore this email.
              </p>
              
              <p style="font-size: 14px; color: #666;">
                Best regards,<br>
                The SignTusk Team
              </p>
            </div>
          </body>
          </html>
        `,
        text_content: `
Welcome to SignTusk!

Hi {{firstName}},

Thank you for signing up for SignTusk! We're excited to have you join our digital signature platform.

To complete your registration and start using SignTusk, please confirm your email address by visiting this link:

{{confirmationUrl}}

This confirmation link will expire in 24 hours.

If you didn't create an account with SignTusk, you can safely ignore this email.

Best regards,
The SignTusk Team
        `,
        variables: ['firstName', 'confirmationUrl', 'email']
      },
      email_change: {
        id: 'email-change-confirmation',
        name: 'Email Change Confirmation',
        subject: 'SignTusk - Confirm Your New Email Address',
        html_content: `<html><body><h2>Confirm Email Change</h2><p>Please confirm your new email address.</p></body></html>`,
        text_content: `Confirm Email Change\n\nPlease confirm your new email address.`,
        variables: ['firstName', 'confirmationUrl', 'email']
      },
      password_reset: {
        id: 'password-reset-confirmation',
        name: 'Password Reset Confirmation',
        subject: 'SignTusk - Password Reset Request',
        html_content: `<html><body><h2>Password Reset</h2><p>Click the link to reset your password.</p></body></html>`,
        text_content: `Password Reset\n\nClick the link to reset your password.`,
        variables: ['firstName', 'confirmationUrl', 'email']
      }
    }

    return templates[type] || templates.registration
  }

  /**
   * Generate secure confirmation token
   */
  private static generateConfirmationToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  /**
   * Clean up expired confirmations
   */
  static async cleanupExpiredConfirmations(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('email_confirmations')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .is('confirmed_at', null)
        .select('id')

      if (error) {
        console.error('Error cleaning up expired confirmations:', error)
        return 0
      }

      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up expired confirmations:', error)
      return 0
    }
  }

  /**
   * Get confirmation status
   */
  static async getConfirmationStatus(email: string): Promise<{
    exists: boolean
    confirmed: boolean
    expired: boolean
    attempts: number
    maxAttempts: number
  }> {
    try {
      const { data: confirmation } = await supabase
        .from('email_confirmations')
        .select('*')
        .eq('email', email)
        .eq('confirmation_type', 'registration')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!confirmation) {
        return {
          exists: false,
          confirmed: false,
          expired: false,
          attempts: 0,
          maxAttempts: this.MAX_ATTEMPTS
        }
      }

      const now = new Date()
      const expiresAt = new Date(confirmation.expires_at)
      const expired = now > expiresAt

      return {
        exists: true,
        confirmed: !!confirmation.confirmed_at,
        expired,
        attempts: confirmation.attempts,
        maxAttempts: confirmation.max_attempts
      }
    } catch (error) {
      console.error('Error getting confirmation status:', error)
      return {
        exists: false,
        confirmed: false,
        expired: false,
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS
      }
    }
  }
}

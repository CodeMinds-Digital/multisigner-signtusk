import * as speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { supabaseAdmin } from './supabase-admin'
import crypto from 'crypto'

export interface TOTPSetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  manualEntryKey: string
}

export interface TOTPVerificationResult {
  success: boolean
  error?: string
  backupCodes?: string[]
}

export class TOTPServiceSpeakeasy {
  /**
   * Generate TOTP secret and QR code for user using Speakeasy
   */
  static async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetup> {
    try {
      console.log('🔐 Setting up TOTP with Speakeasy for user:', userEmail)

      // Generate secret using speakeasy (much more reliable)
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: process.env.TOTP_ISSUER || 'SignTusk',
        length: 32 // 32 bytes = 256 bits for strong security
      })

      console.log('🔑 Generated TOTP secret:', {
        secretLength: secret.base32.length,
        secretPreview: secret.base32.substring(0, 4) + '***',
        hasOtpauthUrl: !!secret.otpauth_url
      })

      // Generate QR code from the otpauth URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!)

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Store TOTP configuration (but don't enable until verified)
      const { error } = await supabaseAdmin
        .from('user_totp_configs')
        .upsert({
          user_id: userId,
          secret: secret.base32, // Store the base32 secret
          backup_codes: backupCodes,
          enabled: false,
          login_mfa_enabled: false,
          signing_mfa_enabled: false,
          default_require_totp: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Error storing TOTP config:', error)
        throw new Error('Failed to store TOTP configuration')
      }

      console.log('✅ TOTP configuration stored successfully')

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      }
    } catch (error) {
      console.error('❌ TOTP setup error:', error)
      throw error
    }
  }

  /**
   * Verify TOTP token and enable TOTP for user
   */
  static async verifyAndEnableTOTP(
    userId: string,
    token: string,
    enableLogin: boolean = false,
    enableSigning: boolean = false
  ): Promise<TOTPVerificationResult> {
    try {
      console.log('🔍 Verifying TOTP with Speakeasy:', {
        userId,
        token: token.substring(0, 3) + '***',
        enableLogin,
        enableSigning
      })

      // Get user's TOTP config
      const { data: config, error } = await supabaseAdmin
        .from('user_totp_configs')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !config) {
        console.log('❌ TOTP config not found:', error?.message)
        return { success: false, error: 'TOTP configuration not found' }
      }

      console.log('📋 TOTP Config found:', {
        hasSecret: !!config.secret,
        secretLength: config.secret?.length,
        enabled: config.enabled
      })

      // Verify token using speakeasy
      const verified = speakeasy.totp.verify({
        secret: config.secret,
        encoding: 'base32',
        token: token,
        window: 2 // Allow 2 time steps (±60 seconds)
      })

      console.log('🔍 Speakeasy verification result:', { verified, token })

      if (verified) {
        console.log('✅ TOTP token valid, updating config...')

        // Enable TOTP with specified options
        const { error: updateError } = await supabaseAdmin
          .from('user_totp_configs')
          .update({
            enabled: true,
            login_mfa_enabled: enableLogin,
            signing_mfa_enabled: enableSigning,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.error('❌ Error updating TOTP config:', updateError)
          return { success: false, error: 'Failed to enable TOTP' }
        }

        console.log('✅ TOTP enabled successfully')
        return {
          success: true,
          backupCodes: config.backup_codes
        }
      } else {
        console.log('❌ TOTP token invalid')
        return { success: false, error: 'Invalid verification code' }
      }
    } catch (error) {
      console.error('❌ TOTP verification error:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Verify TOTP token for login
   */
  static async verifyTOTP(userId: string, token: string): Promise<boolean> {
    try {
      const { data: config } = await supabaseAdmin
        .from('user_totp_configs')
        .select('secret, enabled, login_mfa_enabled')
        .eq('user_id', userId)
        .single()

      if (!config || !config.enabled || !config.login_mfa_enabled) {
        return false
      }

      return speakeasy.totp.verify({
        secret: config.secret,
        encoding: 'base32',
        token: token,
        window: 2
      })
    } catch (error) {
      console.error('TOTP verification error:', error)
      return false
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes = []
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
    }
    return codes
  }

  /**
   * Verify TOTP for signing request
   */
  static async verifySigningTOTP(
    userId: string,
    requestId: string,
    token: string,
    ipAddress?: string
  ): Promise<TOTPVerificationResult> {
    try {
      console.log('🔐 Verifying TOTP for signing with Speakeasy:', { userId, requestId, token: token.substring(0, 3) + '***' })

      // First verify the TOTP token
      const isValid = await this.verifyTOTP(userId, token)

      if (!isValid) {
        return { success: false, error: 'Invalid verification code' }
      }

      console.log('✅ TOTP verified, updating signer record...')

      // Get user email from userId to match signer record
      const { data: user, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('email')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.error('❌ Error fetching user email:', userError)
        return { success: false, error: 'User not found' }
      }

      // Update signer record with TOTP verification using signer_email
      // Note: Temporarily removing totp_verification_ip due to schema cache issues
      const { error } = await supabaseAdmin
        .from('signing_request_signers')
        .update({
          totp_verified: true,
          totp_verified_at: new Date().toISOString()
        })
        .eq('signing_request_id', requestId)
        .eq('signer_email', user.email)

      if (error) {
        console.error('❌ Error updating signer TOTP verification:', error)
        return { success: false, error: 'Failed to update verification status' }
      }

      console.log('✅ Signer TOTP verification updated successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ TOTP signing verification error:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Generate current TOTP token for testing
   */
  static generateToken(secret: string): string {
    return speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    })
  }
}

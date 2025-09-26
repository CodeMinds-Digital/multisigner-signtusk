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

      // Validate inputs
      if (!userId || !userEmail) {
        throw new Error('Invalid user ID or email provided')
      }

      // Check if speakeasy is available
      if (!speakeasy || typeof speakeasy.generateSecret !== 'function') {
        console.error('❌ Speakeasy library not properly loaded')
        throw new Error('TOTP library initialization failed')
      }

      // Check if QRCode is available
      if (!QRCode || typeof QRCode.toDataURL !== 'function') {
        console.error('❌ QRCode library not properly loaded')
        throw new Error('QR code generation library not available')
      }

      // Generate secret using speakeasy (much more reliable)
      const secret = speakeasy.generateSecret({
        name: userEmail,
        issuer: process.env.TOTP_ISSUER || 'SignTusk',
        length: 32 // 32 bytes = 256 bits for strong security
      })

      if (!secret || !secret.base32 || !secret.otpauth_url) {
        console.error('❌ Failed to generate TOTP secret')
        throw new Error('TOTP secret generation failed')
      }

      console.log('🔑 Generated TOTP secret:', {
        secretLength: secret.base32.length,
        secretPreview: secret.base32.substring(0, 4) + '***',
        hasOtpauthUrl: !!secret.otpauth_url
      })

      // Generate QR code from the otpauth URL
      let qrCodeUrl: string
      try {
        qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
      } catch (qrError) {
        console.error('❌ QR code generation failed:', qrError)
        throw new Error('Failed to generate QR code')
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Validate supabaseAdmin connection
      if (!supabaseAdmin) {
        console.error('❌ Supabase admin client not initialized')
        throw new Error('Database connection not available')
      }

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
        console.error('❌ Error storing TOTP config:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw new Error(`Database error: ${error.message}`)
      }

      console.log('✅ TOTP configuration stored successfully')

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      }
    } catch (error) {
      console.error('❌ TOTP setup error:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        userEmail
      })

      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`TOTP setup failed: ${error.message}`)
      } else {
        throw new Error('TOTP setup failed: Unknown error occurred')
      }
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
   * Verify TOTP token specifically for signing (checks signing_mfa_enabled)
   */
  static async verifySigningTOTPToken(userId: string, token: string): Promise<boolean> {
    try {
      console.log('🔐 Verifying TOTP token for signing:', { userId, token: token.substring(0, 3) + '***' })

      // First check if user exists in user_profiles
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, email')
        .eq('id', userId)
        .single()

      if (userError || !userProfile) {
        console.error('❌ User profile not found:', userError)
        return false
      }

      console.log('👤 User profile found:', { id: userProfile.id, email: userProfile.email })

      const { data: config, error: configError } = await supabaseAdmin
        .from('user_totp_configs')
        .select('secret, enabled, signing_mfa_enabled, login_mfa_enabled')
        .eq('user_id', userId)
        .single()

      console.log('📋 TOTP config query result:', {
        hasConfig: !!config,
        configError: configError?.message,
        enabled: config?.enabled,
        signingMfaEnabled: config?.signing_mfa_enabled,
        loginMfaEnabled: config?.login_mfa_enabled,
        hasSecret: !!config?.secret,
        secretLength: config?.secret?.length
      })

      if (configError) {
        console.error('❌ Error fetching TOTP config:', configError)
        return false
      }

      if (!config) {
        console.log('❌ No TOTP config found for user')
        return false
      }

      if (!config.enabled) {
        console.log('❌ TOTP not enabled for user')
        return false
      }

      if (!config.signing_mfa_enabled) {
        console.log('❌ TOTP not enabled for signing for this user')
        return false
      }

      if (!config.secret) {
        console.log('❌ No TOTP secret found')
        return false
      }

      console.log('🔍 Attempting TOTP verification with speakeasy...')
      const verified = speakeasy.totp.verify({
        secret: config.secret,
        encoding: 'base32',
        token: token,
        window: 2
      })

      console.log('🔍 TOTP verification result:', verified)

      if (!verified) {
        // Try to generate the current token for debugging (don't log it in production)
        const currentToken = speakeasy.totp({
          secret: config.secret,
          encoding: 'base32'
        })
        console.log('🔍 Expected token starts with:', currentToken.substring(0, 3) + '***')
        console.log('🔍 Provided token starts with:', token.substring(0, 3) + '***')
      }

      return verified
    } catch (error) {
      console.error('❌ TOTP signing verification error:', error)
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
    _ipAddress?: string
  ): Promise<TOTPVerificationResult> {
    try {
      console.log('🔐 Verifying TOTP for signing with Speakeasy:', { userId, requestId, token: token.substring(0, 3) + '***' })

      // First verify the TOTP token using signing-specific verification
      const isValid = await this.verifySigningTOTPToken(userId, token)

      if (!isValid) {
        console.log('❌ TOTP verification failed for signing')
        return { success: false, error: 'Invalid verification code' }
      }

      console.log('✅ TOTP verified for signing, updating signer record...')

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

      console.log('👤 Found user for TOTP verification:', { userId, email: user.email })

      // Update signer record with TOTP verification using signer_email
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

      console.log('✅ Signer TOTP verification updated successfully for:', user.email)
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

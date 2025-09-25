import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { supabaseAdmin } from './supabase-admin'
import crypto from 'crypto'

// TOTP Configuration - don't set globally to avoid dev mode issues
const TOTP_OPTIONS = {
  step: 30,        // 30-second time window
  window: 2,       // Allow 2 time steps tolerance (±60 seconds)
  digits: 6,       // 6-digit codes
  algorithm: 'sha1' as const, // SHA1 algorithm (standard)
  encoding: 'base32' as const  // Base32 encoding (correct for TOTP)
}

// Helper function to get configured authenticator
function getAuthenticator() {
  // Create a fresh instance with proper options
  const auth = { ...authenticator } as any
  auth.options = { ...TOTP_OPTIONS }
  return auth
}

export interface TOTPSetup {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
  manualEntryKey: string
}

export interface TOTPConfig {
  id: string
  user_id: string
  secret: string
  backup_codes: string[]
  enabled: boolean
  login_mfa_enabled: boolean
  signing_mfa_enabled: boolean
  default_require_totp: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface TOTPVerificationResult {
  success: boolean
  error?: string
  usedBackupCode?: boolean
}

export class TOTPService {
  /**
   * Generate TOTP secret and QR code for user
   */
  static async setupTOTP(userId: string, userEmail: string): Promise<TOTPSetup> {
    try {
      // Get configured authenticator
      const auth = getAuthenticator()

      // Generate secret (base32 encoded)
      const secret = auth.generateSecret()

      console.log('🔑 Generated TOTP secret:', {
        secretLength: secret.length,
        secretPreview: secret.substring(0, 4) + '***',
        isBase32: /^[A-Z2-7]+$/.test(secret)
      })

      // Generate service name for QR code (Zoho OneAuth compatible)
      const serviceName = process.env.TOTP_SERVICE_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'SignTusk'
      const issuer = process.env.TOTP_ISSUER || 'CodeMinds Digital'
      const otpAuthUrl = auth.keyuri(userEmail, serviceName, secret, issuer)

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl)

      // Generate backup codes
      const backupCodes = this.generateBackupCodes()

      // Store TOTP configuration (but don't enable until verified)
      await supabaseAdmin
        .from('user_totp_configs')
        .upsert({
          user_id: userId,
          secret: secret,
          backup_codes: backupCodes,
          enabled: false,
          login_mfa_enabled: false,
          signing_mfa_enabled: false,
          default_require_totp: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      return {
        secret,
        qrCodeUrl,
        backupCodes,
        manualEntryKey: secret
      }
    } catch (error) {
      console.error('Error setting up TOTP:', error)
      throw new Error('Failed to setup TOTP authentication')
    }
  }

  /**
   * Verify TOTP token and enable MFA
   */
  static async verifyAndEnableTOTP(
    userId: string,
    token: string,
    enableLogin: boolean = false,
    enableSigning: boolean = false
  ): Promise<TOTPVerificationResult> {
    try {
      console.log('🔍 TOTP Verification Debug:', { userId, token: token.substring(0, 3) + '***', enableLogin, enableSigning })

      // Get user's TOTP config
      const { data: config, error } = await supabaseAdmin
        .from('user_totp_configs')
        .select('*')
        .eq('user_id', userId)
        .single()

      console.log('📋 TOTP Config Query Result:', {
        hasConfig: !!config,
        error: error?.message,
        configEnabled: config?.enabled,
        secretLength: config?.secret?.length
      })

      if (error || !config) {
        console.log('❌ TOTP config not found:', error?.message)
        return { success: false, error: 'TOTP configuration not found' }
      }

      console.log('🔐 Attempting TOTP verification with authenticator...')

      // Get configured authenticator
      const auth = getAuthenticator()

      // Validate secret format
      const isValidSecret = /^[A-Z2-7]+$/.test(config.secret)
      console.log('🔍 Secret validation:', {
        secretLength: config.secret.length,
        isBase32: isValidSecret,
        secretPreview: config.secret.substring(0, 4) + '***'
      })

      if (!isValidSecret) {
        console.log('❌ Invalid secret format - not base32')
        return { success: false, error: 'Invalid TOTP secret format' }
      }

      // Generate expected tokens for debugging
      const now = Date.now()
      const expectedTokens = []
      for (let i = -2; i <= 2; i++) {
        const timeOffset = now + (i * 30 * 1000)
        try {
          const expectedToken = auth.generate(config.secret, timeOffset)
          expectedTokens.push({
            offset: i,
            token: expectedToken,
            time: new Date(timeOffset).toISOString()
          })
        } catch (error) {
          console.error(`Error generating token for offset ${i}:`, error)
        }
      }

      console.log('🕐 Expected TOTP tokens for time windows:', expectedTokens)
      console.log('📱 Received token from user:', token)

      // Verify token with timeout protection
      const verificationPromise = new Promise<boolean>((resolve) => {
        try {
          const isValid = auth.verify({
            token,
            secret: config.secret
          })
          console.log('🔍 Direct verification result:', isValid)
          resolve(isValid)
        } catch (error) {
          console.error('Authenticator verification error:', error)
          resolve(false)
        }
      })

      // Add timeout protection (5 seconds max)
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.log('⏰ TOTP verification timeout after 5 seconds')
          resolve(false)
        }, 5000)
      })

      const isValid = await Promise.race([verificationPromise, timeoutPromise])

      console.log('🔍 TOTP Verification Result:', { isValid, tokenLength: token.length, userToken: token })

      if (isValid) {
        console.log('✅ TOTP token valid, updating config...')

        // Enable TOTP with specified options
        const { error: updateError } = await supabaseAdmin
          .from('user_totp_configs')
          .update({
            enabled: true,
            login_mfa_enabled: enableLogin,
            signing_mfa_enabled: enableSigning,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (updateError) {
          console.log('❌ Error updating TOTP config:', updateError.message)
          return { success: false, error: 'Failed to enable TOTP' }
        }

        console.log('✅ TOTP enabled successfully')
        return { success: true }
      }

      console.log('❌ TOTP token invalid')
      return { success: false, error: 'Invalid verification code' }
    } catch (error) {
      console.error('❌ Error verifying TOTP:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Check if TOTP is required for user based on personal settings and organization policies
   */
  static async checkTOTPRequirements(
    userId: string,
    context: 'login' | 'signing' = 'login'
  ): Promise<{
    required: boolean
    reason: string
    organizationEnforced: boolean
    userEnabled: boolean
    exemptionActive: boolean
  }> {
    try {
      // Use the database function to check requirements
      const { data, error } = await supabaseAdmin
        .rpc('check_user_totp_requirements', {
          p_user_id: userId,
          p_context: context
        })

      if (error) {
        console.error('Error checking TOTP requirements:', error)
        return {
          required: false,
          reason: 'Error checking requirements',
          organizationEnforced: false,
          userEnabled: false,
          exemptionActive: false
        }
      }

      const result = data as any
      return {
        required: result.totp_required || false,
        reason: result.organization_enforces_login_mfa || result.organization_enforces_signing_mfa
          ? 'Organization policy requires TOTP'
          : result.user_login_mfa_enabled || result.user_signing_mfa_enabled
            ? 'User has enabled TOTP'
            : 'TOTP not required',
        organizationEnforced: result.organization_enforces_login_mfa || result.organization_enforces_signing_mfa || false,
        userEnabled: result.user_has_totp || false,
        exemptionActive: result.exemption_active || false
      }
    } catch (error) {
      console.error('Error checking TOTP requirements:', error)
      return {
        required: false,
        reason: 'Error checking requirements',
        organizationEnforced: false,
        userEnabled: false,
        exemptionActive: false
      }
    }
  }

  /**
   * Verify TOTP token for login or signing
   */
  static async verifyTOTP(
    userId: string,
    token: string,
    context: 'login' | 'signing' = 'login'
  ): Promise<TOTPVerificationResult> {
    try {
      // Get user's TOTP config
      const { data: config, error } = await supabaseAdmin
        .from('user_totp_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single()

      if (error || !config) {
        return { success: false, error: 'TOTP not configured or enabled' }
      }

      // Check context-specific requirements
      if (context === 'login' && !config.login_mfa_enabled) {
        return { success: false, error: 'Login MFA not enabled' }
      }
      if (context === 'signing' && !config.signing_mfa_enabled) {
        return { success: false, error: 'Signing MFA not enabled' }
      }

      // Check if it's a backup code
      if (config.backup_codes && config.backup_codes.includes(token)) {
        // Remove used backup code
        const updatedBackupCodes = config.backup_codes.filter((code: any) => code !== token)
        await supabaseAdmin
          .from('user_totp_configs')
          .update({
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        return { success: true, usedBackupCode: true }
      }

      // Verify TOTP token
      const isValid = authenticator.verify({
        token,
        secret: config.secret
      })

      if (isValid) {
        // Update last used timestamp
        await supabaseAdmin
          .from('user_totp_configs')
          .update({
            last_used_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        return { success: true }
      }

      return { success: false, error: 'Invalid verification code' }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      return { success: false, error: 'Verification failed' }
    }
  }

  /**
   * Get user's TOTP configuration
   */
  static async getTOTPConfig(userId: string): Promise<TOTPConfig | null> {
    try {
      const { data: config, error } = await supabaseAdmin
        .from('user_totp_configs')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error || !config) {
        return null
      }

      return config
    } catch (error) {
      console.error('Error getting TOTP config:', error)
      return null
    }
  }

  /**
   * Check if user has MFA enabled for specific context
   */
  static async isMFAEnabled(userId: string, context?: 'login' | 'signing'): Promise<boolean> {
    try {
      const config = await this.getTOTPConfig(userId)

      if (!config || !config.enabled) {
        return false
      }

      if (context === 'login') {
        return config.login_mfa_enabled
      }
      if (context === 'signing') {
        return config.signing_mfa_enabled
      }

      // If no context specified, return true if any MFA is enabled
      return config.login_mfa_enabled || config.signing_mfa_enabled
    } catch (error) {
      console.error('Error checking MFA status:', error)
      return false
    }
  }

  /**
   * Update MFA settings for user
   */
  static async updateMFASettings(
    userId: string,
    settings: {
      loginMFA?: boolean
      signingMFA?: boolean
      defaultRequireTOTP?: boolean
    }
  ): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (settings.loginMFA !== undefined) {
        updateData.login_mfa_enabled = settings.loginMFA
      }
      if (settings.signingMFA !== undefined) {
        updateData.signing_mfa_enabled = settings.signingMFA
      }
      if (settings.defaultRequireTOTP !== undefined) {
        updateData.default_require_totp = settings.defaultRequireTOTP
      }

      const { error } = await supabaseAdmin
        .from('user_totp_configs')
        .update(updateData)
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error updating MFA settings:', error)
      return false
    }
  }

  /**
   * Disable MFA for user
   */
  static async disableMFA(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('user_totp_configs')
        .update({
          enabled: false,
          login_mfa_enabled: false,
          signing_mfa_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      return !error
    } catch (error) {
      console.error('Error disabling MFA:', error)
      return false
    }
  }

  /**
   * Generate new backup codes
   */
  static async generateNewBackupCodes(userId: string): Promise<string[] | null> {
    try {
      const newBackupCodes = this.generateBackupCodes()

      const { error } = await supabaseAdmin
        .from('user_totp_configs')
        .update({
          backup_codes: newBackupCodes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        return null
      }

      return newBackupCodes
    } catch (error) {
      console.error('Error generating new backup codes:', error)
      return null
    }
  }

  /**
   * Check if signing request requires TOTP
   */
  static async isSigningRequestTOTPRequired(requestId: string): Promise<boolean> {
    try {
      const { data: request, error } = await supabaseAdmin
        .from('signing_requests')
        .select('require_totp')
        .eq('id', requestId)
        .single()

      return !error && request?.require_totp === true
    } catch (error) {
      console.error('Error checking signing request TOTP requirement:', error)
      return false
    }
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
      // First verify the TOTP token
      const verificationResult = await this.verifyTOTP(userId, token, 'signing')

      if (!verificationResult.success) {
        return verificationResult
      }

      // Update signer record with TOTP verification
      await supabaseAdmin
        .from('signing_request_signers')
        .update({
          totp_verified: true,
          totp_verified_at: new Date().toISOString(),
          totp_verification_ip: ipAddress || '127.0.0.1'
        })
        .eq('signing_request_id', requestId)
        .eq('user_id', userId)

      return verificationResult
    } catch (error) {
      console.error('Error verifying signing TOTP:', error)
      return { success: false, error: 'Signing verification failed' }
    }
  }

  /**
   * Generate backup codes
   */
  private static generateBackupCodes(): string[] {
    const codes: string[] = []
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(code)
    }
    return codes
  }
}

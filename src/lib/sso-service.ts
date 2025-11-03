import { createClient } from '@supabase/supabase-js'

import crypto from 'crypto'
import * as samlify from 'samlify'
import { createClient as createRedisClient } from 'redis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Redis client for replay protection
let redisClient: ReturnType<typeof createRedisClient> | null = null

async function getRedisClient() {
  if (!redisClient && process.env.UPSTASH_REDIS_REST_URL) {
    redisClient = createRedisClient({
      url: process.env.UPSTASH_REDIS_REST_URL,
      password: process.env.UPSTASH_REDIS_REST_TOKEN
    })
    await redisClient.connect()
  }
  return redisClient
}

export interface SSOProvider {
  id: string
  name: string
  type: 'saml' | 'oauth' | 'oidc'
  config: SSOConfig
  active: boolean
  organization_id?: string
  created_at: string
  updated_at: string
}

export interface SSOConfig {
  // OAuth/OIDC Config
  client_id?: string
  client_secret?: string
  authorization_url?: string
  token_url?: string
  userinfo_url?: string
  scope?: string[]

  // SAML Config
  sso_url?: string
  entity_id?: string
  certificate?: string
  private_key?: string

  // Common Config
  redirect_uri: string
  attribute_mapping: {
    email: string
    first_name?: string
    last_name?: string
    display_name?: string
    groups?: string
  }
}

export interface SSOSession {
  id: string
  provider_id: string
  user_id: string
  external_user_id: string
  session_data: any
  expires_at: string
  created_at: string
}

export class SSOService {
  /**
   * Create Zoho OAuth provider configuration
   */
  static async createZohoProvider(): Promise<SSOProvider | null> {
    const zohoConfig: SSOConfig = {
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      authorization_url: process.env.ZOHO_AUTH_URL || 'https://accounts.zoho.com/oauth/v2/auth',
      token_url: process.env.ZOHO_TOKEN_URL || 'https://accounts.zoho.com/oauth/v2/token',
      userinfo_url: process.env.ZOHO_USER_INFO_URL || 'https://accounts.zoho.com/oauth/user/info',
      redirect_uri: process.env.ZOHO_REDIRECT_URI!,
      scope: ['ZohoProfile.userinfo.read', 'ZohoProfile.userphoto.read'],
      attribute_mapping: {
        email: 'email_id',
        first_name: 'first_name',
        last_name: 'last_name',
        display_name: 'display_name'
      }
    }

    return this.createProvider('Zoho', 'oauth', zohoConfig)
  }

  /**
   * Create SSO provider configuration
   */
  static async createProvider(
    name: string,
    type: 'saml' | 'oauth' | 'oidc',
    config: SSOConfig,
    organizationId?: string
  ): Promise<SSOProvider | null> {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .insert([{
          name,
          type,
          config,
          organization_id: organizationId,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating SSO provider:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating SSO provider:', error)
      return null
    }
  }

  /**
   * Get SSO provider by ID
   */
  static async getProvider(providerId: string): Promise<SSOProvider | null> {
    try {
      const { data, error } = await supabase
        .from('sso_providers')
        .select('*')
        .eq('id', providerId)
        .eq('active', true)
        .single()

      if (error) {
        console.error('Error fetching SSO provider:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching SSO provider:', error)
      return null
    }
  }

  /**
   * Get SSO provider by slug
   */
  static async getProviderBySlug(
    slug: string,
    organizationId?: string | null
  ): Promise<SSOProvider | null> {
    try {
      let query = supabase
        .from('sso_providers')
        .select('*')
        .eq('name', slug)
        .eq('active', true)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.single()

      if (error) {
        console.error('Error fetching SSO provider by slug:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching SSO provider by slug:', error)
      return null
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static generateOAuthURL(provider: SSOProvider, state?: string): string {
    if (provider.type !== 'oauth' && provider.type !== 'oidc') {
      throw new Error('Provider is not OAuth/OIDC')
    }

    const config = provider.config
    const params = new URLSearchParams({
      client_id: config.client_id!,
      redirect_uri: config.redirect_uri,
      response_type: 'code',
      scope: config.scope?.join(' ') || 'openid email profile',
      state: state || crypto.randomBytes(16).toString('hex')
    })

    return `${config.authorization_url}?${params.toString()}`
  }

  /**
   * Handle OAuth callback
   */
  static async handleOAuthCallback(
    providerId: string,
    code: string,
    _state?: string
  ): Promise<{ user: any; session: SSOSession } | null> {
    try {
      const provider = await this.getProvider(providerId)
      if (!provider) {
        throw new Error('Provider not found')
      }

      // Exchange code for token
      const tokenResponse = await fetch(provider.config.token_url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: provider.config.client_id!,
          client_secret: provider.config.client_secret!,
          code,
          redirect_uri: provider.config.redirect_uri
        })
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token')
      }

      const tokenData = await tokenResponse.json()
      const accessToken = tokenData.access_token

      // Get user info
      const userResponse = await fetch(provider.config.userinfo_url!, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user info')
      }

      const userData = await userResponse.json()

      // Map user attributes
      const mappedUser = this.mapUserAttributes(userData, provider.config.attribute_mapping)

      // Create or update user
      const user = await this.createOrUpdateUser(mappedUser, provider.id, userData.sub || userData.id)

      if (!user) {
        throw new Error('Failed to create or update user')
      }

      // Create SSO session
      const session = await this.createSSOSession(
        provider.id,
        user.id,
        userData.sub || userData.id,
        {
          access_token: accessToken,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in
        }
      )

      return { user, session }
    } catch (error) {
      console.error('Error handling OAuth callback:', error)
      return null
    }
  }

  /**
   * Initialize SAML Service Provider
   */
  static initializeSAMLServiceProvider(): samlify.ServiceProviderInstance {
    const spConfig = {
      entityID: process.env.SAML_SP_ENTITY_ID || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/metadata`,
      assertionConsumerService: [
        {
          Binding: samlify.Constants.namespace.binding.post,
          Location: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/acs`
        }
      ],
      singleLogoutService: [
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/slo`
        }
      ],
      privateKey: process.env.SAML_SP_PRIVATE_KEY,
      privateKeyPass: process.env.SAML_SP_PRIVATE_KEY_PASS,
      isAssertionEncrypted: false,
      wantMessageSigned: true
    }

    return samlify.ServiceProvider(spConfig)
  }

  /**
   * Initialize SAML Identity Provider from config
   */
  static initializeSAMLIdentityProvider(provider: SSOProvider): samlify.IdentityProviderInstance {
    if (provider.type !== 'saml') {
      throw new Error('Provider is not SAML')
    }

    const idpConfig = {
      entityID: provider.config.entity_id!,
      singleSignOnService: [
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: provider.config.sso_url!
        }
      ],
      singleLogoutService: [
        {
          Binding: samlify.Constants.namespace.binding.redirect,
          Location: provider.config.sso_url!.replace('/sso', '/slo')
        }
      ],
      signingCert: provider.config.certificate,
      wantAuthnRequestsSigned: true
    }

    return samlify.IdentityProvider(idpConfig)
  }

  /**
   * Generate SAML authentication request
   */
  static async generateSAMLRequest(provider: SSOProvider): Promise<{ url: string; id: string }> {
    if (provider.type !== 'saml') {
      throw new Error('Provider is not SAML')
    }

    const sp = this.initializeSAMLServiceProvider()
    const idp = this.initializeSAMLIdentityProvider(provider)

    const { context } = sp.createLoginRequest(idp, 'redirect')

    // Store request ID for replay protection
    const requestId = context.id
    const redis = await getRedisClient()
    if (redis) {
      await redis.setEx(`saml:request:${requestId}`, 600, 'pending') // 10 min expiry
    }

    return {
      url: context,
      id: requestId
    }
  }

  /**
   * Handle SAML response with signature validation and replay protection
   */
  static async handleSAMLResponse(
    providerId: string,
    samlResponse: string,
    relayState?: string
  ): Promise<{
    success: boolean;
    user?: any;
    session?: SSOSession;
    error?: string;
    errorCode?: string;
  }> {
    try {
      const provider = await this.getProvider(providerId)
      if (!provider) {
        return { success: false, error: 'Provider not found', errorCode: 'SAML_CONFIG_MISSING' }
      }

      if (provider.type !== 'saml') {
        return { success: false, error: 'Provider is not SAML', errorCode: 'SAML_CONFIG_MISSING' }
      }

      const sp = this.initializeSAMLServiceProvider()
      const idp = this.initializeSAMLIdentityProvider(provider)

      // Parse and validate SAML response
      const { extract } = await sp.parseLoginResponse(idp, 'post', {
        body: { SAMLResponse: samlResponse }
      })

      // Validate signature
      if (!extract.signature || !extract.signature.verified) {
        await this.logSSOAudit(provider.id, null, 'saml_login_failed', {
          error: 'Invalid signature',
          errorCode: 'SAML_INVALID_SIGNATURE'
        })
        return { success: false, error: 'Invalid SAML signature', errorCode: 'SAML_INVALID_SIGNATURE' }
      }

      // Check assertion expiration
      const conditions = extract.conditions
      if (conditions) {
        const now = new Date()
        if (conditions.notBefore && new Date(conditions.notBefore) > now) {
          return { success: false, error: 'Assertion not yet valid', errorCode: 'SAML_ASSERTION_EXPIRED' }
        }
        if (conditions.notOnOrAfter && new Date(conditions.notOnOrAfter) <= now) {
          return { success: false, error: 'Assertion expired', errorCode: 'SAML_ASSERTION_EXPIRED' }
        }
      }

      // Validate audience
      const audience = extract.audience
      const expectedAudience = process.env.SAML_SP_ENTITY_ID || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/sso/saml/metadata`
      if (audience && audience !== expectedAudience) {
        return { success: false, error: 'Audience mismatch', errorCode: 'SAML_AUDIENCE_MISMATCH' }
      }

      // Replay protection - check if assertion ID has been used
      const assertionId = extract.assertionId || extract.response?.id
      if (assertionId) {
        const redis = await getRedisClient()
        if (redis) {
          const exists = await redis.get(`saml:assertion:${assertionId}`)
          if (exists) {
            await this.logSSOAudit(provider.id, null, 'saml_replay_detected', {
              assertionId,
              errorCode: 'SAML_REPLAY_DETECTED'
            })
            return { success: false, error: 'Assertion replay detected', errorCode: 'SAML_REPLAY_DETECTED' }
          }
          // Store assertion ID for 24 hours
          await redis.setEx(`saml:assertion:${assertionId}`, 86400, 'used')
        }
      }

      // Extract user attributes
      const attributes = extract.attributes || {}
      const userData = {
        email: attributes.email || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        firstName: attributes.firstName || attributes.givenName || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
        lastName: attributes.lastName || attributes.surname || attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
        nameId: extract.nameID
      }

      // Map user attributes
      const mappedUser = this.mapUserAttributes(userData, provider.config.attribute_mapping)

      // Create or update user
      const user = await this.createOrUpdateUser(mappedUser, provider.id, userData.nameId)

      if (!user) {
        return { success: false, error: 'Failed to create or update user', errorCode: 'USER_CREATE_FAILED' }
      }

      // Create SSO session
      const session = await this.createSSOSession(
        provider.id,
        user.id,
        userData.nameId,
        { saml_response: samlResponse, assertion_id: assertionId }
      )

      // Log successful authentication
      await this.logSSOAudit(provider.id, user.id, 'saml_login_success', {
        nameId: userData.nameId,
        email: userData.email
      })

      return { success: true, user, session }
    } catch (error: any) {
      console.error('Error handling SAML response:', error)
      await this.logSSOAudit(providerId, null, 'saml_login_error', {
        error: error.message,
        errorCode: 'SAML_PARSE_ERROR'
      })
      return { success: false, error: error.message || 'Failed to process SAML response', errorCode: 'SAML_PARSE_ERROR' }
    }
  }

  /**
   * Log SSO audit event
   */
  static async logSSOAudit(
    providerId: string,
    userId: string | null,
    event: string,
    metadata: any
  ): Promise<void> {
    try {
      await supabase.from('sso_audit_logs').insert({
        provider_id: providerId,
        user_id: userId,
        event,
        metadata,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log SSO audit:', error)
    }
  }

  /**
   * Map user attributes from SSO response
   */
  private static mapUserAttributes(userData: any, mapping: SSOConfig['attribute_mapping']): any {
    return {
      email: this.getNestedValue(userData, mapping.email),
      first_name: mapping.first_name ? this.getNestedValue(userData, mapping.first_name) : undefined,
      last_name: mapping.last_name ? this.getNestedValue(userData, mapping.last_name) : undefined,
      display_name: mapping.display_name ? this.getNestedValue(userData, mapping.display_name) : undefined,
      groups: mapping.groups ? this.getNestedValue(userData, mapping.groups) : undefined
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Create or update user from SSO
   */
  private static async createOrUpdateUser(
    userData: any,
    providerId: string,
    externalUserId: string
  ): Promise<any> {
    try {
      // Check if user exists with this email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        // Update existing user
        const { data: _data, error: _error } = await supabase
          .from('profiles')
          .update({
            first_name: userData.first_name || existingUser.first_name,
            last_name: userData.last_name || existingUser.last_name,
            display_name: userData.display_name || existingUser.display_name,
            sso_provider_id: providerId,
            external_user_id: externalUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single()

        return _data
      } else {
        // Create new user
        const { data, error } = await supabase.auth.admin.createUser({
          email: userData.email,
          email_confirm: true,
          user_metadata: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            display_name: userData.display_name,
            sso_provider_id: providerId,
            external_user_id: externalUserId
          }
        })

        if (error) {
          console.error('Error creating user:', error)
          return null
        }

        return data.user
      }
    } catch (error) {
      console.error('Error creating or updating user:', error)
      return null
    }
  }

  /**
   * Create SSO session
   */
  private static async createSSOSession(
    providerId: string,
    userId: string,
    externalUserId: string,
    sessionData: any
  ): Promise<SSOSession> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    const { data, error } = await supabase
      .from('sso_sessions')
      .insert([{
        provider_id: providerId,
        user_id: userId,
        external_user_id: externalUserId,
        session_data: sessionData,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      throw new Error('Failed to create SSO session')
    }

    return data
  }

  /**
   * Parse SAML response (simplified)
   */
  private static parseSAMLResponse(samlResponse: string): any {
    // This is a simplified parser - in production, use a proper SAML library
    // like node-saml or passport-saml

    // Extract basic information from SAML response
    const emailMatch = samlResponse.match(/<saml:Attribute Name="email"[\s\S]*?<saml:AttributeValue>(.*?)<\/saml:AttributeValue>/)
    const nameIdMatch = samlResponse.match(/<saml:NameID[\s\S]*?>(.*?)<\/saml:NameID>/)
    const firstNameMatch = samlResponse.match(/<saml:Attribute Name="firstName"[\s\S]*?<saml:AttributeValue>(.*?)<\/saml:AttributeValue>/)
    const lastNameMatch = samlResponse.match(/<saml:Attribute Name="lastName"[\s\S]*?<saml:AttributeValue>(.*?)<\/saml:AttributeValue>/)

    return {
      email: emailMatch?.[1],
      nameId: nameIdMatch?.[1],
      firstName: firstNameMatch?.[1],
      lastName: lastNameMatch?.[1]
    }
  }

  /**
   * Validate SSO session
   */
  static async validateSSOSession(sessionId: string): Promise<SSOSession | null> {
    try {
      const { data, error } = await supabase
        .from('sso_sessions')
        .select('*')
        .eq('id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error) {
        return null
      }

      return data
    } catch (error) {
      console.error('Error validating SSO session:', error)
      return null
    }
  }

  /**
   * Logout SSO session
   */
  static async logoutSSOSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sso_sessions')
        .delete()
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Error logging out SSO session:', error)
      return false
    }
  }
}

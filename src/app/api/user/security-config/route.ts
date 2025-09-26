import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

interface GeneralSecurityConfig {
  passwordLastChanged?: string
  loginNotifications: boolean
  suspiciousActivityAlerts: boolean
  sessionTimeout: number
  maxActiveSessions: number
  logoutOtherDevices: boolean
  ipWhitelisting: boolean
  allowedIPs: string[]
  geolocationRestrictions: boolean
  allowedCountries: string[]
  activityLogging: boolean
  dataRetentionPeriod: number
  shareUsageAnalytics: boolean
  accountLockoutEnabled: boolean
  maxFailedAttempts: number
  lockoutDuration: number
}

// GET - Fetch user's security configuration
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Fetch user's security configuration
    const { data: securityConfig, error } = await supabaseAdmin
      .from('user_security_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching security config:', error)
      return NextResponse.json({
        error: 'Failed to fetch security configuration',
        details: error.message
      }, { status: 500 })
    }

    // Default configuration if none exists
    const defaultConfig: GeneralSecurityConfig = {
      loginNotifications: true,
      suspiciousActivityAlerts: true,
      sessionTimeout: 480, // 8 hours
      maxActiveSessions: 5,
      logoutOtherDevices: false,
      ipWhitelisting: false,
      allowedIPs: [],
      geolocationRestrictions: false,
      allowedCountries: [],
      activityLogging: true,
      dataRetentionPeriod: 365,
      shareUsageAnalytics: false,
      accountLockoutEnabled: true,
      maxFailedAttempts: 5,
      lockoutDuration: 30
    }

    // Map database snake_case fields to frontend camelCase
    let config = defaultConfig
    if (securityConfig) {
      config = {
        passwordLastChanged: securityConfig.password_last_changed,
        loginNotifications: securityConfig.login_notifications ?? defaultConfig.loginNotifications,
        suspiciousActivityAlerts: securityConfig.suspicious_activity_alerts ?? defaultConfig.suspiciousActivityAlerts,
        sessionTimeout: securityConfig.session_timeout ?? defaultConfig.sessionTimeout,
        maxActiveSessions: securityConfig.max_active_sessions ?? defaultConfig.maxActiveSessions,
        logoutOtherDevices: securityConfig.logout_other_devices ?? defaultConfig.logoutOtherDevices,
        ipWhitelisting: securityConfig.ip_whitelisting ?? defaultConfig.ipWhitelisting,
        allowedIPs: securityConfig.allowed_ips ?? defaultConfig.allowedIPs,
        geolocationRestrictions: securityConfig.geolocation_restrictions ?? defaultConfig.geolocationRestrictions,
        allowedCountries: securityConfig.allowed_countries ?? defaultConfig.allowedCountries,
        activityLogging: securityConfig.activity_logging ?? defaultConfig.activityLogging,
        dataRetentionPeriod: securityConfig.data_retention_period ?? defaultConfig.dataRetentionPeriod,
        shareUsageAnalytics: securityConfig.share_usage_analytics ?? defaultConfig.shareUsageAnalytics,
        accountLockoutEnabled: securityConfig.account_lockout_enabled ?? defaultConfig.accountLockoutEnabled,
        maxFailedAttempts: securityConfig.max_failed_attempts ?? defaultConfig.maxFailedAttempts,
        lockoutDuration: securityConfig.lockout_duration ?? defaultConfig.lockoutDuration
      }
    }

    return NextResponse.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('Error in security config GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update user's security configuration
export async function PUT(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId
    const updates = await request.json()

    // Map camelCase frontend fields to snake_case database fields
    const fieldMapping: Record<string, string> = {
      'loginNotifications': 'login_notifications',
      'suspiciousActivityAlerts': 'suspicious_activity_alerts',
      'sessionTimeout': 'session_timeout',
      'maxActiveSessions': 'max_active_sessions',
      'logoutOtherDevices': 'logout_other_devices',
      'ipWhitelisting': 'ip_whitelisting',
      'allowedIPs': 'allowed_ips',
      'geolocationRestrictions': 'geolocation_restrictions',
      'allowedCountries': 'allowed_countries',
      'activityLogging': 'activity_logging',
      'dataRetentionPeriod': 'data_retention_period',
      'shareUsageAnalytics': 'share_usage_analytics',
      'accountLockoutEnabled': 'account_lockout_enabled',
      'maxFailedAttempts': 'max_failed_attempts',
      'lockoutDuration': 'lockout_duration'
    }

    const allowedFields = Object.keys(fieldMapping)

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        const dbField = fieldMapping[key]
        obj[dbField] = updates[key]
        return obj
      }, {} as any)

    if (Object.keys(filteredUpdates).length === 0) {
      console.log('No valid fields to update. Received:', Object.keys(updates))
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Add timestamp
    filteredUpdates.updated_at = new Date().toISOString()

    console.log('Updating security config for user:', userId, 'with fields:', Object.keys(filteredUpdates))

    // Upsert the security configuration
    const { data, error } = await supabaseAdmin
      .from('user_security_config')
      .upsert({
        user_id: userId,
        ...filteredUpdates
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating security config:', error)
      return NextResponse.json({
        error: 'Failed to update security configuration',
        details: error.message
      }, { status: 500 })
    }

    // Log the security change
    await supabaseAdmin
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action: 'security_config_updated',
        details: {
          updated_fields: Object.keys(filteredUpdates),
          timestamp: new Date().toISOString()
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Security configuration updated successfully'
    })

  } catch (error) {
    console.error('Error in security config PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

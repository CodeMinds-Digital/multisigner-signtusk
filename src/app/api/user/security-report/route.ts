import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// GET - Generate and download security report
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

    console.log('Generating security report for user:', userId)

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name, created_at')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }

    // Fetch security configuration
    const { data: securityConfig } = await supabaseAdmin
      .from('user_security_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Fetch recent activity logs (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activityLogs } = await supabaseAdmin
      .from('user_activity_logs')
      .select('action, created_at, ip_address, details')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    // Fetch active sessions
    const { data: activeSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('created_at, last_used_at, ip_address, user_agent')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Fetch TOTP status
    const { data: totpConfig } = await supabaseAdmin
      .from('user_totp_configs')
      .select('enabled, created_at')
      .eq('user_id', userId)
      .single()

    // Generate security report content
    const reportData = {
      generatedAt: new Date().toISOString(),
      user: {
        email: profile.email,
        name: profile.full_name,
        accountCreated: profile.created_at
      },
      securitySettings: {
        twoFactorEnabled: totpConfig?.enabled || false,
        twoFactorSetupDate: totpConfig?.created_at || null,
        loginNotifications: securityConfig?.login_notifications || true,
        suspiciousActivityAlerts: securityConfig?.suspicious_activity_alerts || true,
        sessionTimeout: securityConfig?.session_timeout || 480,
        accountLockoutEnabled: securityConfig?.account_lockout_enabled || true,
        activityLogging: securityConfig?.activity_logging || true,
        dataRetentionPeriod: securityConfig?.data_retention_period || 365
      },
      activeSessions: {
        count: activeSessions?.length || 0,
        sessions: activeSessions?.map(session => ({
          createdAt: session.created_at,
          lastAccessed: session.last_used_at,
          ipAddress: session.ip_address,
          device: parseUserAgent(session.user_agent)
        })) || []
      },
      recentActivity: {
        count: activityLogs?.length || 0,
        activities: activityLogs?.map(log => ({
          action: log.action,
          timestamp: log.created_at,
          ipAddress: log.ip_address,
          details: log.details
        })) || []
      },
      securityScore: calculateSecurityScore({
        twoFactorEnabled: totpConfig?.enabled || false,
        loginNotifications: securityConfig?.login_notifications || true,
        accountLockoutEnabled: securityConfig?.account_lockout_enabled || true,
        activeSessions: activeSessions?.length || 0
      })
    }

    // Create a simple text report (could be enhanced to PDF)
    const reportText = generateTextReport(reportData)

    // Return as downloadable text file
    return new NextResponse(reportText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="security-report-${new Date().toISOString().split('T')[0]}.txt"`
      }
    })

  } catch (error) {
    console.error('Error generating security report:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function parseUserAgent(userAgent: string): string {
  if (!userAgent) return 'Unknown Device'

  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    return 'Mobile Device'
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    return 'Tablet'
  } else {
    return 'Desktop'
  }
}

function calculateSecurityScore(factors: {
  twoFactorEnabled: boolean
  loginNotifications: boolean
  accountLockoutEnabled: boolean
  activeSessions: number
}): number {
  let score = 0

  if (factors.twoFactorEnabled) score += 40
  if (factors.loginNotifications) score += 20
  if (factors.accountLockoutEnabled) score += 20
  if (factors.activeSessions <= 3) score += 20 // Fewer sessions = better security

  return Math.min(score, 100)
}

function generateTextReport(data: any): string {
  return `
SIGNTUSK SECURITY REPORT
========================

Generated: ${new Date(data.generatedAt).toLocaleString()}

USER INFORMATION
----------------
Name: ${data.user.name || 'Not provided'}
Email: ${data.user.email}
Account Created: ${new Date(data.user.accountCreated).toLocaleDateString()}

SECURITY SETTINGS
-----------------
Two-Factor Authentication: ${data.securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
${data.securitySettings.twoFactorSetupDate ? `2FA Setup Date: ${new Date(data.securitySettings.twoFactorSetupDate).toLocaleDateString()}` : ''}
Login Notifications: ${data.securitySettings.loginNotifications ? 'Enabled' : 'Disabled'}
Suspicious Activity Alerts: ${data.securitySettings.suspiciousActivityAlerts ? 'Enabled' : 'Disabled'}
Session Timeout: ${Math.floor(data.securitySettings.sessionTimeout / 60)} hours
Account Lockout Protection: ${data.securitySettings.accountLockoutEnabled ? 'Enabled' : 'Disabled'}
Activity Logging: ${data.securitySettings.activityLogging ? 'Enabled' : 'Disabled'}
Data Retention Period: ${data.securitySettings.dataRetentionPeriod} days

ACTIVE SESSIONS
---------------
Total Active Sessions: ${data.activeSessions.count}

${data.activeSessions.sessions.map((session: any, index: number) => `
Session ${index + 1}:
  Created: ${new Date(session.createdAt).toLocaleString()}
  Last Accessed: ${new Date(session.lastAccessed).toLocaleString()}
  IP Address: ${session.ipAddress}
  Device: ${session.device}
`).join('')}

RECENT ACTIVITY (Last 30 Days)
-------------------------------
Total Activities: ${data.recentActivity.count}

${data.recentActivity.activities.slice(0, 20).map((activity: any) => `
${new Date(activity.timestamp).toLocaleString()} - ${activity.action}
  IP: ${activity.ipAddress}
`).join('')}

SECURITY SCORE
--------------
Overall Security Score: ${data.securityScore}/100

RECOMMENDATIONS
---------------
${data.securitySettings.twoFactorEnabled ? '✓' : '✗'} Enable Two-Factor Authentication
${data.securitySettings.loginNotifications ? '✓' : '✗'} Enable Login Notifications
${data.securitySettings.accountLockoutEnabled ? '✓' : '✗'} Enable Account Lockout Protection
${data.activeSessions.count <= 3 ? '✓' : '✗'} Limit Active Sessions (Current: ${data.activeSessions.count})

This report was generated automatically by SignTusk.
For questions about your account security, please contact support.
`
}

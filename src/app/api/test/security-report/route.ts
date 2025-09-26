import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// GET - Test security report generation
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({
        error: 'Authentication required',
        step: 'auth_check'
      }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    console.log('Testing security report for user:', userId)

    // Test 1: Check user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('email, full_name, created_at')
      .eq('id', userId)
      .single()

    if (profileError) {
      return NextResponse.json({
        error: 'Profile fetch failed',
        step: 'profile_fetch',
        details: profileError.message
      }, { status: 500 })
    }

    // Test 2: Check security config
    const { data: securityConfig, error: configError } = await supabaseAdmin
      .from('user_security_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Test 3: Check activity logs
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activityLogs, error: logsError } = await supabaseAdmin
      .from('user_activity_logs')
      .select('action, created_at, ip_address, details')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Test 4: Check active sessions
    const { data: activeSessions, error: sessionsError } = await supabaseAdmin
      .from('user_sessions')
      .select('created_at, last_used_at, ip_address, user_agent')
      .eq('user_id', userId)
      .eq('is_active', true)

    // Test 5: Check TOTP config
    const { data: totpConfig, error: totpError } = await supabaseAdmin
      .from('user_totp_configs')
      .select('enabled, created_at')
      .eq('user_id', userId)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        userId,
        tests: {
          profile: {
            success: !profileError,
            data: profile,
            error: profileError ? (profileError as any)?.message || String(profileError) : undefined
          },
          securityConfig: {
            success: !configError || (configError as any)?.code === 'PGRST116',
            data: securityConfig,
            error: configError ? (configError as any)?.message || String(configError) : undefined,
            note: (configError as any)?.code === 'PGRST116' ? 'No config found (will use defaults)' : null
          },
          activityLogs: {
            success: !logsError,
            count: activityLogs?.length || 0,
            data: activityLogs?.slice(0, 3), // Show first 3 for testing
            error: logsError ? (logsError as any)?.message || String(logsError) : undefined
          },
          activeSessions: {
            success: !sessionsError,
            count: activeSessions?.length || 0,
            data: activeSessions?.slice(0, 2), // Show first 2 for testing
            error: sessionsError ? (sessionsError as any)?.message || String(sessionsError) : undefined
          },
          totpConfig: {
            success: !totpError || (totpError as any)?.code === 'PGRST116',
            data: totpConfig,
            error: totpError ? (totpError as any)?.message || String(totpError) : undefined,
            note: (totpError as any)?.code === 'PGRST116' ? 'No TOTP config found (will use defaults)' : null
          }
        },
        summary: {
          allTestsPassed: !profileError &&
            (!configError || (configError as any)?.code === 'PGRST116') &&
            !logsError &&
            !sessionsError &&
            (!totpError || (totpError as any)?.code === 'PGRST116'),
          readyForReport: true
        }
      }
    })

  } catch (error) {
    console.error('Error in security report test:', error)
    return NextResponse.json({
      error: 'Internal server error',
      step: 'general_error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

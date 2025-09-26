import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// GET - Test security config functionality
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({
        error: 'Authentication required',
        details: 'No access token found in cookies'
      }, { status: 401 })
    }

    // Verify access token
    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch (err) {
      return NextResponse.json({
        error: 'Invalid token',
        details: err instanceof Error ? err.message : 'Token verification failed'
      }, { status: 401 })
    }

    const userId = payload.userId
    const userEmail = payload.email

    // Test database connection
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('user_security_config')
      .select('count')
      .limit(1)

    if (testError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: (testError as any)?.message || String(testError)
      }, { status: 500 })
    }

    // Check if user_security_config table exists and user has access
    const { data: userConfig, error: configError } = await supabaseAdmin
      .from('user_security_config')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Check if user_activity_logs table exists
    const { data: activityLogs, error: logsError } = await supabaseAdmin
      .from('user_activity_logs')
      .select('count')
      .eq('user_id', userId)
      .limit(1)

    return NextResponse.json({
      success: true,
      data: {
        userId,
        userEmail,
        authentication: 'working',
        database: 'connected',
        userConfig: {
          exists: !configError,
          data: userConfig,
          error: configError ? (configError as any)?.message || String(configError) : undefined
        },
        activityLogs: {
          accessible: !logsError,
          error: logsError ? (logsError as any)?.message || String(logsError) : undefined
        },
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in security config test:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

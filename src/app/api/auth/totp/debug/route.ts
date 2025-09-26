import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with special debug header
    const isDebugAllowed = process.env.NODE_ENV === 'development' ||
      request.headers.get('x-debug-totp') === process.env.DEBUG_SECRET

    if (!isDebugAllowed) {
      return NextResponse.json(
        { error: 'Debug endpoint not available' },
        { status: 403 }
      )
    }

    console.log('🔍 TOTP Debug endpoint called')

    // Check environment variables
    const envCheck = {
      JWT_SECRET: !!process.env.JWT_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      TOTP_ISSUER: process.env.TOTP_ISSUER || 'SignTusk',
      NODE_ENV: process.env.NODE_ENV
    }

    // Check dependencies
    let dependencyCheck = {
      speakeasy: false,
      qrcode: false,
      supabaseAdmin: false
    }

    try {
      const speakeasy = require('speakeasy')
      dependencyCheck.speakeasy = typeof speakeasy.generateSecret === 'function'
    } catch (e) {
      console.error('Speakeasy import error:', e)
    }

    try {
      const QRCode = require('qrcode')
      dependencyCheck.qrcode = typeof QRCode.toDataURL === 'function'
    } catch (e) {
      console.error('QRCode import error:', e)
    }

    try {
      dependencyCheck.supabaseAdmin = !!supabaseAdmin
    } catch (e) {
      console.error('Supabase admin error:', e)
    }

    // Check authentication if token provided
    let authCheck = {
      hasToken: false,
      tokenValid: false,
      userId: null as string | null,
      userEmail: null as string | null
    }

    try {
      const { accessToken } = getAuthTokensFromRequest(request)
      authCheck.hasToken = !!accessToken

      if (accessToken) {
        const payload = await verifyAccessToken(accessToken)
        authCheck.tokenValid = true
        authCheck.userId = payload.userId
        authCheck.userEmail = payload.email
      }
    } catch (e) {
      console.error('Auth check error:', e)
    }

    // Check database connection
    let dbCheck = {
      connected: false,
      tableExists: false,
      error: null as string | null
    }

    try {
      // Test basic connection
      const { data, error } = await supabaseAdmin
        .from('user_totp_configs')
        .select('count')
        .limit(1)

      if (error) {
        dbCheck.error = error.message
      } else {
        dbCheck.connected = true
        dbCheck.tableExists = true
      }
    } catch (e) {
      dbCheck.error = e instanceof Error ? e.message : 'Unknown database error'
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checks: {
        environment: envCheck,
        dependencies: dependencyCheck,
        authentication: authCheck,
        database: dbCheck
      }
    })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-debug-totp',
    },
  })
}

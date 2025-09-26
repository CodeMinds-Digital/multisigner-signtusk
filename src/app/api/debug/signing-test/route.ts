import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting signing API diagnostic test...')

    // Environment check
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      timestamp: new Date().toISOString()
    }

    console.log('🔧 Environment check:', envCheck)

    // Get request body
    const { requestId, testMode } = await request.json()

    if (!requestId) {
      return new Response(
        JSON.stringify({
          error: 'Request ID is required',
          envCheck
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Authentication test
    console.log('🔐 Testing authentication...')
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: 'No access token found',
          envCheck,
          authTest: 'failed - no token'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
      console.log('✅ Token verified for user:', payload.email)
    } catch (authError) {
      return new Response(
        JSON.stringify({
          error: 'Token verification failed',
          envCheck,
          authTest: 'failed - invalid token',
          authError: authError instanceof Error ? authError.message : 'Unknown auth error'
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Database connection test
    console.log('🗄️ Testing database connection...')
    let dbTest = 'unknown'
    try {
      const { data: _testQuery, error: testError } = await supabaseAdmin
        .from('signing_requests')
        .select('id')
        .limit(1)

      if (testError) {
        dbTest = `failed - ${testError.message}`
      } else {
        dbTest = 'success'
      }
    } catch (dbError) {
      dbTest = `exception - ${dbError instanceof Error ? dbError.message : 'Unknown db error'}`
    }

    // Signing request lookup test
    console.log('🔍 Testing signing request lookup...')
    let requestTest = 'unknown'
    let signerTest = 'unknown'

    try {
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError) {
        requestTest = `failed - ${requestError.message}`
      } else if (signingRequest) {
        requestTest = 'success'

        // Test signer lookup
        const { data: signer, error: signerError } = await supabaseAdmin
          .from('signing_request_signers')
          .select('*')
          .eq('signing_request_id', requestId)
          .eq('signer_email', payload.email)
          .single()

        if (signerError) {
          signerTest = `failed - ${signerError.message}`
        } else if (signer) {
          signerTest = 'success'
        } else {
          signerTest = 'not found'
        }
      } else {
        requestTest = 'not found'
      }
    } catch (lookupError) {
      requestTest = `exception - ${lookupError instanceof Error ? lookupError.message : 'Unknown lookup error'}`
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      requestId,
      userEmail: payload.email,
      envCheck,
      authTest: 'success',
      dbTest,
      requestTest,
      signerTest,
      testMode: testMode || false
    }

    console.log('📊 Diagnostic results:', diagnostics)

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Diagnostic test error:', error)

    return new Response(
      JSON.stringify({
        error: 'Diagnostic test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

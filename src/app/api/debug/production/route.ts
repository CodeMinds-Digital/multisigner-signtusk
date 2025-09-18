import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with specific debug header
    const debugHeader = request.headers.get('x-debug-key')
    const isDev = process.env.NODE_ENV === 'development'
    const isDebugAllowed = debugHeader === 'signtusk-debug-2024' || isDev

    if (!isDebugAllowed) {
      return new Response(
        JSON.stringify({ error: 'Debug endpoint not available' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyPrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...',
        hasJwtSecret: !!process.env.JWT_SECRET,
        jwtSecretLength: process.env.JWT_SECRET?.length || 0,
        hasResendKey: !!process.env.RESEND_API_KEY,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      },
      database: {
        connectionTest: 'pending'
      },
      auth: {
        jwtTest: 'pending'
      }
    }

    // Test database connection
    try {
      const { error } = await supabaseAdmin
        .from('signing_requests')
        .select('id')
        .limit(1)

      if (error) {
        diagnostics.database.connectionTest = `failed: ${error.message}`
      } else {
        diagnostics.database.connectionTest = 'success'
      }
    } catch (dbError) {
      diagnostics.database.connectionTest = `error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
    }

    // Test JWT configuration
    try {
      const { SignJWT } = await import('jose')
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'test')

      const testToken = await new SignJWT({ test: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1m')
        .sign(secret)

      diagnostics.auth.jwtTest = testToken ? 'success' : 'failed'
    } catch (jwtError) {
      diagnostics.auth.jwtTest = `error: ${jwtError instanceof Error ? jwtError.message : 'Unknown error'}`
    }

    return new Response(
      JSON.stringify(diagnostics, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return new Response(
      JSON.stringify({
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
        database: 'checking...',
        environment: 'checking...'
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET'
    ]

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
    
    if (missingEnvVars.length > 0) {
      health.checks.environment = `missing: ${missingEnvVars.join(', ')}`
      health.status = 'unhealthy'
    } else {
      health.checks.environment = 'ok'
    }

    // Quick database connectivity check
    try {
      const { error } = await supabaseAdmin
        .from('signing_requests')
        .select('id')
        .limit(1)

      if (error) {
        health.checks.database = `error: ${error.message}`
        health.status = 'unhealthy'
      } else {
        health.checks.database = 'ok'
      }
    } catch (dbError) {
      health.checks.database = `failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
      health.status = 'unhealthy'
    }

    const statusCode = health.status === 'healthy' ? 200 : 503

    return new Response(
      JSON.stringify(health),
      { 
        status: statusCode, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

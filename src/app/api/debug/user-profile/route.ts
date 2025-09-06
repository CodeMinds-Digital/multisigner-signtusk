import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'No access token found' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    console.log('🔍 Token payload:', payload)

    // Fetch user profile from database using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', payload.userId)
      .single()

    console.log('🔍 Profile query result:', { profile, error: profileError })

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: 'Profile query failed',
          details: profileError,
          userId: payload.userId
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!profile) {
      return new Response(
        JSON.stringify({
          error: 'Profile not found',
          userId: payload.userId
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        tokenPayload: payload,
        profile: profile
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return new Response(
      JSON.stringify({
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

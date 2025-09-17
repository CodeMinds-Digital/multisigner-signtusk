import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest, createAuthResponse } from '@/lib/auth-cookies'
import { verifyRefreshToken, generateTokenPair } from '@/lib/jwt-utils'
import { validateRefreshToken, rotateRefreshToken, getSession } from '@/lib/session-store'
import { AUTH_ERRORS } from '@/lib/auth-config'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from HttpOnly cookie
    const { refreshToken } = getAuthTokensFromRequest(request)

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: AUTH_ERRORS.MISSING_TOKEN }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify refresh token
    let payload
    try {
      payload = await verifyRefreshToken(refreshToken)
    } catch {
      return new Response(
        JSON.stringify({ error: AUTH_ERRORS.INVALID_TOKEN }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate refresh token against stored session (v2)
    const isValidSession = await validateRefreshToken(payload.sessionId, refreshToken)
    if (!isValidSession) {
      return new Response(
        JSON.stringify({ error: AUTH_ERRORS.INVALID_TOKEN }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get session data
    const session = await getSession(payload.sessionId)
    if (!session) {
      return new Response(
        JSON.stringify({ error: AUTH_ERRORS.SESSION_EXPIRED }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate new token pair (refresh token rotation)
    const newTokens = await generateTokenPair(
      payload.userId,
      payload.email,
      payload.sessionId,
      payload.role
    )

    // Fetch fresh user profile from database using admin client
    const profileResult = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', payload.userId)
      .single()

    let profile = profileResult.data
    const profileError = profileResult.error

    // If profile doesn't exist, create a basic one
    if (profileError && profileError.code === 'PGRST116') {
      console.log('🔧 Creating missing user profile during refresh for:', payload.email)

      const emailName = payload.email.split('@')[0]
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: payload.userId,
          email: payload.email,
          full_name: emailName,
          first_name: emailName,
          last_name: 'User',
          account_type: 'personal',
          email_verified: true,
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          documents_count: 0,
          storage_used_mb: 0,
          monthly_documents_used: 0,
          monthly_limit: 10,
          is_admin: payload.email === 'admin@signtusk.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Profile creation error during refresh:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      profile = newProfile
    } else if (profileError) {
      console.error('Profile fetch error during refresh:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Rotate refresh token in session store
    await rotateRefreshToken(payload.sessionId, newTokens.refreshToken)

    // Return new tokens in secure cookies with fresh profile data
    return createAuthResponse(
      {
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          role: profile.is_admin ? 'admin' : 'user',
          full_name: profile.full_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          company_name: profile.company_name,
          company_domain: profile.company_domain,
          industry_field: profile.industry_field,
          employee_count: profile.employee_count,
          job_title: profile.job_title,
          department: profile.department,
          phone_number: profile.phone_number,
          account_type: profile.account_type,
          email_verified: profile.email_verified,
          company_verified: profile.company_verified,
          onboarding_completed: profile.onboarding_completed,
          avatar_url: profile.avatar_url,
          plan: profile.plan,
          subscription_status: profile.subscription_status,
          subscription_expires_at: profile.subscription_expires_at,
          documents_count: profile.documents_count,
          storage_used_mb: profile.storage_used_mb,
          monthly_documents_used: profile.monthly_documents_used,
          monthly_limit: profile.monthly_limit,
          is_admin: profile.is_admin,
          last_login_at: profile.last_login_at,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
        },
        expiresAt: newTokens.expiresAt,
      },
      newTokens
    )
  } catch (error) {
    console.error('Token refresh error:', error)
    return new Response(
      JSON.stringify({ error: AUTH_ERRORS.REFRESH_FAILED }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Handle GET requests (for middleware redirects)
export async function GET(request: NextRequest) {
  return POST(request)
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

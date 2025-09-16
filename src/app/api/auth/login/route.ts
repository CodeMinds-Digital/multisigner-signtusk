import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateTokenPair, generateSessionId } from '@/lib/jwt-utils'
import { storeSession } from '@/lib/session-store'
import { createAuthResponse } from '@/lib/auth-cookies'

export async function POST(request: NextRequest) {
  console.log('🚀 Login endpoint called - v2')
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const user = data.user
    const sessionId = generateSessionId()

    // Fetch full user profile from user_profiles table using admin client
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // If profile doesn't exist, create it
    if (profileError && profileError.code === 'PGRST116') {
      console.log('🔧 Creating new user profile for:', user.email)

      // Extract name from email or use defaults
      const emailName = user.email!.split('@')[0]
      const firstName = user.user_metadata?.first_name || emailName
      const lastName = user.user_metadata?.last_name || 'User'
      const fullName = user.user_metadata?.full_name || `${firstName} ${lastName}`

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          account_type: 'personal',
          email_verified: user.email_confirmed_at ? true : false,
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          documents_count: 0,
          storage_used_mb: 0,
          monthly_documents_used: 0,
          monthly_limit: 10, // Free plan limit
          is_admin: user.email === 'admin@signtusk.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Profile creation error:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user profile' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      profile = newProfile
      console.log('✅ Created new user profile:', profile.id)
    } else if (profileError) {
      console.error('Profile fetch error:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update last login timestamp
    await supabaseAdmin
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)

    // Generate our own JWT tokens (short-lived access + long-lived refresh)
    console.log('🔑 Generating JWT tokens for user:', user.id)
    const tokens = await generateTokenPair(
      user.id,
      user.email!,
      sessionId,
      profile.is_admin ? 'admin' : 'user'
    )
    console.log('✅ JWT tokens generated successfully')

    // Store session with refresh token for rotation
    console.log('🔐 About to store session:', sessionId)
    await storeSession(
      sessionId,
      user.id,
      user.email!,
      tokens.refreshToken,
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || undefined
    )
    console.log('✅ Session stored successfully')

    // Sign out from Supabase (we manage our own sessions now)
    await supabase.auth.signOut()

    // Return response with secure HttpOnly cookies and full profile
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
        expiresAt: tokens.expiresAt,
      },
      tokens
    )
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
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

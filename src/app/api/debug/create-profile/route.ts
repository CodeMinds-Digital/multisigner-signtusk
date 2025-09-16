import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
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
    console.log('🔍 Creating profile for user:', payload)

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', payload.userId)
      .single()

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Profile already exists',
          profile: existingProfile
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create the profile
    const emailName = payload.email.split('@')[0]
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: payload.userId,
        email: payload.email,
        full_name: `${emailName} User`,
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
      console.error('Profile creation error:', createError)
      return new Response(
        JSON.stringify({
          error: 'Failed to create profile',
          details: createError
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Profile created successfully:', newProfile)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile created successfully',
        profile: newProfile
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Create profile endpoint error:', error)
    return new Response(
      JSON.stringify({
        error: 'Create profile endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

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
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userEmail = payload.email
    const userId = payload.userId

    console.log('👤 Fetching profile for user:', userEmail)

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get user signatures from signatures table
    const { data: signatures, error: signaturesError } = await supabaseAdmin
      .from('signatures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (signaturesError) {
      console.error('❌ Error fetching user signatures:', signaturesError)
    }

    // Convert signatures to the format expected by the frontend
    const signatureData = signatures ? signatures.map(sig => sig.signature_data) : []

    // Check if profile has required signing data
    const hasRequiredData = {
      full_name: !!profile.full_name,
      signatures: signatureData.length > 0,
      location: !!profile.location
    }

    console.log('👤 Profile validation data:', {
      full_name: !!profile.full_name,
      signatures_count: signatureData.length,
      has_signatures: signatureData.length > 0,
      location: !!profile.location
    })

    return new Response(
      JSON.stringify({
        ...profile,
        signatures: signatureData, // Include actual signatures data
        hasRequiredData,
        isComplete: hasRequiredData.full_name && hasRequiredData.signatures
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error fetching user profile:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userEmail = payload.email

    // Get request body
    const updateData = await request.json()

    console.log('👤 Updating profile for user:', userEmail, 'with data:', updateData)

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating user profile:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Profile updated successfully')

    return new Response(
      JSON.stringify(updatedProfile),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error updating user profile:', error)

    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

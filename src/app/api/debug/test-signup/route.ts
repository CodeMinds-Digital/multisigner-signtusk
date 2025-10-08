import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    console.log('Testing signup for:', email)

    // Create user using admin API (bypasses some client-side restrictions)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Don't require email confirmation for testing
      user_metadata: {
        account_type: 'individual',
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: authError.message,
        details: authError 
      }, { status: 400 })
    }

    console.log('User created in auth:', authData.user?.id)

    // Check if profile was created by trigger
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user?.id)
      .single()

    if (profileError) {
      console.error('Profile check error:', profileError)
      return NextResponse.json({
        success: true,
        authUser: authData.user,
        profileCreated: false,
        profileError: profileError.message,
        message: 'User created in auth but profile creation failed'
      })
    }

    console.log('Profile created successfully:', profile.id)

    return NextResponse.json({
      success: true,
      authUser: authData.user,
      profile,
      profileCreated: true,
      message: 'User and profile created successfully'
    })

  } catch (error) {
    console.error('Test signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint is only for development purposes
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Create Supabase admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const testEmail = 'test@example.com'
    const testPassword = 'password123'

    // First, try to create the auth user
    const { error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (authError && !authError.message.includes('already registered')) {
      console.error('Auth creation error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', testEmail)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        message: 'Test user already exists',
        email: testEmail,
        password: testPassword
      })
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        email: testEmail,
        first_name: 'Test',
        last_name: 'User',
        account_type: 'Personal',
        email_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Test user created successfully',
      email: testEmail,
      password: testPassword,
      profile: profileData
    })

  } catch (error) {
    console.error('Error creating test user:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

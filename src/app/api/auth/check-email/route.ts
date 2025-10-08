import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Simple approach: just check if user profile exists
    // This covers 99% of cases and avoids auth.users access issues
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, email_verified')
      .eq('email', email)
      .single()

    const hasProfile = !profileError && profile

    // For now, assume if profile exists, user exists
    // This prevents most duplicate signups
    return NextResponse.json({
      exists: hasProfile,
      hasProfile,
      isOrphaned: false, // We'll handle orphaned users separately
      emailConfirmed: hasProfile ? profile.email_verified : false
    })

  } catch (error) {
    console.error('Check email error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'list' or 'fix'
    const email = searchParams.get('email') // specific email to check

    if (action === 'list') {
      // Find users in auth.users but not in user_profiles
      const { data: orphanedUsers, error: orphanedError } = await supabaseAdmin
        .rpc('find_orphaned_users')

      if (orphanedError) {
        console.error('Error finding orphaned users:', orphanedError)
        return NextResponse.json({ error: 'Failed to find orphaned users' }, { status: 500 })
      }

      return NextResponse.json({
        orphanedUsers: orphanedUsers || [],
        count: orphanedUsers?.length || 0
      })
    }

    if (action === 'fix' && email) {
      // Try to create missing user profile for specific email
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      if (authError) {
        return NextResponse.json({ error: 'Failed to fetch users from auth' }, { status: 500 })
      }

      const authUser = authUsers.users.find(user => user.email?.toLowerCase() === email.toLowerCase())

      if (!authUser) {
        return NextResponse.json({ error: 'User not found in auth' }, { status: 404 })
      }

      // Check if profile already exists
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('id', authUser.id)
        .single()

      if (existingProfile) {
        return NextResponse.json({ message: 'User profile already exists' })
      }

      // Create the missing profile
      const userMetadata = authUser.user_metadata || {}
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: authUser.id,
          email: authUser.email,
          full_name: userMetadata.full_name || userMetadata.first_name || authUser.email?.split('@')[0] || 'User',
          first_name: userMetadata.first_name || '',
          last_name: userMetadata.last_name || '',
          account_type: userMetadata.account_type || 'personal',
          email_verified: authUser.email_confirmed_at ? true : false,
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          documents_count: 0,
          storage_used_mb: 0,
          monthly_documents_used: 0,
          monthly_limit: 10,
          is_admin: authUser.email === 'admin@signtusk.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
      }

      return NextResponse.json({
        message: 'User profile created successfully',
        profile: newProfile
      })
    }

    if (action === 'check' && email) {
      // Check specific email status
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      if (authError) {
        return NextResponse.json({ error: 'Failed to fetch users from auth' }, { status: 500 })
      }

      const authUser = authUsers.users.find(user => user.email?.toLowerCase() === email.toLowerCase())
      const authExists = !!authUser

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single()

      const profileExists = !profileError && profile

      return NextResponse.json({
        email,
        authExists,
        profileExists,
        authUser: authExists ? {
          id: authUser?.id,
          email: authUser?.email,
          emailConfirmed: authUser?.email_confirmed_at,
          createdAt: authUser?.created_at,
          metadata: authUser?.user_metadata
        } : null,
        profile: profileExists ? profile : null,
        isOrphaned: authExists && !profileExists
      })
    }

    return NextResponse.json({
      message: 'Orphaned Users Debug Tool',
      usage: {
        list: '?action=list - List all orphaned users',
        check: '?action=check&email=user@example.com - Check specific email',
        fix: '?action=fix&email=user@example.com - Fix specific orphaned user'
      }
    })

  } catch (error) {
    console.error('Debug orphaned users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

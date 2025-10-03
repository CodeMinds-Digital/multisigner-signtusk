import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Accept Invitation
 * Creates user account and assigns to corporate account with invited role
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, firstName, lastName, password } = body

    // Validate input
    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('corporate_invitations')
      .select(`
        *,
        corporate_account:corporate_accounts(
          id,
          company_name,
          email_domain
        )
      `)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation is already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Check if invitation is expired
    if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitation is revoked
    if (invitation.status === 'revoked') {
      return NextResponse.json(
        { error: 'This invitation has been revoked' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('email', invitation.email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth (requires email verification)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        account_type: 'corporate',
        company_name: invitation.corporate_account.company_name
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 500 }
      )
    }

    // Create user profile with corporate details
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: invitation.email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        account_type: 'corporate',
        corporate_account_id: invitation.corporate_account.id,
        corporate_role: invitation.role, // Use role from invitation
        account_status: 'active', // Active immediately for invited users
        email_verified: false, // Will be verified via email
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)

      // Rollback: Delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Update invitation status to accepted
    const { error: updateError } = await supabaseAdmin
      .from('corporate_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Error updating invitation status:', updateError)
      // Don't fail the request, just log the error
    }

    // Send email verification using magic link
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: invitation.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail the request, user can resend verification email
    }

    // Log audit event
    await supabaseAdmin.rpc('log_corporate_audit', {
      corp_account_id: invitation.corporate_account.id,
      admin_user_id: invitation.invited_by,
      action_type: 'invitation_accepted',
      target_user: authData.user.id,
      action_details: {
        email: invitation.email,
        role: invitation.role,
        invitation_id: invitation.id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: authData.user.id,
        email: invitation.email,
        role: invitation.role
      }
    })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


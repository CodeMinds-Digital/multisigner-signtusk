import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { randomBytes } from 'crypto'

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
 * Generate Invitation Token
 * Creates a secure random token for invitation links
 */
function generateInvitationToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Get All Invitations
 * Returns list of invitations for the enterprise account
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = payload.userId

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('corporate_account_id, corporate_role, account_type')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is enterprise admin/owner
    if (userProfile.account_type !== 'enterprise' || !['owner', 'admin'].includes(userProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all invitations for this enterprise account
    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('corporate_invitations')
      .select('*')
      .eq('corporate_account_id', userProfile.corporate_account_id)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Manually fetch invited_by user profiles
    const invitationsWithProfiles = await Promise.all(
      (invitations || []).map(async (invitation) => {
        const { data: invitedByProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('email, first_name, last_name')
          .eq('id', invitation.invited_by)
          .single()

        return {
          ...invitation,
          invited_by_profile: invitedByProfile
        }
      })
    )

    return NextResponse.json({ invitations: invitationsWithProfiles })

  } catch (error) {
    console.error('Error in GET /api/corporate/invitations (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Create Invitation
 * Generates invitation token and sends email
 */
export async function POST(request: NextRequest) {
  try {
    // Get user from JWT token
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const userId = payload.userId
    const body = await request.json()
    const { email, role } = body

    // Validate input
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "member"' },
        { status: 400 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('corporate_account_id, corporate_role, account_type')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is enterprise admin/owner
    if (userProfile.account_type !== 'enterprise' || !['owner', 'admin'].includes(userProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can send invitations.' },
        { status: 403 }
      )
    }

    // Get enterprise account details
    const { data: corporateAccount, error: accountError } = await supabaseAdmin
      .from('corporate_accounts')
      .select('*')
      .eq('id', userProfile.corporate_account_id)
      .single()

    if (accountError || !corporateAccount) {
      return NextResponse.json(
        { error: 'Enterprise account not found' },
        { status: 404 }
      )
    }

    // Extract domain from email
    const emailDomain = email.split('@')[1].toLowerCase()

    // Check if email domain matches enterprise domain
    if (emailDomain !== corporateAccount.email_domain) {
      return NextResponse.json(
        { error: `Email must be from your enterprise domain: @${corporateAccount.email_domain}` },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, corporate_account_id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      if (existingUser.corporate_account_id === userProfile.corporate_account_id) {
        return NextResponse.json(
          { error: 'User is already a member of your enterprise account' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { error: 'User already has an account with this email' },
          { status: 400 }
        )
      }
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabaseAdmin
      .from('corporate_invitations')
      .select('id, status, expires_at')
      .eq('corporate_account_id', userProfile.corporate_account_id)
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      // Check if invitation is still valid
      if (new Date(existingInvitation.expires_at) > new Date()) {
        return NextResponse.json(
          { error: 'An active invitation already exists for this email' },
          { status: 400 }
        )
      }
    }

    // Generate invitation token
    const token = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days

    // Create invitation record
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('corporate_invitations')
      .insert({
        corporate_account_id: userProfile.corporate_account_id,
        email: email.toLowerCase(),
        role,
        invited_by: userId,
        token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Error creating invitation:', invitationError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    // Send invitation email via Supabase
    // Note: We'll use a custom email template in the next step
    // For now, we'll prepare the email content
    const emailSubject = `You're invited to join ${corporateAccount.company_name} on SignTusk`
    const emailBody = `
      <h2>You've been invited to join ${corporateAccount.company_name}</h2>
      <p>You've been invited to join ${corporateAccount.company_name} on SignTusk as a ${role}.</p>
      <p>Click the link below to accept your invitation and create your account:</p>
      <p><a href="${invitationLink}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${invitationLink}</p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    `

    // Log audit event
    await supabaseAdmin.rpc('log_corporate_audit', {
      corp_account_id: userProfile.corporate_account_id,
      admin_user_id: userId,
      action_type: 'user_invited',
      target_user: null,
      action_details: {
        email,
        role,
        invitation_id: invitation.id
      }
    })

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        token: invitation.token,
        invitationLink,
        expiresAt: invitation.expires_at
      },
      emailContent: {
        subject: emailSubject,
        body: emailBody
      }
    })

  } catch (error) {
    console.error('Error in POST /api/corporate/invitations (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


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
 * Validate Invitation Token
 * Checks if invitation token is valid and not expired
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Get invitation by token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('corporate_invitations')
      .select(`
        *,
        corporate_account:corporate_accounts(
          company_name,
          email_domain
        ),
        invited_by_profile:user_profiles!corporate_invitations_invited_by_fkey(
          email,
          first_name,
          last_name
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
      // Update status to expired if not already
      if (invitation.status !== 'expired') {
        await supabaseAdmin
          .from('corporate_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id)
      }

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

    // Return invitation details
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        companyName: invitation.corporate_account.company_name,
        invitedBy: `${invitation.invited_by_profile.first_name} ${invitation.invited_by_profile.last_name}`,
        expiresAt: invitation.expires_at,
        status: invitation.status
      }
    })

  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


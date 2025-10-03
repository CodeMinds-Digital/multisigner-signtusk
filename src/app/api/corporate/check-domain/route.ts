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
 * Check if a corporate account exists for a given email domain
 * Returns account info and access mode
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Extract domain from email
    const emailDomain = email.toLowerCase().split('@')[1]
    if (!emailDomain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if corporate account exists
    const { data: corporateAccount, error } = await supabaseAdmin
      .from('corporate_accounts')
      .select('id, company_name, email_domain, access_mode')
      .eq('email_domain', emailDomain)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking domain:', error)
      return NextResponse.json(
        { error: 'Failed to check domain' },
        { status: 500 }
      )
    }

    if (!corporateAccount) {
      // No corporate account exists - user will be first
      return NextResponse.json({
        exists: false,
        isFirstUser: true,
        message: 'You will be the first user and owner of this corporate account'
      })
    }

    // Corporate account exists
    const messages = {
      open: `This domain is part of ${corporateAccount.company_name}. You will be automatically added as a member.`,
      approval: `This domain is part of ${corporateAccount.company_name}. Your access request will require admin approval.`,
      invite_only: `This domain is part of ${corporateAccount.company_name}. This account is invite-only. Please contact your administrator for an invitation.`
    }

    return NextResponse.json({
      exists: true,
      isFirstUser: false,
      companyName: corporateAccount.company_name,
      accessMode: corporateAccount.access_mode,
      message: messages[corporateAccount.access_mode as keyof typeof messages] || 'Corporate account exists',
      canSignup: corporateAccount.access_mode !== 'invite_only'
    })

  } catch (error) {
    console.error('Check domain error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


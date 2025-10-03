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
 * Enterprise Signup Handler
 * Handles both first-time enterprise account creation and subsequent signups
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      fullName,
      companyName,
      firstName,
      lastName,
      industryField,
      employeeCount,
      jobTitle,
      department,
      phoneNumber
    } = body

    // Validate required fields
    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: 'Email, password, and company name are required' },
        { status: 400 }
      )
    }

    // Extract email domain
    const emailDomain = email.toLowerCase().split('@')[1]
    if (!emailDomain) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if enterprise account already exists for this domain
    const { data: existingAccount, error: accountCheckError } = await supabaseAdmin
      .from('corporate_accounts')
      .select('*')
      .eq('email_domain', emailDomain)
      .single()

    if (accountCheckError && accountCheckError.code !== 'PGRST116') {
      console.error('Error checking enterprise account:', accountCheckError)
      return NextResponse.json(
        { error: 'Failed to check enterprise account' },
        { status: 500 }
      )
    }

    // Create user in Supabase Auth (requires email verification)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification for security
      user_metadata: {
        full_name: fullName || `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
        account_type: 'enterprise',
        company_name: companyName
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Send email verification using magic link
    const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail signup, but log the error
    }

    // CASE 1: First user from this domain - Create enterprise account
    if (!existingAccount) {
      // Create enterprise account
      const { data: newCorporateAccount, error: createAccountError } = await supabaseAdmin
        .from('corporate_accounts')
        .insert({
          company_name: companyName,
          email_domain: emailDomain,
          access_mode: 'invite_only', // Default to most restrictive
          owner_id: userId
        })
        .select()
        .single()

      if (createAccountError || !newCorporateAccount) {
        console.error('Error creating enterprise account:', createAccountError)
        // Rollback: Delete the created user
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: 'Failed to create enterprise account' },
          { status: 500 }
        )
      }

      // Create user profile with owner role
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          account_type: 'enterprise',
          corporate_account_id: newCorporateAccount.id,
          corporate_role: 'owner',
          account_status: 'active',
          email_verified: false, // Will be set to true after email verification
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          industry_field: industryField || null,
          employee_count: employeeCount || null,
          job_title: jobTitle || null,
          department: department || null,
          phone_number: phoneNumber || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        // Rollback
        await supabaseAdmin.from('corporate_accounts').delete().eq('id', newCorporateAccount.id)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Log audit event
      await supabaseAdmin.rpc('log_corporate_audit', {
        corp_account_id: newCorporateAccount.id,
        admin_user_id: userId,
        action_type: 'corporate_account_created',
        target_user: userId,
        action_details: { company_name: companyName, email_domain: emailDomain }
      })

      return NextResponse.json({
        success: true,
        message: 'Enterprise account created successfully',
        isOwner: true,
        corporateAccountId: newCorporateAccount.id,
        userId
      })
    }

    // CASE 2: Enterprise account exists - Apply access mode rules
    const accessMode = existingAccount.access_mode

    if (accessMode === 'open') {
      // AUTO-JOIN: Add user as member immediately
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          account_type: 'enterprise',
          corporate_account_id: existingAccount.id,
          corporate_role: 'member',
          account_status: 'active',
          email_verified: false, // Will be set to true after email verification
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          industry_field: industryField || null,
          employee_count: employeeCount || null,
          job_title: jobTitle || null,
          department: department || null,
          phone_number: phoneNumber || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Log audit event
      await supabaseAdmin.rpc('log_corporate_audit', {
        corp_account_id: existingAccount.id,
        admin_user_id: userId,
        action_type: 'user_auto_joined',
        target_user: userId,
        action_details: { access_mode: 'open' }
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully joined enterprise account. Please verify your email.',
        isOwner: false,
        corporateAccountId: existingAccount.id,
        userId
      })
    }

    if (accessMode === 'approval') {
      // APPROVAL MODE: Create user profile but mark as pending, create access request
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: userId,
          email,
          full_name: fullName || `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          account_type: 'enterprise',
          corporate_account_id: existingAccount.id,
          corporate_role: null, // No role until approved
          account_status: 'suspended', // Suspended until approved
          email_verified: false, // Will be set to true after email verification
          onboarding_completed: false,
          plan: 'free',
          subscription_status: 'active',
          industry_field: industryField || null,
          employee_count: employeeCount || null,
          job_title: jobTitle || null,
          department: department || null,
          phone_number: phoneNumber || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Create access request
      const { error: requestError } = await supabaseAdmin
        .from('corporate_access_requests')
        .insert({
          corporate_account_id: existingAccount.id,
          user_id: userId,
          status: 'pending'
        })

      if (requestError) {
        console.error('Error creating access request:', requestError)
      }

      return NextResponse.json({
        success: true,
        message: 'Access request submitted. Waiting for admin approval.',
        requiresApproval: true,
        corporateAccountId: existingAccount.id,
        userId
      })
    }

    if (accessMode === 'invite_only') {
      // INVITE-ONLY MODE: Check if user has valid invitation
      // For now, reject signup - invitation flow will be handled separately
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        {
          error: 'This enterprise account is invite-only. Please contact your administrator for an invitation.',
          requiresInvitation: true
        },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Invalid access mode configuration' },
      { status: 500 }
    )

  } catch (error) {
    console.error('Enterprise signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


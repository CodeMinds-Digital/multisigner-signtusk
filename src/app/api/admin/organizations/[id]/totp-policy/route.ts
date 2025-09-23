import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/organizations/[id]/totp-policy - Get organization TOTP policy
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Fetch organization and its TOTP policy
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        organization_totp_policies(*)
      `)
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // If no policy exists, create a default one
    let policy = organization.organization_totp_policies?.[0]
    
    if (!policy) {
      const { data: newPolicy, error: policyError } = await supabaseAdmin
        .from('organization_totp_policies')
        .insert({
          organization_id: organizationId,
          enforce_login_mfa: false,
          login_mfa_grace_period_days: 7,
          enforce_signing_mfa: false,
          require_totp_for_all_documents: false,
          allow_user_override: true,
          max_backup_codes: 10,
          totp_window_tolerance: 1,
          require_mfa_for_admin_actions: false,
          audit_totp_events: true,
          retention_period_days: 365,
          allow_admin_override: true,
          emergency_access_codes: []
        })
        .select()
        .single()

      if (policyError) {
        console.error('Error creating default policy:', policyError)
        return NextResponse.json(
          { error: 'Failed to create default policy' },
          { status: 500 }
        )
      }

      policy = newPolicy
    }

    return NextResponse.json({
      success: true,
      data: {
        organization,
        policy
      }
    })

  } catch (error) {
    console.error('Error fetching organization TOTP policy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/organizations/[id]/totp-policy - Update organization TOTP policy
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id
    const body = await request.json()

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Validate the policy data
    const {
      enforce_login_mfa,
      login_mfa_grace_period_days,
      enforce_signing_mfa,
      require_totp_for_all_documents,
      allow_user_override,
      max_backup_codes,
      totp_window_tolerance,
      require_mfa_for_admin_actions,
      audit_totp_events,
      retention_period_days,
      allow_admin_override,
      emergency_access_codes
    } = body

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Only update provided fields
    if (typeof enforce_login_mfa === 'boolean') updateData.enforce_login_mfa = enforce_login_mfa
    if (typeof login_mfa_grace_period_days === 'number') updateData.login_mfa_grace_period_days = login_mfa_grace_period_days
    if (typeof enforce_signing_mfa === 'boolean') updateData.enforce_signing_mfa = enforce_signing_mfa
    if (typeof require_totp_for_all_documents === 'boolean') updateData.require_totp_for_all_documents = require_totp_for_all_documents
    if (typeof allow_user_override === 'boolean') updateData.allow_user_override = allow_user_override
    if (typeof max_backup_codes === 'number') updateData.max_backup_codes = max_backup_codes
    if (typeof totp_window_tolerance === 'number') updateData.totp_window_tolerance = totp_window_tolerance
    if (typeof require_mfa_for_admin_actions === 'boolean') updateData.require_mfa_for_admin_actions = require_mfa_for_admin_actions
    if (typeof audit_totp_events === 'boolean') updateData.audit_totp_events = audit_totp_events
    if (typeof retention_period_days === 'number') updateData.retention_period_days = retention_period_days
    if (typeof allow_admin_override === 'boolean') updateData.allow_admin_override = allow_admin_override
    if (Array.isArray(emergency_access_codes)) updateData.emergency_access_codes = emergency_access_codes

    // Update the policy
    const { data: policy, error } = await supabaseAdmin
      .from('organization_totp_policies')
      .update(updateData)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating TOTP policy:', error)
      return NextResponse.json(
        { error: 'Failed to update TOTP policy' },
        { status: 500 }
      )
    }

    // If enforcing MFA, update user TOTP configs to mark them as organization-enforced
    if (enforce_login_mfa || enforce_signing_mfa) {
      await supabaseAdmin
        .from('user_totp_configs')
        .update({
          organization_enforced: true,
          policy_compliance_date: new Date().toISOString()
        })
        .in('user_id', 
          supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('organization_id', organizationId)
        )
    }

    // Log the policy change for audit purposes
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: 'system', // In real implementation, get from auth
        action: 'update_organization_totp_policy',
        details: `Updated TOTP policy for organization ${organizationId}`,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      data: policy,
      message: 'TOTP policy updated successfully'
    })

  } catch (error) {
    console.error('Error updating organization TOTP policy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/organizations/[id]/totp-policy/enforce - Enforce policy for all users
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const organizationId = params.id
    const body = await request.json()
    const { gracePeriodDays = 7, notifyUsers = true } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get organization policy
    const { data: policy, error: policyError } = await supabaseAdmin
      .from('organization_totp_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (policyError || !policy) {
      return NextResponse.json(
        { error: 'Organization policy not found' },
        { status: 404 }
      )
    }

    // Get all users in the organization
    const { data: users, error: usersError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('organization_id', organizationId)

    if (usersError) {
      console.error('Error fetching organization users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch organization users' },
        { status: 500 }
      )
    }

    const complianceDeadline = new Date()
    complianceDeadline.setDate(complianceDeadline.getDate() + gracePeriodDays)

    // Update user TOTP configs to mark enforcement
    const { error: updateError } = await supabaseAdmin
      .from('user_totp_configs')
      .upsert(
        users?.map(user => ({
          user_id: user.id,
          organization_enforced: true,
          policy_compliance_date: complianceDeadline.toISOString(),
          secret: '', // Will be generated when user sets up TOTP
          backup_codes: [],
          enabled: false,
          login_mfa_enabled: policy.enforce_login_mfa,
          signing_mfa_enabled: policy.enforce_signing_mfa,
          default_require_totp: policy.require_totp_for_all_documents
        })) || []
      )

    if (updateError) {
      console.error('Error updating user TOTP configs:', updateError)
      return NextResponse.json(
        { error: 'Failed to enforce policy for users' },
        { status: 500 }
      )
    }

    // TODO: Send notification emails to users if notifyUsers is true
    if (notifyUsers) {
      console.log('Would send notification emails to users about TOTP enforcement')
    }

    // Log the enforcement action
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: 'system', // In real implementation, get from auth
        action: 'enforce_organization_totp_policy',
        details: `Enforced TOTP policy for ${users?.length || 0} users in organization ${organizationId}`,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: `TOTP policy enforced for ${users?.length || 0} users`,
      data: {
        usersAffected: users?.length || 0,
        complianceDeadline: complianceDeadline.toISOString(),
        gracePeriodDays
      }
    })

  } catch (error) {
    console.error('Error enforcing organization TOTP policy:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

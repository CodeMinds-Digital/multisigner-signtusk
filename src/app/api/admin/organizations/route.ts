import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/admin/organizations - List all organizations
export async function GET(request: NextRequest) {
  try {
    // In a real implementation, you'd verify admin authentication here
    // For now, we'll use mock data but structure it for real implementation

    const { data: organizations, error } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        user_organizations(count),
        organization_totp_policies(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      )
    }

    // Transform data to include member count
    const transformedOrgs = organizations?.map(org => ({
      ...org,
      memberCount: org.user_organizations?.[0]?.count || 0,
      hasPolicy: !!org.organization_totp_policies?.[0]
    })) || []

    return NextResponse.json({
      success: true,
      data: transformedOrgs
    })

  } catch (error) {
    console.error('Error in organizations API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/organizations - Create new organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, domain, plan = 'free' } = body

    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name and domain are required' },
        { status: 400 }
      )
    }

    // Check if domain already exists
    const { data: existingOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('domain', domain)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization with this domain already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name,
        domain,
        plan,
        status: 'active'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Create default TOTP policy for the organization
    const { error: policyError } = await supabaseAdmin
      .from('organization_totp_policies')
      .insert({
        organization_id: organization.id,
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

    if (policyError) {
      console.error('Error creating default policy:', policyError)
      // Don't fail the organization creation, just log the error
    }

    return NextResponse.json({
      success: true,
      data: organization
    })

  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/organizations/[id] - Update organization
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, domain, plan, status } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (domain) updateData.domain = domain
    if (plan) updateData.plan = plan
    if (status) updateData.status = status
    updateData.updated_at = new Date().toISOString()

    const { data: organization, error } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating organization:', error)
      return NextResponse.json(
        { error: 'Failed to update organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: organization
    })

  } catch (error) {
    console.error('Error updating organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/organizations/[id] - Delete organization
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Check if organization has members
    const { data: members } = await supabaseAdmin
      .from('user_organizations')
      .select('id')
      .eq('organization_id', id)
      .eq('status', 'active')

    if (members && members.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete organization with active members' },
        { status: 409 }
      )
    }

    // Delete organization (cascade will handle related records)
    const { error } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting organization:', error)
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { TOTPService } from '@/lib/totp-service'

// POST /api/admin/emergency-access/grant - Grant emergency TOTP exemption
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      organizationId, 
      exemptionType = 'both', // 'login', 'signing', or 'both'
      reason, 
      expiresInHours = 24,
      adminId 
    } = body

    if (!userId || !reason || !adminId) {
      return NextResponse.json(
        { error: 'User ID, reason, and admin ID are required' },
        { status: 400 }
      )
    }

    // Verify admin has permission to grant exemptions
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('user_organizations')
      .select('role')
      .eq('user_id', adminId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (adminError || !admin || !['owner', 'admin'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to grant exemptions' },
        { status: 403 }
      )
    }

    // Calculate expiration time
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expiresInHours)

    // Grant exemption
    const { data: exemption, error: exemptionError } = await supabaseAdmin
      .from('organization_totp_exemptions')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        exemption_type: exemptionType,
        reason,
        granted_by: adminId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (exemptionError) {
      console.error('Error granting exemption:', exemptionError)
      return NextResponse.json(
        { error: 'Failed to grant exemption' },
        { status: 500 }
      )
    }

    // Log the emergency access grant
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action: 'grant_emergency_totp_exemption',
        details: `Granted ${exemptionType} TOTP exemption for user ${userId}. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      data: exemption,
      message: 'Emergency exemption granted successfully'
    })

  } catch (error) {
    console.error('Error granting emergency access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/emergency-access/revoke - Revoke emergency exemption
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { exemptionId, adminId, reason } = body

    if (!exemptionId || !adminId) {
      return NextResponse.json(
        { error: 'Exemption ID and admin ID are required' },
        { status: 400 }
      )
    }

    // Get exemption details for logging
    const { data: exemption, error: exemptionError } = await supabaseAdmin
      .from('organization_totp_exemptions')
      .select('*')
      .eq('id', exemptionId)
      .single()

    if (exemptionError || !exemption) {
      return NextResponse.json(
        { error: 'Exemption not found' },
        { status: 404 }
      )
    }

    // Verify admin has permission
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('user_organizations')
      .select('role')
      .eq('user_id', adminId)
      .eq('organization_id', exemption.organization_id)
      .eq('status', 'active')
      .single()

    if (adminError || !admin || !['owner', 'admin'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to revoke exemptions' },
        { status: 403 }
      )
    }

    // Revoke exemption
    const { error: deleteError } = await supabaseAdmin
      .from('organization_totp_exemptions')
      .delete()
      .eq('id', exemptionId)

    if (deleteError) {
      console.error('Error revoking exemption:', deleteError)
      return NextResponse.json(
        { error: 'Failed to revoke exemption' },
        { status: 500 }
      )
    }

    // Log the revocation
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action: 'revoke_emergency_totp_exemption',
        details: `Revoked TOTP exemption for user ${exemption.user_id}. Reason: ${reason || 'No reason provided'}`,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'Emergency exemption revoked successfully'
    })

  } catch (error) {
    console.error('Error revoking emergency access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/admin/emergency-access/list - List active exemptions
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const organizationId = url.searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Get active exemptions
    const { data: exemptions, error } = await supabaseAdmin
      .from('organization_totp_exemptions')
      .select(`
        *,
        user_profiles!user_id(email, full_name),
        granted_by_profile:user_profiles!granted_by(email, full_name)
      `)
      .eq('organization_id', organizationId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching exemptions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch exemptions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: exemptions || []
    })

  } catch (error) {
    console.error('Error listing emergency access:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/emergency-access/reset-totp - Reset user's TOTP configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, adminId, reason, organizationId } = body

    if (!userId || !adminId || !reason) {
      return NextResponse.json(
        { error: 'User ID, admin ID, and reason are required' },
        { status: 400 }
      )
    }

    // Verify admin permissions
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('user_organizations')
      .select('role')
      .eq('user_id', adminId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (adminError || !admin || !['owner', 'admin'].includes(admin.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to reset TOTP' },
        { status: 403 }
      )
    }

    // Reset user's TOTP configuration
    const { error: resetError } = await supabaseAdmin
      .from('user_totp_configs')
      .update({
        enabled: false,
        secret: '',
        backup_codes: [],
        last_used_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (resetError) {
      console.error('Error resetting TOTP:', resetError)
      return NextResponse.json(
        { error: 'Failed to reset TOTP configuration' },
        { status: 500 }
      )
    }

    // Log the TOTP reset
    await supabaseAdmin
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action: 'reset_user_totp',
        details: `Reset TOTP configuration for user ${userId}. Reason: ${reason}`,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      message: 'TOTP configuration reset successfully'
    })

  } catch (error) {
    console.error('Error resetting TOTP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

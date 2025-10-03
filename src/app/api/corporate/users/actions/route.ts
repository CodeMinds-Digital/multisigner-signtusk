import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyAccessToken } from '@/lib/jwt-utils'

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
 * User Actions API
 * Handles: change role, suspend, reactivate, remove user
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

    const adminUserId = payload.userId
    const body = await request.json()
    const { action, targetUserId, newRole } = body

    // Validate action
    if (!action || !['change_role', 'suspend', 'reactivate', 'remove'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    // Get admin profile
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('user_profiles')
      .select('corporate_account_id, corporate_role, account_type')
      .eq('id', adminUserId)
      .single()

    if (adminProfileError || !adminProfile) {
      return NextResponse.json(
        { error: 'Admin profile not found' },
        { status: 404 }
      )
    }

    // Check if admin is enterprise admin/owner
    if (adminProfile.account_type !== 'enterprise' || !['owner', 'admin'].includes(adminProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get target user profile
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if target user is in the same enterprise account
    if (targetUser.corporate_account_id !== adminProfile.corporate_account_id) {
      return NextResponse.json(
        { error: 'Cannot manage users from other enterprise accounts' },
        { status: 403 }
      )
    }

    // Prevent self-actions
    if (targetUserId === adminUserId) {
      return NextResponse.json(
        { error: 'Cannot perform this action on yourself' },
        { status: 400 }
      )
    }

    // Role hierarchy checks
    if (targetUser.corporate_role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot modify the owner account' },
        { status: 403 }
      )
    }

    if (adminProfile.corporate_role === 'admin' && targetUser.corporate_role === 'admin') {
      return NextResponse.json(
        { error: 'Admins cannot modify other admins' },
        { status: 403 }
      )
    }

    // Handle different actions
    switch (action) {
      case 'change_role':
        return await handleChangeRole(adminProfile, targetUser, newRole, adminUserId)

      case 'suspend':
        return await handleSuspend(adminProfile, targetUser, adminUserId)

      case 'reactivate':
        return await handleReactivate(adminProfile, targetUser, adminUserId)

      case 'remove':
        return await handleRemove(adminProfile, targetUser, adminUserId)

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in POST /api/corporate/users/actions (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleChangeRole(adminProfile: any, targetUser: any, newRole: string, adminUserId: string) {
  // Validate new role
  if (!newRole || !['admin', 'member'].includes(newRole)) {
    return NextResponse.json(
      { error: 'New role must be either "admin" or "member"' },
      { status: 400 }
    )
  }

  // Only owner can create new admins
  if (newRole === 'admin' && adminProfile.corporate_role !== 'owner') {
    return NextResponse.json(
      { error: 'Only the owner can promote users to admin' },
      { status: 403 }
    )
  }

  // Update user role
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      corporate_role: newRole,
      updated_at: new Date().toISOString()
    })
    .eq('id', targetUser.id)

  if (updateError) {
    console.error('Error updating user role:', updateError)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }

  // Log audit event
  await supabaseAdmin.rpc('log_corporate_audit', {
    corp_account_id: adminProfile.corporate_account_id,
    admin_user_id: adminUserId,
    action_type: 'role_changed',
    target_user: targetUser.id,
    action_details: {
      old_role: targetUser.corporate_role,
      new_role: newRole,
      target_email: targetUser.email
    }
  })

  return NextResponse.json({
    success: true,
    message: `User role updated to ${newRole}`
  })
}

async function handleSuspend(adminProfile: any, targetUser: any, adminUserId: string) {
  if (targetUser.account_status === 'suspended') {
    return NextResponse.json(
      { error: 'User is already suspended' },
      { status: 400 }
    )
  }

  // Update user status
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      account_status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_by: adminUserId,
      updated_at: new Date().toISOString()
    })
    .eq('id', targetUser.id)

  if (updateError) {
    console.error('Error suspending user:', updateError)
    return NextResponse.json(
      { error: 'Failed to suspend user' },
      { status: 500 }
    )
  }

  // Log audit event
  await supabaseAdmin.rpc('log_corporate_audit', {
    corp_account_id: adminProfile.corporate_account_id,
    admin_user_id: adminUserId,
    action_type: 'user_suspended',
    target_user: targetUser.id,
    action_details: {
      target_email: targetUser.email,
      target_role: targetUser.corporate_role
    }
  })

  return NextResponse.json({
    success: true,
    message: 'User suspended successfully'
  })
}

async function handleReactivate(adminProfile: any, targetUser: any, adminUserId: string) {
  if (targetUser.account_status === 'active') {
    return NextResponse.json(
      { error: 'User is already active' },
      { status: 400 }
    )
  }

  // Update user status
  const { error: updateError } = await supabaseAdmin
    .from('user_profiles')
    .update({
      account_status: 'active',
      suspended_at: null,
      suspended_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', targetUser.id)

  if (updateError) {
    console.error('Error reactivating user:', updateError)
    return NextResponse.json(
      { error: 'Failed to reactivate user' },
      { status: 500 }
    )
  }

  // Log audit event
  await supabaseAdmin.rpc('log_corporate_audit', {
    corp_account_id: adminProfile.corporate_account_id,
    admin_user_id: adminUserId,
    action_type: 'user_reactivated',
    target_user: targetUser.id,
    action_details: {
      target_email: targetUser.email,
      target_role: targetUser.corporate_role
    }
  })

  return NextResponse.json({
    success: true,
    message: 'User reactivated successfully'
  })
}

async function handleRemove(adminProfile: any, targetUser: any, adminUserId: string) {
  // Log audit event before deletion
  await supabaseAdmin.rpc('log_corporate_audit', {
    corp_account_id: adminProfile.corporate_account_id,
    admin_user_id: adminUserId,
    action_type: 'user_removed',
    target_user: targetUser.id,
    action_details: {
      target_email: targetUser.email,
      target_role: targetUser.corporate_role
    }
  })

  // Delete user profile (this will cascade to auth user via trigger or manual deletion)
  const { error: deleteProfileError } = await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('id', targetUser.id)

  if (deleteProfileError) {
    console.error('Error deleting user profile:', deleteProfileError)
    return NextResponse.json(
      { error: 'Failed to remove user profile' },
      { status: 500 }
    )
  }

  // Delete auth user
  const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)

  if (deleteAuthError) {
    console.error('Error deleting auth user:', deleteAuthError)
    // Profile is already deleted, so we'll just log the error
  }

  return NextResponse.json({
    success: true,
    message: 'User removed successfully'
  })
}


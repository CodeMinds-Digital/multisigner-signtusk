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
 * Get Enterprise Settings
 * Returns enterprise account info and user's role
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

    // Check if user is enterprise
    if (userProfile.account_type !== 'enterprise') {
      return NextResponse.json(
        { error: 'Not an enterprise account' },
        { status: 403 }
      )
    }

    // Check if user is admin or owner
    if (!['owner', 'admin'].includes(userProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can access enterprise settings.' },
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

    return NextResponse.json({
      userProfile,
      corporateAccount
    })

  } catch (error) {
    console.error('Error fetching enterprise settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update Enterprise Settings
 * Allows owners/admins to update access mode
 */
export async function PATCH(request: NextRequest) {
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
    const { access_mode } = body

    // Validate access mode
    if (!access_mode || !['open', 'approval', 'invite_only'].includes(access_mode)) {
      return NextResponse.json(
        { error: 'Invalid access mode. Must be: open, approval, or invite_only' },
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

    // Check if user is enterprise
    if (userProfile.account_type !== 'enterprise') {
      return NextResponse.json(
        { error: 'Not an enterprise account' },
        { status: 403 }
      )
    }

    // Check if user is admin or owner
    if (!['owner', 'admin'].includes(userProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admins and owners can update settings.' },
        { status: 403 }
      )
    }

    // Update enterprise account access mode
    const { data: updatedAccount, error: updateError } = await supabaseAdmin
      .from('corporate_accounts')
      .update({
        access_mode,
        updated_at: new Date().toISOString()
      })
      .eq('id', userProfile.corporate_account_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating enterprise account:', updateError)
      return NextResponse.json(
        { error: 'Failed to update access mode' },
        { status: 500 }
      )
    }

    // Log audit event
    await supabaseAdmin.rpc('log_corporate_audit', {
      corp_account_id: userProfile.corporate_account_id,
      admin_user_id: userId,
      action_type: 'access_mode_changed',
      target_user: null,
      action_details: {
        new_access_mode: access_mode,
        changed_by_role: userProfile.corporate_role
      }
    })

    return NextResponse.json({
      success: true,
      corporateAccount: updatedAccount
    })

  } catch (error) {
    console.error('Error updating enterprise settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


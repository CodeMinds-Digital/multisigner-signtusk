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
 * Get Pending Access Requests
 * Returns all pending access requests for the enterprise account
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

    // Get pending access requests with user details
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('corporate_access_requests')
      .select(`
        *,
        user_profile:user_profiles!corporate_access_requests_user_id_fkey(
          id,
          email,
          first_name,
          last_name,
          created_at
        )
      `)
      .eq('corporate_account_id', userProfile.corporate_account_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('Error fetching access requests:', requestsError)
      return NextResponse.json(
        { error: 'Failed to fetch access requests' },
        { status: 500 }
      )
    }

    return NextResponse.json({ requests })

  } catch (error) {
    console.error('Error in GET /api/corporate/access-requests (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Approve or Decline Access Request
 * Handles admin decision on pending access requests
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

    // Get request body
    const body = await request.json()
    const { requestId, action, message } = body

    // Validate input
    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "decline"' },
        { status: 400 }
      )
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('corporate_account_id, corporate_role, account_type, first_name, last_name')
      .eq('id', userId)
      .single()

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user is enterprise admin/owner
    if (adminProfile.account_type !== 'enterprise' || !['owner', 'admin'].includes(adminProfile.corporate_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get the access request
    const { data: accessRequest, error: requestError } = await supabaseAdmin
      .from('corporate_access_requests')
      .select('*, user_profile:user_profiles!corporate_access_requests_user_id_fkey(id, email, first_name, last_name, account_status)')
      .eq('id', requestId)
      .eq('corporate_account_id', adminProfile.corporate_account_id)
      .single()

    if (requestError || !accessRequest) {
      return NextResponse.json(
        { error: 'Access request not found' },
        { status: 404 }
      )
    }

    // Check if request is still pending
    if (accessRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request has already been processed' },
        { status: 400 }
      )
    }

    const targetUser = accessRequest.user_profile

    if (action === 'approve') {
      // Approve: Update user status to active
      const { error: updateUserError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          account_status: 'active',
          suspended_at: null,
          suspended_by: null
        })
        .eq('id', targetUser.id)

      if (updateUserError) {
        console.error('Error updating user status:', updateUserError)
        return NextResponse.json(
          { error: 'Failed to approve user' },
          { status: 500 }
        )
      }

      // Update access request status
      const { error: updateRequestError } = await supabaseAdmin
        .from('corporate_access_requests')
        .update({
          status: 'approved',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateRequestError) {
        console.error('Error updating access request:', updateRequestError)
      }

      // Log audit event
      await supabaseAdmin.rpc('log_corporate_audit', {
        p_corporate_account_id: adminProfile.corporate_account_id,
        p_admin_id: userId,
        p_action: 'access_request_approved',
        p_target_user_id: targetUser.id,
        p_details: {
          user_email: targetUser.email,
          message: message || null
        }
      })

      // Send approval email
      try {
        const { data: emailData, error: emailError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: targetUser.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
          }
        })

        if (!emailError && emailData) {
          // Note: In production, you'd send a custom email here
          console.log('Approval email would be sent to:', targetUser.email)
        }
      } catch (emailError) {
        console.error('Error sending approval email:', emailError)
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        message: 'Access request approved successfully',
        user: {
          email: targetUser.email,
          name: `${targetUser.first_name} ${targetUser.last_name}`
        }
      })

    } else {
      // Decline: Update request status and optionally remove user
      const { error: updateRequestError } = await supabaseAdmin
        .from('corporate_access_requests')
        .update({
          status: 'declined',
          reviewed_by: userId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateRequestError) {
        console.error('Error updating access request:', updateRequestError)
        return NextResponse.json(
          { error: 'Failed to decline request' },
          { status: 500 }
        )
      }

      // Log audit event
      await supabaseAdmin.rpc('log_corporate_audit', {
        p_corporate_account_id: adminProfile.corporate_account_id,
        p_admin_id: userId,
        p_action: 'access_request_declined',
        p_target_user_id: targetUser.id,
        p_details: {
          user_email: targetUser.email,
          message: message || null
        }
      })

      // Send decline email (optional)
      try {
        console.log('Decline notification would be sent to:', targetUser.email)
        // In production, send custom email with decline message
      } catch (emailError) {
        console.error('Error sending decline email:', emailError)
      }

      return NextResponse.json({
        message: 'Access request declined',
        user: {
          email: targetUser.email,
          name: `${targetUser.first_name} ${targetUser.last_name}`
        }
      })
    }

  } catch (error) {
    console.error('Error in POST /api/corporate/access-requests (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


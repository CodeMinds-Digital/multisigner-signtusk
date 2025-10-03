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
 * Get Audit Logs
 * Returns audit logs for the enterprise account
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

    // Get audit logs for this enterprise account
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('corporate_audit_logs')
      .select('*')
      .eq('corporate_account_id', userProfile.corporate_account_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (logsError) {
      console.error('Error fetching audit logs:', logsError)
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    // Manually fetch admin and target user profiles
    const logsWithProfiles = await Promise.all(
      (logs || []).map(async (log) => {
        const [adminProfile, targetProfile] = await Promise.all([
          log.admin_id
            ? supabaseAdmin
              .from('user_profiles')
              .select('email, first_name, last_name')
              .eq('id', log.admin_id)
              .single()
              .then(({ data }) => data)
            : Promise.resolve(null),
          log.target_user_id
            ? supabaseAdmin
              .from('user_profiles')
              .select('email, first_name, last_name')
              .eq('id', log.target_user_id)
              .single()
              .then(({ data }) => data)
            : Promise.resolve(null)
        ])

        return {
          ...log,
          admin_profile: adminProfile,
          target_profile: targetProfile
        }
      })
    )

    return NextResponse.json({ logs: logsWithProfiles })

  } catch (error) {
    console.error('Error in GET /api/corporate/audit-logs (enterprise):', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


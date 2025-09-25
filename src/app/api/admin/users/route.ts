import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabaseInstance } from '@/lib/admin-supabase'
import { validateAdminSession, logAdminAction, hasAdminPermission } from '@/lib/real-admin-auth'

// =====================================================
// REAL USER MANAGEMENT API
// Replaces mock data with actual database operations
// =====================================================

export interface RealUserData {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone: string | null
  user_metadata: any
  app_metadata: any
  // Extended data from our tables
  subscription_status?: string
  subscription_plan?: string
  documents_count?: number
  signatures_count?: number
  storage_used_mb?: number
  last_activity?: string
}

export interface UserStats {
  total_users: number
  active_users_24h: number
  new_users_today: number
  verified_users: number
  subscription_breakdown: {
    free: number
    basic: number
    pro: number
    enterprise: number
  }
}

/**
 * GET /api/admin/users - Get all users with real data
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 })
    }

    const session = await validateAdminSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check permissions
    if (!hasAdminPermission('view_users', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const includeStats = searchParams.get('includeStats') === 'true'

    // Get users from Supabase Auth
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Failed to get admin Supabase instance' }, { status: 500 })
    }
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: limit
    })

    if (authError) {
      console.error('Error fetching users from auth:', authError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get extended user data from our tables
    const userIds = authData.users.map(user => user.id)

    // Get subscription data
    const { data: subscriptions } = await adminSupabase
      .from('user_subscriptions')
      .select(`
        user_id,
        status,
        billing_plans(name)
      `)
      .in('user_id', userIds)

    // Get document counts
    const { data: documentCounts } = await adminSupabase
      .from('documents')
      .select('user_id')
      .in('user_id', userIds)

    // Get signature counts
    const { data: signatureCounts } = await adminSupabase
      .from('signing_request_signers')
      .select('user_id')
      .in('user_id', userIds)

    // Combine data
    const users: RealUserData[] = (authData.users as any).map((user: any) => {
      const userSubscription = (subscriptions as any)?.find((sub: any) => sub.user_id === user.id)
      const userDocuments = (documentCounts as any)?.filter((doc: any) => doc.user_id === user.id) || []
      const userSignatures = (signatureCounts as any)?.filter((sig: any) => sig.user_id === user.id) || []

      return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        phone: user.phone,
        user_metadata: user.user_metadata,
        app_metadata: user.app_metadata,
        subscription_status: userSubscription?.status || 'free',
        subscription_plan: userSubscription?.billing_plans?.name || 'Free',
        documents_count: userDocuments.length,
        signatures_count: userSignatures.length,
        storage_used_mb: userDocuments.length * 2.5, // Estimate 2.5MB per document
        last_activity: user.last_sign_in_at || user.created_at
      }
    })

    // Apply filters
    let filteredUsers = users

    if (search) {
      filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (status !== 'all') {
      filteredUsers = users.filter(user => {
        switch (status) {
          case 'active':
            return user.last_sign_in_at &&
              new Date(user.last_sign_in_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          case 'inactive':
            return !user.last_sign_in_at ||
              new Date(user.last_sign_in_at) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          case 'verified':
            return !!user.email_confirmed_at
          case 'unverified':
            return !user.email_confirmed_at
          default:
            return true
        }
      })
    }

    // Get stats if requested
    let stats: UserStats | null = null
    if (includeStats) {
      stats = await getUserStats()
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      'view_users',
      'users',
      undefined,
      undefined,
      { page, limit, search, status }
    )

    return NextResponse.json({
      users: filteredUsers,
      stats,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        hasMore: authData.users.length === limit
      }
    })

  } catch (error) {
    console.error('Error in admin users API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users - Create or update user
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 })
    }

    const session = await validateAdminSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check permissions
    if (!hasAdminPermission('manage_users', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userId, userData } = body

    let result

    switch (action) {
      case 'update_metadata':
        result = await updateUserMetadata(userId, userData)
        break
      case 'ban_user':
        result = await banUser(userId)
        break
      case 'unban_user':
        result = await unbanUser(userId)
        break
      case 'delete_user':
        result = await deleteUser(userId)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      action,
      'user',
      userId,
      undefined,
      userData
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in admin users POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get user statistics
 */
async function getUserStats(): Promise<UserStats> {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }

    // Get total users
    const { count: totalUsers } = await (adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    }) as any)

    // Get users active in last 24h
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: activeUsers } = await adminSupabase.auth.admin.listUsers()
    const activeUsers24h = (activeUsers as any)?.users.filter((user: any) =>
      user.last_sign_in_at && user.last_sign_in_at > yesterday
    ).length || 0

    // Get new users today
    const today = new Date().toISOString().split('T')[0]
    const newUsersToday = activeUsers?.users.filter(user =>
      user.created_at.startsWith(today)
    ).length || 0

    // Get verified users
    const verifiedUsers = activeUsers?.users.filter(user =>
      user.email_confirmed_at
    ).length || 0

    // Get subscription breakdown
    const { data: subscriptions } = await adminSupabase
      .from('user_subscriptions')
      .select(`
        status,
        billing_plans(name)
      `)
      .eq('status', 'active')

    const subscriptionBreakdown = {
      free: (totalUsers || 0) - ((subscriptions as any)?.length || 0),
      basic: (subscriptions as any)?.filter((sub: any) => sub.billing_plans?.name === 'Basic').length || 0,
      pro: (subscriptions as any)?.filter((sub: any) => sub.billing_plans?.name === 'Pro').length || 0,
      enterprise: (subscriptions as any)?.filter((sub: any) => sub.billing_plans?.name === 'Enterprise').length || 0
    }

    return {
      total_users: totalUsers || 0,
      active_users_24h: activeUsers24h,
      new_users_today: newUsersToday,
      verified_users: verifiedUsers,
      subscription_breakdown: subscriptionBreakdown
    }

  } catch (error) {
    console.error('Error getting user stats:', error)
    return {
      total_users: 0,
      active_users_24h: 0,
      new_users_today: 0,
      verified_users: 0,
      subscription_breakdown: { free: 0, basic: 0, pro: 0, enterprise: 0 }
    }
  }
}

/**
 * Update user metadata
 */
async function updateUserMetadata(userId: string, metadata: any) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, user: data.user }

  } catch (error) {
    console.error('Error updating user metadata:', error)
    return { success: false, error: 'Failed to update user' }
  }
}

/**
 * Ban user
 */
async function banUser(userId: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      ban_duration: 'indefinite'
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'User banned successfully' }

  } catch (error) {
    console.error('Error banning user:', error)
    return { success: false, error: 'Failed to ban user' }
  }
}

/**
 * Unban user
 */
async function unbanUser(userId: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data, error } = await adminSupabase.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'User unbanned successfully' }

  } catch (error) {
    console.error('Error unbanning user:', error)
    return { success: false, error: 'Failed to unban user' }
  }
}

/**
 * Delete user
 */
async function deleteUser(userId: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { error } = await adminSupabase.auth.admin.deleteUser(userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, message: 'User deleted successfully' }

  } catch (error) {
    console.error('Error deleting user:', error)
    return { success: false, error: 'Failed to delete user' }
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { logoutAdmin } from '@/lib/real-admin-auth'

// =====================================================
// ADMIN LOGOUT API
// Handles admin session logout
// =====================================================

/**
 * POST /api/admin/auth/logout - Logout admin user
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'No authorization token' },
        { status: 401 }
      )
    }

    // Logout admin
    const success = await logoutAdmin(token)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

  } catch (error) {
    console.error('Error logging out admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

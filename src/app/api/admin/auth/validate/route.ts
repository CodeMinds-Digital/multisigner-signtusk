import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/real-admin-auth'

// =====================================================
// ADMIN SESSION VALIDATION API
// Validates admin session tokens
// =====================================================

/**
 * POST /api/admin/auth/validate - Validate admin session
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

    // Validate session
    const session = await validateAdminSession(token)

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      )
    }

    // Return session data
    return NextResponse.json({
      success: true,
      session: {
        token: session.token,
        expires_at: session.expires_at,
        user: session.user
      }
    })

  } catch (error) {
    console.error('Error validating admin session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin, storeAdminSessionToken } from '@/lib/real-admin-auth'

// =====================================================
// REAL ADMIN LOGIN API
// Replaces mock authentication with database-based auth
// =====================================================

/**
 * POST /api/admin/auth/login - Authenticate admin user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Authenticate admin
    const result = await authenticateAdmin(email, password)

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error,
          requiresTwoFA: result.requiresTwoFA 
        },
        { status: 401 }
      )
    }

    if (!result.session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      )
    }

    // Return session data (token will be stored on client)
    return NextResponse.json({
      success: true,
      session: {
        token: result.session.token,
        expires_at: result.session.expires_at,
        user: result.session.user
      }
    })

  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/auth/login - Check login status
 */
export async function GET() {
  return NextResponse.json({
    message: 'Admin login endpoint',
    methods: ['POST'],
    fields: {
      email: 'string (required)',
      password: 'string (required)'
    }
  })
}

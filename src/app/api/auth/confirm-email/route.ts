import { NextRequest, NextResponse } from 'next/server'
import { EmailConfirmationService } from '@/lib/email-confirmation-service'
import { handleApiError } from '@/lib/api-error-handler'

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { error: { message: 'Email and token are required', code: 'MISSING_FIELDS' } },
        { status: 400 }
      )
    }

    const result = await EmailConfirmationService.verifyConfirmationToken(email, token)

    if (!result.success) {
      return NextResponse.json(
        { error: { message: result.error, code: 'CONFIRMATION_FAILED' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Email confirmed successfully',
      userData: result.userData
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')

    if (!email || !token) {
      return NextResponse.redirect(new URL('/auth/signup?error=invalid_confirmation_link', request.url))
    }

    const result = await EmailConfirmationService.verifyConfirmationToken(email, token)

    if (!result.success) {
      return NextResponse.redirect(new URL(`/auth/signup?error=${encodeURIComponent(result.error || 'confirmation_failed')}`, request.url))
    }

    return NextResponse.redirect(new URL('/auth/login?confirmed=true', request.url))
  } catch (error) {
    console.error('Error in email confirmation:', error)
    return NextResponse.redirect(new URL('/auth/signup?error=confirmation_error', request.url))
  }
}

// PUT method for resending confirmation emails
export async function PUT(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: { message: 'Email is required', code: 'MISSING_EMAIL' } },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: { message: 'Invalid email format', code: 'INVALID_EMAIL' } },
        { status: 400 }
      )
    }

    console.log('📧 Resending confirmation email to:', email)

    // Use EmailConfirmationService to resend
    const result = await EmailConfirmationService.resendConfirmation(email)

    if (!result.success) {
      return NextResponse.json(
        { error: { message: result.error, code: 'RESEND_FAILED' } },
        { status: 400 }
      )
    }

    console.log('✅ Confirmation email resent successfully')

    return NextResponse.json({
      message: 'Confirmation email sent successfully',
      email
    })
  } catch (error) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      {
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}

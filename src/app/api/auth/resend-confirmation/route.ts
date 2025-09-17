import { NextRequest, NextResponse } from 'next/server'
import { EmailConfirmationService } from '@/lib/email-confirmation-service'
import { handleApiError } from '@/lib/api-error-handler'

export async function POST(request: NextRequest) {
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

    const result = await EmailConfirmationService.resendConfirmation(email)

    if (!result.success) {
      return NextResponse.json(
        { error: { message: result.error, code: 'RESEND_FAILED' } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Confirmation email sent successfully',
      email
    })
  } catch (error) {
    return handleApiError(error)
  }
}

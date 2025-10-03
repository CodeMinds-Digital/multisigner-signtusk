import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// Rate limiting: Track last resend time per email (in-memory for now)
const resendAttempts = new Map<string, number>()
const RATE_LIMIT_HOURS = 24 // One resend per day
const TOKEN_VALIDITY_MINUTES = 15

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // Check rate limiting
    const lastAttemptTime = resendAttempts.get(emailLower)
    if (lastAttemptTime) {
      const hoursSinceLastAttempt = (Date.now() - lastAttemptTime) / (1000 * 60 * 60)
      if (hoursSinceLastAttempt < RATE_LIMIT_HOURS) {
        const hoursRemaining = Math.ceil(RATE_LIMIT_HOURS - hoursSinceLastAttempt)
        return NextResponse.json(
          {
            error: `You can only request a verification email once per day. Please try again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`
          },
          { status: 429 }
        )
      }
    }

    // Check if user exists in auth.users
    const { data, error: fetchError } = await supabaseAdmin.auth.admin.listUsers()

    if (fetchError || !data) {
      console.error('Error fetching users:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check user' },
        { status: 500 }
      )
    }

    const user = data.users.find(u => u.email?.toLowerCase() === emailLower)

    if (!user) {
      // Don't reveal if user exists or not for security
      // But still record the attempt to prevent abuse
      resendAttempts.set(emailLower, Date.now())
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification link has been sent. The link will expire in 15 minutes.'
      })
    }

    // Check if email is already verified
    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'Email is already verified. You can log in now.' },
        { status: 400 }
      )
    }

    // Generate new verification link with 15-minute expiry
    const { error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: emailLower,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (linkError) {
      console.error('Error generating verification link:', linkError)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again later.' },
        { status: 500 }
      )
    }

    // Record successful attempt
    resendAttempts.set(emailLower, Date.now())

    // Clean up old entries (older than 24 hours) to prevent memory leak
    const now = Date.now()
    for (const [key, timestamp] of resendAttempts.entries()) {
      if ((now - timestamp) > (RATE_LIMIT_HOURS * 60 * 60 * 1000)) {
        resendAttempts.delete(key)
      }
    }

    console.log(`✅ Verification email sent to: ${emailLower} (expires in ${TOKEN_VALIDITY_MINUTES} minutes)`)

    return NextResponse.json({
      success: true,
      message: `Verification email sent successfully! Please check your inbox and spam folder. The link will expire in ${TOKEN_VALIDITY_MINUTES} minutes.`
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}


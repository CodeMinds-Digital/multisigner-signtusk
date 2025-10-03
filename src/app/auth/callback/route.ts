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

/**
 * Auth Callback Handler
 * Handles email verification and redirects to dashboard
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  // Handle email verification
  if (token_hash && type) {
    try {
      // Verify the email using the token
      const { data, error } = await supabaseAdmin.auth.verifyOtp({
        token_hash,
        type: type as any
      })

      if (error) {
        console.error('Email verification error:', error)
        return NextResponse.redirect(
          new URL('/auth/error?message=Email verification failed', requestUrl.origin)
        )
      }

      if (data.user) {
        // Update user profile to mark email as verified
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ 
            email_verified: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.user.id)

        if (updateError) {
          console.error('Error updating email_verified status:', updateError)
        }

        // Check if user is corporate and needs approval
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('account_type, corporate_account_id, account_status, corporate_role')
          .eq('id', data.user.id)
          .single()

        // If corporate user with suspended status (waiting for approval)
        if (profile?.account_type === 'corporate' && profile?.account_status === 'suspended') {
          return NextResponse.redirect(
            new URL('/verify-email?status=pending_approval&verified=true', requestUrl.origin)
          )
        }

        // Redirect to dashboard for verified users
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    } catch (error) {
      console.error('Callback error:', error)
      return NextResponse.redirect(
        new URL('/auth/error?message=An error occurred', requestUrl.origin)
      )
    }
  }

  // If no token, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}


import { NextRequest, NextResponse } from 'next/server'
import { SSOService } from '@/lib/sso-service'
import { generateTokenPair } from '@/lib/jwt-utils'
import { setAuthCookies } from '@/lib/auth-cookies'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Check for OAuth errors
    if (error) {
      console.error('Zoho OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_error`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=missing_parameters`
      )
    }

    // Verify state parameter
    const storedState = request.cookies.get('oauth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=invalid_state`
      )
    }

    // Exchange code for tokens and user info
    const result = await SSOService.handleOAuthCallback('zoho', code, state)
    
    if (!result) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=oauth_callback_failed`
      )
    }

    const { user: oauthUser, session: ssoSession } = result

    // Check if user exists in our system
    let { data: existingUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', oauthUser.email)
      .single()

    if (userError && userError.code !== 'PGRST116') {
      console.error('Database error:', userError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=database_error`
      )
    }

    // Create user if doesn't exist
    if (!existingUser) {
      const newUser = {
        id: uuidv4(),
        email: oauthUser.email,
        first_name: oauthUser.first_name || '',
        last_name: oauthUser.last_name || '',
        full_name: oauthUser.display_name || `${oauthUser.first_name || ''} ${oauthUser.last_name || ''}`.trim(),
        account_type: 'personal' as const,
        email_verified: true,
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: createdUser, error: createError } = await supabaseAdmin
        .from('user_profiles')
        .insert([newUser])
        .select()
        .single()

      if (createError) {
        console.error('User creation error:', createError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/login?error=user_creation_failed`
        )
      }

      existingUser = createdUser
    }

    // Generate JWT tokens
    const sessionId = uuidv4()
    const tokens = await generateTokenPair(
      existingUser.id,
      existingUser.email,
      sessionId,
      existingUser.is_admin ? 'admin' : 'user'
    )

    // Store session
    await supabaseAdmin
      .from('user_sessions')
      .insert([{
        id: sessionId,
        user_id: existingUser.id,
        user_email: existingUser.email,
        refresh_token: tokens.refreshToken,
        user_agent: request.headers.get('user-agent') || undefined,
        ip_address: request.headers.get('x-forwarded-for') || '127.0.0.1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])

    // Set auth cookies and redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    )
    
    setAuthCookies(response, tokens.accessToken, tokens.refreshToken)
    
    // Clear OAuth state cookie
    response.cookies.delete('oauth_state')

    return response

  } catch (error) {
    console.error('Zoho OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/login?error=callback_error`
    )
  }
}

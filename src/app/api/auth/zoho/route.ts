import { NextRequest, NextResponse } from 'next/server'
import { SSOService } from '@/lib/sso-service'
import { generateTokenPair } from '@/lib/jwt-utils'
import { setAuthCookies } from '@/lib/auth-cookies'
import { supabaseAdmin } from '@/lib/supabase-admin'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'login') {
      // Check if Zoho OAuth is properly configured
      const zohoClientId = process.env.ZOHO_CLIENT_ID
      const zohoClientSecret = process.env.ZOHO_CLIENT_SECRET

      if (!zohoClientId || !zohoClientSecret ||
        zohoClientId === 'your_zoho_client_id_here' ||
        zohoClientSecret === 'your_zoho_client_secret_here') {
        return NextResponse.json(
          {
            error: 'Zoho OAuth not configured. Please use email/password + TOTP authentication instead.',
            message: 'This application uses TOTP-based authentication. Zoho OAuth is optional and not currently configured.'
          },
          { status: 400 }
        )
      }

      // Initiate Zoho OAuth flow
      const provider = await SSOService.createZohoProvider()

      if (!provider) {
        return NextResponse.json(
          { error: 'Zoho OAuth provider not configured' },
          { status: 500 }
        )
      }

      // Generate state for CSRF protection
      const state = crypto.randomBytes(32).toString('hex')

      // Store state in session or database for verification
      const response = NextResponse.redirect(
        SSOService.generateOAuthURL(provider, state)
      )

      // Set state cookie for verification
      response.cookies.set('oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600 // 10 minutes
      })

      return response
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Zoho OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'OAuth initiation failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { SSOService } from '@/lib/sso-service'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * GET /api/auth/sso/[provider]
 * Initiate SSO authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerSlug } = await params
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('org')

    // Get provider configuration
    const provider = await SSOService.getProviderBySlug(providerSlug, organizationId)

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'SSO provider not found',
          errorCode: 'SAML_CONFIG_MISSING'
        },
        { status: 404 }
      )
    }

    if (!provider.active) {
      return NextResponse.json(
        {
          success: false,
          error: 'SSO provider is not active',
          errorCode: 'SAML_CONFIG_MISSING'
        },
        { status: 403 }
      )
    }

    // Handle different SSO types
    if (provider.type === 'saml') {
      // Generate SAML request
      const { url, id } = await SSOService.generateSAMLRequest(provider)

      // Log initiation
      await SSOService.logSSOAudit(provider.id, null, 'saml_login_initiated', {
        requestId: id,
        organizationId
      })

      // Redirect to IdP
      return NextResponse.redirect(url)
    } else if (provider.type === 'oauth' || provider.type === 'oidc') {
      // Generate OAuth/OIDC authorization URL
      const { url: authUrl } = await SSOService.generateOAuthAuthorizationUrl(provider)

      // Log initiation
      await SSOService.logSSOAudit(provider.id, null, 'oauth_login_initiated', {
        organizationId
      })

      return NextResponse.redirect(authUrl)
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Unsupported SSO type',
          errorCode: 'SAML_CONFIG_MISSING'
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('SSO initiation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate SSO',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/auth/sso/[provider]
 * Handle SSO callback (ACS - Assertion Consumer Service)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerSlug } = await params
    const formData = await request.formData()
    const samlResponse = formData.get('SAMLResponse') as string
    const relayState = formData.get('RelayState') as string | undefined

    if (!samlResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing SAML response',
          errorCode: 'MISSING_PARAMS'
        },
        { status: 400 }
      )
    }

    // Get provider configuration
    const provider = await SSOService.getProviderBySlug(providerSlug)

    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'SSO provider not found',
          errorCode: 'SAML_CONFIG_MISSING'
        },
        { status: 404 }
      )
    }

    // Handle SAML response with validation
    const result = await SSOService.handleSAMLResponse(
      provider.id,
      samlResponse,
      relayState
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          errorCode: result.errorCode
        },
        { status: 400 }
      )
    }

    // Create Supabase session
    const supabase = getSupabaseClient()
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: result.user.email,
      password: result.user.id // Use user ID as password for SSO users
    })

    if (sessionError) {
      console.error('Failed to create Supabase session:', sessionError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create session',
          errorCode: 'SESSION_CREATE_FAILED'
        },
        { status: 500 }
      )
    }

    // Redirect to application with session
    const redirectUrl = relayState || process.env.NEXT_PUBLIC_APP_URL || '/'
    const response = NextResponse.redirect(redirectUrl)

    // Set session cookie
    response.cookies.set('sso_session', result.session!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error: any) {
    console.error('SSO callback error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process SSO callback',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SendPasswordService } from '@/lib/send-password-service'
import { SendEmailVerification } from '@/lib/send-email-verification'
import { AccessControlEnforcer } from '@/lib/access-control-enforcer'
import { IPGeolocationService } from '@/lib/ip-geolocation-service'
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/upstash-config'

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

// Rate limiter for password verification (5 attempts per 15 minutes)
const passwordRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'rl:password',
})

/**
 * GET /api/send/links/[linkId]
 * Verify access to a share link and return document details
 * Note: Password verification moved to POST /verify-password
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    console.log('🔍 GET request for link:', { linkId, hasEmail: !!email })

    // Fetch link details with document info
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select(`
        *,
        document:send_shared_documents(*)
      `)
      .eq('link_id', linkId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { success: false, error: 'Link not found' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { success: false, error: 'This link has been deactivated' },
        { status: 403 }
      )
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This link has expired' },
        { status: 403 }
      )
    }

    // Check view limit
    if (link.view_limit && link.view_count >= link.view_limit) {
      return NextResponse.json(
        { success: false, error: 'This link has reached its view limit' },
        { status: 403 }
      )
    }

    // Check password protection (password must be verified via POST /verify-password)
    if (link.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password required',
          requiresPassword: true,
          errorCode: 'PASSWORD_REQUIRED'
        },
        { status: 401 }
      )
    }

    // Check email verification requirement
    if (link.require_email) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email verification required',
            requiresEmail: true
          },
          { status: 401 }
        )
      }

      // Check if email is verified (get the most recent verified record)
      const { data: verifications, error: verificationError } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*')
        .eq('link_id', link.id)
        .eq('email', email)
        .eq('verified', true)
        .order('verified_at', { ascending: false })
        .limit(1)

      const verification = verifications && verifications.length > 0 ? verifications[0] : null

      if (!verification) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email not verified',
            requiresEmailVerification: true
          },
          { status: 401 }
        )
      }
    }

    // Check NDA requirement
    if (link.require_nda) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email required for NDA',
            requiresEmail: true,
            errorCode: 'EMAIL_REQUIRED'
          },
          { status: 401 }
        )
      }

      // Check if NDA is accepted
      const { data: nda } = await supabaseAdmin
        .from('send_document_ndas')
        .select('*')
        .eq('link_id', link.id)
        .eq('acceptor_email', email)
        .single()

      if (!nda) {
        return NextResponse.json(
          {
            success: false,
            error: 'NDA acceptance required',
            requiresNda: true,
            errorCode: 'NDA_REQUIRED',
            ndaText: 'By accessing this document, you agree to keep all information confidential and not share it with third parties.'
          },
          { status: 401 }
        )
      }
    }

    // Enforce access controls (email, domain, IP, country)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    let ipAddress = cfConnectingIP || realIP || forwarded?.split(',')[0] || undefined
    ipAddress = ipAddress?.trim()

    // Get geolocation for country-based controls
    let country: string | undefined
    if (ipAddress) {
      const location = await IPGeolocationService.getCachedLocation(ipAddress)
      country = location?.countryCode
    }

    // Check access controls
    const accessCheck = await AccessControlEnforcer.checkAccess(
      link.id,
      email || undefined,
      ipAddress,
      country
    )

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: accessCheck.reason || 'Access denied',
          errorCode: accessCheck.errorCode || 'ACCESS_DENIED'
        },
        { status: 403 }
      )
    }

    // Clean up filename for display (remove storage prefix)
    const cleanFileName = (fileName: string) => {
      if (!fileName) return fileName
      // Remove timestamp prefix like "1760016189209-vpudsnv1-"
      return fileName.replace(/^\d+-[a-z0-9]+-/, '')
    }

    // All checks passed - return link and document details
    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        linkId: link.link_id,
        name: link.title,
        allowDownload: link.allow_download,
        // Use consistent view count field from schema
        viewCount: link.view_count || 0,
        expiresAt: link.expires_at
      },
      document: {
        ...link.document,
        file_name: cleanFileName(link.document.file_name), // Clean filename for display
        title: link.document.title || cleanFileName(link.document.file_name) // Use clean filename as fallback title
      }
    })
  } catch (error: any) {
    console.error('Link verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to verify link access' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/send/links/[linkId]
 * Handle link actions: verify-password, send-verification, verify-code, accept-nda
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const body = await request.json()
    const { email, action, password } = body

    console.log('📧 Link action POST request:', { linkId, email, action })

    // Handle password verification
    if (action === 'verify-password') {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Password is required', errorCode: 'PASSWORD_REQUIRED' },
          { status: 400 }
        )
      }

      // Get IP address for rate limiting
      const forwarded = request.headers.get('x-forwarded-for')
      const realIP = request.headers.get('x-real-ip')
      const cfConnectingIP = request.headers.get('cf-connecting-ip')
      let ipAddress = cfConnectingIP || realIP || forwarded?.split(',')[0] || '127.0.0.1'
      ipAddress = ipAddress.trim()

      // Apply rate limiting (5 attempts per 15 minutes per IP/linkId)
      const rateLimitKey = `${ipAddress}:${linkId}`
      const { success: rateLimitOk, remaining } = await passwordRateLimiter.limit(rateLimitKey)

      if (!rateLimitOk) {
        return NextResponse.json(
          {
            success: false,
            error: 'Too many password attempts. Please try again later.',
            errorCode: 'RATE_LIMITED',
            retryAfter: 900 // 15 minutes in seconds
          },
          { status: 429 }
        )
      }

      // Get link details
      const { data: link, error: linkError } = await supabaseAdmin
        .from('send_document_links')
        .select('id, password_hash')
        .eq('link_id', linkId)
        .single()

      if (linkError || !link) {
        return NextResponse.json(
          { success: false, error: 'Link not found', errorCode: 'LINK_NOT_FOUND' },
          { status: 404 }
        )
      }

      if (!link.password_hash) {
        return NextResponse.json(
          { success: false, error: 'Link is not password protected', errorCode: 'NO_PASSWORD' },
          { status: 400 }
        )
      }

      // Verify password
      const isValid = await SendPasswordService.verifyPassword(password, link.password_hash)

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Incorrect password',
            errorCode: 'INVALID_PASSWORD',
            attemptsRemaining: remaining
          },
          { status: 401 }
        )
      }

      // Get geolocation for access control checks
      let country: string | undefined
      const location = await IPGeolocationService.getCachedLocation(ipAddress)
      country = location?.countryCode

      // Enforce access controls before granting password access
      const accessCheck = await AccessControlEnforcer.checkAccess(
        link.id,
        email || undefined,
        ipAddress,
        country
      )

      if (!accessCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: accessCheck.reason || 'Access denied',
            errorCode: accessCheck.errorCode || 'ACCESS_DENIED'
          },
          { status: 403 }
        )
      }

      // Password verified and access granted
      return NextResponse.json({
        success: true,
        message: 'Password verified successfully'
      })
    }

    if (action === 'send-verification') {
      // Get link details for document title
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('title')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        console.log('❌ Link not found in database:', linkId)
        return NextResponse.json(
          { success: false, error: 'Link not found' },
          { status: 404 }
        )
      }

      console.log('✅ Link found:', { linkId, linkTitle: link.title })

      // Check rate limiting (max 5 attempts per hour)
      const attemptCount = await SendEmailVerification.getAttemptCount(email, linkId)
      if (attemptCount >= 5) {
        return NextResponse.json(
          { success: false, error: 'Too many verification attempts. Please try again later.' },
          { status: 429 }
        )
      }

      // Send verification code
      const result = await SendEmailVerification.sendVerificationCode(email, linkId, link.title)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email'
      })
    }

    if (action === 'verify-code') {
      const { code } = body

      // Verify code using service
      const result = await SendEmailVerification.verifyCode(email, linkId, code)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully'
      })
    }

    if (action === 'resend-code') {
      // Get link details for document title
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('name')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return NextResponse.json(
          { success: false, error: 'Link not found' },
          { status: 404 }
        )
      }

      // Resend verification code
      const result = await SendEmailVerification.resendCode(email, linkId, link.name)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code resent to your email'
      })
    }

    if (action === 'accept-nda') {
      const { ndaText, ipAddress, userAgent } = body

      // Get link details
      const { data: link } = await supabaseAdmin
        .from('send_document_links')
        .select('id, document_id')
        .eq('link_id', linkId)
        .single()

      if (!link) {
        return NextResponse.json(
          { success: false, error: 'Link not found' },
          { status: 404 }
        )
      }

      // Create NDA acceptance record
      const { error: ndaError } = await supabaseAdmin
        .from('send_document_ndas')
        .insert({
          link_id: link.id,
          nda_text: ndaText,
          acceptor_name: email, // Use email as name if not provided
          acceptor_email: email,
          acceptor_ip: ipAddress,
          signature_data: null,
          accepted_at: new Date().toISOString(),
          legal_binding: true,
          user_agent: userAgent,
          nda_template_id: 'basic-nda',
          metadata: { acceptance_method: 'legacy' }
        })

      if (ndaError) {
        console.error('NDA insert error:', ndaError)
        return NextResponse.json(
          { success: false, error: 'Failed to record NDA acceptance' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'NDA accepted successfully'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Link action error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}


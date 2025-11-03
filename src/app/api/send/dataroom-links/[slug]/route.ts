import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendPasswordService } from '@/lib/send-password-service'
import { SendEmailVerification } from '@/lib/send-email-verification'
import { AccessControlEnforcer } from '@/lib/access-control-enforcer'
import { IPGeolocationService } from '@/lib/ip-geolocation-service'
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/upstash-config'

// Rate limiter for password verification (5 attempts per 15 minutes)
const passwordRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'rl:dataroom:password',
})

// GET /api/send/dataroom-links/[slug] - Get data room link details for public viewer
// Note: Password verification moved to POST /verify-password
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    console.log('🔍 Fetching data room link:', slug)

    // Get data room link details
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select(`
        *,
        data_room:send_data_rooms(
          id,
          name,
          description,
          folder_structure
        )
      `)
      .eq('slug', slug)
      .single()

    if (linkError || !link) {
      console.error('❌ Data room link not found:', linkError)
      return NextResponse.json(
        { success: false, error: 'Link not found', errorCode: 'LINK_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { success: false, error: 'Link is inactive', errorCode: 'LINK_INACTIVE' },
        { status: 403 }
      )
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Link has expired', errorCode: 'LINK_EXPIRED' },
        { status: 403 }
      )
    }

    // Check view limit
    if (link.view_limit && link.total_views >= link.view_limit) {
      return NextResponse.json(
        { success: false, error: 'View limit exceeded', errorCode: 'VIEW_LIMIT_EXCEEDED' },
        { status: 403 }
      )
    }

    // Check password protection (must be verified via POST /verify-password)
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
    if (link.access_controls?.require_email) {
      if (!email) {
        return NextResponse.json(
          {
            success: false,
            error: 'Email required',
            requiresEmail: true,
            errorCode: 'EMAIL_REQUIRED'
          },
          { status: 401 }
        )
      }

      // Check if email is verified using stable link ID
      const { data: verifications, error: verificationError } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*')
        .eq('link_id', link.id) // Use stable link.id instead of slug
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
            requiresEmailVerification: true,
            errorCode: 'EMAIL_NOT_VERIFIED'
          },
          { status: 401 }
        )
      }
    }

    // Get IP address and geolocation for access control checks
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    const cfConnectingIP = request.headers.get('cf-connecting-ip')
    let ipAddress = cfConnectingIP || realIP || forwarded?.split(',')[0] || undefined
    ipAddress = ipAddress?.trim()

    let country: string | undefined
    if (ipAddress) {
      const location = await IPGeolocationService.getCachedLocation(ipAddress)
      country = location?.countryCode
    }

    // Enforce access controls
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

    // Get documents in the data room
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('send_data_room_documents')
      .select(`
        *,
        document:send_shared_documents(
          id,
          title,
          file_url,
          file_name,
          file_type,
          file_size,
          thumbnail_url
        )
      `)
      .eq('data_room_id', link.data_room.id)
      .order('sort_order', { ascending: true })

    if (documentsError) {
      console.error('❌ Failed to fetch data room documents:', documentsError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load documents',
          errorCode: 'DOCUMENTS_FETCH_FAILED'
        },
        { status: 500 }
      )
    }

    // Increment view count
    await supabaseAdmin
      .from('send_dataroom_links')
      .update({
        total_views: (link.total_views || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', link.id)

    // Format response
    const response = {
      success: true,
      type: 'dataroom',
      link: {
        id: link.id,
        slug: link.slug,
        name: link.name,
        allowDownload: link.download_enabled,
        allowPrinting: true, // Data rooms typically allow printing
        enableWatermark: link.watermark_enabled,
        watermarkText: link.watermark_text || null,
        viewCount: (link.total_views || 0) + 1,
        expiresAt: link.expires_at,
        screenshotProtection: link.screenshot_protection
      },
      dataRoom: {
        id: link.data_room.id,
        name: link.data_room.name,
        description: link.data_room.description,
        folderStructure: link.data_room.folder_structure || {}
      },
      documents: (documents || []).map((doc: any) => ({
        id: doc.document.id,
        title: doc.document.title,
        file_url: doc.document.file_url,
        file_name: doc.document.file_name,
        file_type: doc.document.file_type,
        file_size: doc.document.file_size,
        thumbnail_url: doc.document.thumbnail_url,
        folder_path: doc.folder_path,
        sort_order: doc.sort_order
      }))
    }

    console.log('✅ Data room link data retrieved successfully')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ Get data room link error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorCode: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// POST /api/send/dataroom-links/[slug] - Handle data room link actions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { action, email, code, password } = body

    // Get data room link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('*')
      .eq('slug', slug)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { success: false, error: 'Link not found', errorCode: 'LINK_NOT_FOUND' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'verify-password':
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

        // Apply rate limiting
        const rateLimitKey = `${ipAddress}:${slug}`
        const { success: rateLimitOk, remaining } = await passwordRateLimiter.limit(rateLimitKey)

        if (!rateLimitOk) {
          return NextResponse.json(
            {
              success: false,
              error: 'Too many password attempts. Please try again later.',
              errorCode: 'RATE_LIMITED',
              retryAfter: 900
            },
            { status: 429 }
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

        // Enforce access controls
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

        return NextResponse.json({
          success: true,
          message: 'Password verified successfully'
        })

      case 'send-verification':
        if (!email) {
          return NextResponse.json(
            { success: false, error: 'Email is required', errorCode: 'EMAIL_REQUIRED' },
            { status: 400 }
          )
        }

        // Send verification email using stable link ID
        const result = await SendEmailVerification.sendDataroomVerificationCode(
          email,
          link.id,
          link.name || 'Data Room'
        )

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error || 'Failed to send verification', errorCode: 'SEND_FAILED' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Verification code sent'
        })

      case 'verify-code':
        if (!email || !code) {
          return NextResponse.json(
            { success: false, error: 'Email and code are required', errorCode: 'MISSING_PARAMS' },
            { status: 400 }
          )
        }

        // Verify code using stable link ID
        const verifyResult = await SendEmailVerification.verifyDataroomCode(email, link.id, code)

        if (!verifyResult.success) {
          return NextResponse.json(
            { success: false, error: verifyResult.error || 'Invalid verification code', errorCode: 'INVALID_CODE' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Email verified successfully'
        })

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action', errorCode: 'INVALID_ACTION' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('❌ Data room link action error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

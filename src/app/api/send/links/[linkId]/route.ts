import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SendPasswordService } from '@/lib/send-password-service'
import { SendEmailVerification } from '@/lib/send-email-verification'

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
 * GET /api/send/links/[linkId]
 * Verify access to a share link and return document details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')
    const email = searchParams.get('email')

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

    // Check password protection
    if (link.password_hash) {
      if (!password) {
        return NextResponse.json(
          {
            success: false,
            error: 'Password required',
            requiresPassword: true
          },
          { status: 401 }
        )
      }

      // Verify password using bcrypt
      const isValid = await SendPasswordService.verifyPassword(password, link.password_hash)
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Incorrect password' },
          { status: 401 }
        )
      }
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

      // Check if email is verified
      const { data: verification } = await supabaseAdmin
        .from('send_email_verifications')
        .select('*')
        .eq('link_id', link.id)
        .eq('email', email)
        .eq('verified', true)
        .single()

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
            requiresEmail: true
          },
          { status: 401 }
        )
      }

      // Check if NDA is accepted
      const { data: nda } = await supabaseAdmin
        .from('send_document_ndas')
        .select('*')
        .eq('link_id', link.id)
        .eq('signer_email', email)
        .eq('accepted', true)
        .single()

      if (!nda) {
        return NextResponse.json(
          {
            success: false,
            error: 'NDA acceptance required',
            requiresNda: true,
            ndaText: 'By accessing this document, you agree to keep all information confidential and not share it with third parties.'
          },
          { status: 401 }
        )
      }
    }

    // All checks passed - return link and document details
    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        linkId: link.link_id,
        name: link.name,
        allowDownload: link.allow_download,
        allowPrinting: link.allow_printing,
        enableWatermark: link.enable_watermark,
        watermarkText: link.watermark_text,
        viewCount: link.view_count,
        expiresAt: link.expires_at
      },
      document: link.document
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
 * POST /api/send/links/[linkId]/verify-email
 * Send email verification code
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params
    const body = await request.json()
    const { email, action } = body

    if (action === 'send-verification') {
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

      // Check rate limiting (max 5 attempts per hour)
      const attemptCount = await SendEmailVerification.getAttemptCount(email, linkId)
      if (attemptCount >= 5) {
        return NextResponse.json(
          { success: false, error: 'Too many verification attempts. Please try again later.' },
          { status: 429 }
        )
      }

      // Send verification code
      const result = await SendEmailVerification.sendVerificationCode(email, linkId, link.name)

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
          document_id: link.document_id,
          link_id: link.id,
          signer_email: email,
          nda_text: ndaText,
          accepted: true,
          accepted_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent
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


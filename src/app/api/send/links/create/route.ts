import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendPasswordService } from '@/lib/send-password-service'

export interface CreateLinkRequest {
  documentId: string
  name?: string
  password?: string
  expiresAt?: string
  allowDownload?: boolean
  allowPrinting?: boolean
  requireEmail?: boolean
  requireNda?: boolean
  enableNotifications?: boolean
  viewLimit?: number
  customSlug?: string
}

/**
 * Generate a unique short link ID
 */
function generateLinkId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}



export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Parse request body
    const body: CreateLinkRequest = await request.json()
    const {
      documentId,
      name,
      password,
      expiresAt,
      allowDownload = true,
      allowPrinting = true,
      requireEmail = false,
      requireNda = false,
      enableNotifications = true,
      viewLimit,
      customSlug
    } = body

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Generate unique link ID
    let linkId = customSlug || generateLinkId()

    // Check if link ID already exists
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('link_id', linkId)
        .single()

      if (!existing) break

      linkId = generateLinkId()
      attempts++
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Failed to generate unique link ID' },
        { status: 500 }
      )
    }

    // Hash password if provided
    let passwordHash: string | null = null
    if (password) {
      // Validate password strength
      const validation = SendPasswordService.validatePasswordStrength(password)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.errors.join(', ') },
          { status: 400 }
        )
      }

      // Check if password is compromised
      const isCompromised = await SendPasswordService.isPasswordCompromised(password)
      if (isCompromised) {
        return NextResponse.json(
          { error: 'This password is too common. Please choose a stronger password.' },
          { status: 400 }
        )
      }

      passwordHash = await SendPasswordService.hashPassword(password)
    }

    // Create link record
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .insert({
        document_id: documentId,
        link_id: linkId,
        title: name || `${document.title} - Share Link`,
        custom_slug: customSlug || null,
        password_hash: passwordHash,
        expires_at: expiresAt || null,
        max_views: viewLimit || null,
        current_views: 0,
        allow_download: allowDownload,
        require_email: requireEmail,
        require_nda: requireNda,
        require_totp: false,
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (linkError) {
      console.error('Link creation error:', linkError)
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    // Generate share URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/v/${linkId}`

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        linkId: link.link_id,
        name: link.title,
        shareUrl,
        expiresAt: link.expires_at,
        isActive: link.is_active,
        createdAt: link.created_at
      }
    })

  } catch (error: any) {
    console.error('Create link error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve links for a document
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    // Verify document ownership
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Fetch links
    const { data: links, error: fetchError } = await supabaseAdmin
      .from('send_document_links')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch links error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch links' },
        { status: 500 }
      )
    }

    // Add share URLs to links
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const linksWithUrls = links.map(link => ({
      ...link,
      shareUrl: `${baseUrl}/v/${link.link_id}`
    }))

    return NextResponse.json({
      success: true,
      links: linksWithUrls
    })

  } catch (error: any) {
    console.error('Fetch links error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


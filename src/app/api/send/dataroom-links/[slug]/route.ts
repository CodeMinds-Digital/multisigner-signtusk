import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendPasswordService } from '@/lib/send-password-service'
import { SendEmailVerification } from '@/lib/send-email-verification'

// GET /api/send/dataroom-links/[slug] - Get data room link details for public viewer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const password = searchParams.get('password')
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
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!link.is_active) {
      return NextResponse.json(
        { error: 'Link is inactive' },
        { status: 403 }
      )
    }

    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Link has expired' },
        { status: 403 }
      )
    }

    // Check view limit
    if (link.view_limit && link.total_views >= link.view_limit) {
      return NextResponse.json(
        { error: 'View limit exceeded' },
        { status: 403 }
      )
    }

    // Check password protection
    if (link.password_hash) {
      if (!password) {
        return NextResponse.json(
          {
            error: 'Password required',
            requiresPassword: true
          },
          { status: 401 }
        )
      }

      const isValidPassword = await SendPasswordService.verifyPassword(password, link.password_hash)
      if (!isValidPassword) {
        return NextResponse.json(
          {
            error: 'Invalid password',
            requiresPassword: true
          },
          { status: 401 }
        )
      }
    }

    // Check email verification requirement
    if (link.access_controls?.require_email) {
      if (!email) {
        return NextResponse.json(
          {
            error: 'Email required',
            requiresEmail: true
          },
          { status: 401 }
        )
      }

      // Check if email is verified (implementation depends on your verification system)
      // For now, we'll assume email verification is handled separately
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
        { error: 'Failed to load documents' },
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/dataroom-links/[slug] - Handle data room link actions (email verification, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { action, email, code } = body

    // Get data room link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('*')
      .eq('slug', slug)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'send-verification':
        if (!email) {
          return NextResponse.json(
            { error: 'Email is required' },
            { status: 400 }
          )
        }

        // Send verification email (adapt from single document implementation)
        const result = await SendEmailVerification.sendVerificationCode(
          email,
          slug,
          link.name || 'Data Room'
        )

        if (!result.success) {
          return NextResponse.json(
            { error: result.error || 'Failed to send verification' },
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
            { error: 'Email and code are required' },
            { status: 400 }
          )
        }

        const verifyResult = await SendEmailVerification.verifyCode(email, slug, code)

        if (!verifyResult.success) {
          return NextResponse.json(
            { error: verifyResult.error || 'Invalid verification code' },
            { status: 400 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Email verified successfully'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error: any) {
    console.error('❌ Data room link action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

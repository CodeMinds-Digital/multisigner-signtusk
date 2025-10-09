import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/documents/content/[linkId]
 * Proxy to serve document content for the public viewer
 * This avoids CORS issues when fetching documents directly from storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> }
) {
  try {
    const { linkId } = await params

    console.log('🔍 Fetching document content for link:', linkId)

    // Get link and document details
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select(`
        *,
        document:send_shared_documents(*)
      `)
      .eq('link_id', linkId)
      .single()

    if (linkError || !link) {
      console.error('❌ Link not found:', linkError)
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

    const document = link.document
    if (!document?.file_url) {
      return NextResponse.json(
        { error: 'Document file not found' },
        { status: 404 }
      )
    }

    console.log('📄 Document found:', {
      id: document.id,
      title: document.title,
      file_url: document.file_url
    })

    // Extract file path from URL for storage access
    let filePath = document.file_url

    // If it's a full Supabase URL, extract the path
    if (filePath.includes('/storage/v1/object/public/send-documents/')) {
      const parts = filePath.split('/storage/v1/object/public/send-documents/')
      if (parts.length > 1) {
        filePath = parts[1]
      }
    } else if (filePath.includes('send-documents/')) {
      // Handle relative paths
      const parts = filePath.split('send-documents/')
      if (parts.length > 1) {
        filePath = parts[1]
      }
    }

    console.log('📁 Extracted file path:', filePath)

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('send-documents')
      .download(filePath)

    if (downloadError || !fileData) {
      console.error('❌ Failed to download file:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download document' },
        { status: 500 }
      )
    }

    console.log('✅ File downloaded successfully, size:', fileData.size)

    // For PDFs, return a signed URL for iframe usage (works with private buckets)
    const fileType = document.file_type || 'application/pdf'

    if (fileType.includes('pdf')) {
      // For PDFs, create a signed URL for iframe display (24 hour expiry)
      const { data: urlData, error: urlError } = await supabaseAdmin.storage
        .from('send-documents')
        .createSignedUrl(filePath, 86400) // 24 hours

      if (urlData?.signedUrl && !urlError) {
        console.log('✅ PDF signed URL generated (24h expiry):', urlData.signedUrl)
        return NextResponse.json({
          success: true,
          data: {
            url: urlData.signedUrl,
            fileName: document.file_name,
            fileType: document.file_type,
            fileSize: fileData.size
          }
        })
      } else {
        console.error('❌ Failed to create signed URL:', urlError)
      }
    }

    // For other file types, convert to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${fileType};base64,${base64}`

    console.log('✅ Document converted to base64, length:', base64.length)

    return NextResponse.json({
      success: true,
      data: {
        base64: dataUrl,
        url: dataUrl, // Also provide as URL for consistency
        fileName: document.file_name,
        fileType: document.file_type,
        fileSize: fileData.size
      }
    })

  } catch (error: any) {
    console.error('❌ Error serving document content:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

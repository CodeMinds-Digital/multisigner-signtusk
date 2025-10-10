import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/dataroom-documents/content/[linkId]/[documentId]
 * Proxy to serve document content for data room documents in the public viewer
 * This avoids CORS issues when fetching documents directly from storage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string; documentId: string }> }
) {
  try {
    const { linkId, documentId } = await params

    console.log('🔍 Fetching data room document content:', { linkId, documentId })

    // First verify the data room link exists and is accessible
    const { data: dataRoomLink, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('*')
      .eq('slug', linkId)
      .single()

    if (linkError || !dataRoomLink) {
      console.error('❌ Data room link not found:', linkError)
      return NextResponse.json(
        { error: 'Data room link not found' },
        { status: 404 }
      )
    }

    // Check if link is active
    if (!dataRoomLink.is_active) {
      return NextResponse.json(
        { error: 'Data room link is inactive' },
        { status: 403 }
      )
    }

    // Check expiry
    if (dataRoomLink.expires_at && new Date(dataRoomLink.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Data room link has expired' },
        { status: 403 }
      )
    }

    // Check view limit
    if (dataRoomLink.view_limit && dataRoomLink.total_views >= dataRoomLink.view_limit) {
      return NextResponse.json(
        { error: 'View limit exceeded' },
        { status: 403 }
      )
    }

    // Verify the document exists in this data room
    const { data: dataRoomDocument, error: docError } = await supabaseAdmin
      .from('send_data_room_documents')
      .select(`
        *,
        document:send_shared_documents(*)
      `)
      .eq('data_room_id', dataRoomLink.data_room_id)
      .eq('document_id', documentId)
      .single()

    if (docError || !dataRoomDocument) {
      console.error('❌ Document not found in data room:', docError)
      return NextResponse.json(
        { error: 'Document not found in this data room' },
        { status: 404 }
      )
    }

    const document = dataRoomDocument.document

    console.log('📄 Document found:', {
      id: document.id,
      title: document.title,
      file_url: document.file_url
    })

    // Extract file path from the file_url
    const fileUrl = document.file_url
    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Document file URL not found' },
        { status: 404 }
      )
    }

    // Extract the file path from the URL
    // URL format: https://project.supabase.co/storage/v1/object/public/send-documents/path/to/file
    const urlParts = fileUrl.split('/send-documents/')
    if (urlParts.length < 2) {
      console.error('❌ Invalid file URL format:', fileUrl)
      return NextResponse.json(
        { error: 'Invalid file URL format' },
        { status: 400 }
      )
    }

    const filePath = urlParts[1]
    console.log('📁 Extracted file path:', filePath)

    // Check if the bucket is private or public
    const { data: bucketInfo } = await supabaseAdmin.storage
      .getBucket('send-documents')

    if (bucketInfo?.public) {
      // For public buckets, return the direct URL
      console.log('✅ PDF public URL generated:', fileUrl)
      return NextResponse.json({
        success: true,
        url: fileUrl,
        title: document.title,
        fileType: document.file_type,
        fileSize: document.file_size
      })
    } else {
      // For private buckets, generate a signed URL
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from('send-documents')
        .createSignedUrl(filePath, 24 * 60 * 60) // 24 hours

      if (signedUrlError) {
        console.error('❌ Failed to generate signed URL:', signedUrlError)
        return NextResponse.json(
          { error: 'Failed to generate document access URL' },
          { status: 500 }
        )
      }

      console.log('✅ PDF signed URL generated (24h expiry)')
      return NextResponse.json({
        success: true,
        url: signedUrlData.signedUrl,
        title: document.title,
        fileType: document.file_type,
        fileSize: document.file_size
      })
    }

  } catch (error: any) {
    console.error('❌ Data room document content error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

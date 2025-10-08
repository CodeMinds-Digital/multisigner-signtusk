import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
]

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

    console.log('🔐 Upload auth check:', {
      hasUser: !!userId,
      userId: userId
    })

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const documentId = formData.get('documentId') as string // For versioning
    const versionNotes = formData.get('versionNotes') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 400 }
      )
    }

    // Generate unique identifiers (same as Sign module)
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const uniqueId = Math.random().toString(36).substring(2, 10)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const uniqueFileName = `${timestamp}-${uniqueId}-${sanitizedName}`

    // Upload file to send-documents bucket (Send module bucket)
    // Path structure: {userId}/{filename} - required by RLS policies
    const filePath = `${userId}/${uniqueFileName}`

    const { data: fileDetails, error: uploadError } = await supabaseAdmin.storage
      .from('send-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('send-documents')
      .getPublicUrl(fileDetails.path)

    const fileUrl = publicUrlData.publicUrl

    console.log('✅ File uploaded to send-documents:', { path: fileDetails.path, url: fileUrl })

    // Determine file category
    let fileCategory = 'document'
    if (file.type.startsWith('image/')) {
      fileCategory = 'image'
    } else if (file.type.includes('pdf')) {
      fileCategory = 'pdf'
    } else if (file.type.includes('word')) {
      fileCategory = 'word'
    } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
      fileCategory = 'powerpoint'
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      fileCategory = 'excel'
    }

    // Create document record in send_shared_documents table (Send module table)
    let documentData: any = {
      user_id: userId,
      title: file.name, // Keep original filename as title for display
      file_name: uniqueFileName, // Store unique filename for storage reference
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type,
      status: 'active',
      created_by: userId
    }

    // If this is a new version of an existing document
    if (documentId) {
      // Verify user owns the original document
      const { data: originalDoc, error: verifyError } = await supabaseAdmin
        .from('send_shared_documents')
        .select('id, title, parent_document_id')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single()

      if (verifyError || !originalDoc) {
        return NextResponse.json(
          { error: 'Original document not found or access denied' },
          { status: 404 }
        )
      }

      // Set up versioning data
      documentData.parent_document_id = originalDoc.parent_document_id || documentId
      documentData.title = originalDoc.title // Keep original title
      documentData.version_notes = versionNotes
    } else {
      // New document (not a version)
      documentData.version_number = 1
      documentData.is_primary = true
    }

    const { data: document, error: dbError } = await supabaseAdmin
      .from('send_shared_documents')
      .insert(documentData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)

      // Clean up uploaded file from send-documents bucket
      try {
        await supabaseAdmin.storage
          .from('send-documents')
          .remove([fileDetails.path])
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError)
      }

      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    console.log('✅ Document created:', document.id)

    // Create version history record
    const { error: historyError } = await supabaseAdmin
      .from('send_document_versions')
      .insert({
        document_id: document.id,
        version_number: document.version_number,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        version_notes: versionNotes || (documentId ? 'New version uploaded' : 'Initial version'),
        created_by: userId
      })

    if (historyError) {
      console.error('Version history creation error:', historyError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        file_name: document.file_name,
        file_type: document.file_type,
        file_size: document.file_size,
        file_url: document.file_url,
        version_number: document.version_number,
        is_primary: document.is_primary,
        created_at: document.created_at
      },
      fileUrl // Return fileUrl for version creation API
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's documents
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'active'

    // Fetch documents (only primary versions by default)
    const showAllVersions = searchParams.get('all_versions') === 'true'

    let query = supabaseAdmin
      .from('send_shared_documents')
      .select('*')
      .eq('user_id', userId)
      .eq('status', status)

    // Only show primary versions unless explicitly requested
    if (!showAllVersions) {
      query = query.eq('is_primary', true)
    }

    const { data: documents, error: fetchError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    })

  } catch (error: any) {
    console.error('Fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


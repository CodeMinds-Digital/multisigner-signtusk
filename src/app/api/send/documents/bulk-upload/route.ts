import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BulkUploadResult {
  success: boolean
  totalFiles: number
  uploaded: number
  failed: number
  errors: string[]
  documents: any[]
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const folderId = formData.get('folderId') as string | null
    const createLinks = formData.get('createLinks') === 'true'
    const linkSettings = formData.get('linkSettings') ? JSON.parse(formData.get('linkSettings') as string) : null

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    const result: BulkUploadResult = {
      success: true,
      totalFiles: files.length,
      uploaded: 0,
      failed: 0,
      errors: [],
      documents: []
    }

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Validate file
        if (!file.name || file.size === 0) {
          throw new Error('Invalid file')
        }

        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error('File size exceeds 50MB limit')
        }

        // Generate unique file path
        const timestamp = Date.now()
        const uniqueId = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}-${uniqueId}.${fileExtension}`
        const filePath = `${userId}/${fileName}`

        // Upload to Supabase Storage
        const { data: fileDetails, error: uploadError } = await supabaseAdmin.storage
          .from('send-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type
          })

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('send-documents')
          .getPublicUrl(filePath)

        // Create document record
        const documentData = {
          user_id: userId,
          title: file.name, // Keep original filename as title for display
          file_name: fileName, // Store unique filename for storage reference
          file_url: publicUrl,
          file_size: file.size,
          file_type: file.type,
          folder_id: folderId,
          status: 'active',
          version_number: 1,
          is_primary: true, // Fix column name to match schema
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data: document, error: dbError } = await supabaseAdmin
          .from('send_shared_documents')
          .insert(documentData)
          .select()
          .single()

        if (dbError) {
          // Clean up uploaded file if database insert fails
          await supabaseAdmin.storage
            .from('send-documents')
            .remove([filePath])
          throw new Error(`Database error: ${dbError.message}`)
        }

        result.uploaded++
        result.documents.push({
          ...document,
          uploadIndex: i,
          fileName: file.name
        })

        // Create share link if requested
        if (createLinks && linkSettings) {
          try {
            const linkData = {
              document_id: document.id,
              user_id: userId,
              name: `${document.title} - Shared Link`,
              slug: `${document.id}-${Date.now()}`,
              password_protected: linkSettings.password_protected || false,
              password: linkSettings.password || null,
              expires_at: linkSettings.expires_at || null,
              allow_download: linkSettings.allow_download !== false,
              allow_print: linkSettings.allow_print !== false,
              watermark_enabled: linkSettings.watermark_enabled || false,
              screenshot_protection: linkSettings.screenshot_protection || false,
              email_required: linkSettings.email_required || false,
              email_verification_required: linkSettings.email_verification_required || false,
              nda_required: linkSettings.nda_required || false,
              view_limit: linkSettings.view_limit || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            const { data: link, error: linkError } = await supabaseAdmin
              .from('send_document_links')
              .insert(linkData)
              .select()
              .single()

            if (!linkError) {
              // Add link info to document result
              result.documents[result.documents.length - 1].shareLink = {
                id: link.id,
                slug: link.slug,
                url: `/v/${link.slug}`
              }
            }
          } catch (linkError) {
            // Don't fail the entire upload if link creation fails
            console.error('Failed to create share link:', linkError)
          }
        }

      } catch (error) {
        result.failed++
        result.errors.push(`File "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.documents.push({
          uploadIndex: i,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        })
      }
    }

    result.success = result.failed === 0

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check upload limits and settings
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get user's current document count and storage usage
    const { data: stats, error } = await supabaseAdmin
      .rpc('get_user_storage_stats', { user_id: userId })

    if (error) {
      console.error('Error getting storage stats:', error)
    }

    const limits = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFilesPerUpload: 20,
      allowedTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ],
      currentUsage: stats || {
        document_count: 0,
        total_size: 0,
        storage_limit: 5 * 1024 * 1024 * 1024 // 5GB default
      }
    }

    return NextResponse.json({
      success: true,
      limits
    })

  } catch (error) {
    console.error('Get upload limits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * POST /api/send/documents/bulk-folder-upload
 * Upload multiple files preserving folder structure
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', errorCode: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const paths = formData.getAll('paths') as string[]
    const dataRoomId = formData.get('dataRoomId') as string | null

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided', errorCode: 'NO_FILES' },
        { status: 400 }
      )
    }

    if (files.length !== paths.length) {
      return NextResponse.json(
        { success: false, error: 'Files and paths count mismatch', errorCode: 'MISMATCH' },
        { status: 400 }
      )
    }

    const results: Array<{
      path: string
      success: boolean
      documentId?: number
      error?: string
    }> = []

    // Process files in batches of 10
    const batchSize = 10
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      const batchPaths = paths.slice(i, i + batchSize)

      const batchPromises = batch.map(async (file, index) => {
        const relativePath = batchPaths[index]
        const pathParts = relativePath.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const folderPath = pathParts.slice(0, -1).join('/')

        try {
          // Upload to Supabase Storage
          const fileExt = fileName.split('.').pop()
          const timestamp = Date.now()
          const storagePath = `${user.id}/${timestamp}-${fileName}`

          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('send-documents')
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false
            })

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`)
          }

          // Get public URL
          const { data: urlData } = supabaseAdmin.storage
            .from('send-documents')
            .getPublicUrl(storagePath)

          // Create document record
          const { data: document, error: dbError } = await supabaseAdmin
            .from('send_shared_documents')
            .insert({
              user_id: user.id,
              title: fileName,
              file_name: fileName,
              file_type: file.type,
              file_size: file.size,
              file_url: urlData.publicUrl,
              storage_path: storagePath,
              folder_path: folderPath || null,
              data_room_id: dataRoomId ? parseInt(dataRoomId) : null,
              is_primary_version: true,
              version_number: 1
            })
            .select()
            .single()

          if (dbError) {
            throw new Error(`Database error: ${dbError.message}`)
          }

          return {
            path: relativePath,
            success: true,
            documentId: document.id
          }
        } catch (error) {
          console.error(`Failed to upload ${relativePath}:`, error)
          return {
            path: relativePath,
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Uploaded ${successCount} files, ${failureCount} failed`,
      results,
      stats: {
        total: files.length,
        success: successCount,
        failed: failureCount
      }
    })
  } catch (error) {
    console.error('Bulk folder upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload files', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}


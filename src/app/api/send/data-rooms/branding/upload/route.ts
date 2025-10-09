import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/send/data-rooms/branding/upload - Upload branding assets
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
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const dataRoomId = formData.get('dataRoomId') as string

    if (!file || !type || !dataRoomId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', dataRoomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.' },
        { status: 400 }
      )
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop()
    const fileName = `${type}_${timestamp}_${randomString}.${fileExtension}`
    
    // Create storage path
    const storagePath = `data-rooms/${dataRoomId}/branding/${fileName}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('send-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('send-documents')
      .getPublicUrl(storagePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get file URL' },
        { status: 500 }
      )
    }

    // Log the upload
    await supabaseAdmin
      .from('send_analytics_events')
      .insert({
        user_id: userId,
        event_type: 'branding_asset_upload',
        event_data: {
          data_room_id: dataRoomId,
          asset_type: type,
          file_name: fileName,
          file_size: file.size,
          file_type: file.type
        }
      })

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName,
      fileSize: file.size,
      fileType: file.type
    })

  } catch (error: any) {
    console.error('Upload branding asset error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

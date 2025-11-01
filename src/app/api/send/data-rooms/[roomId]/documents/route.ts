import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AddDocumentsRequest {
  document_ids: string[]
  folder_path?: string
}

/**
 * POST /api/send/data-rooms/[roomId]/documents
 * Add documents to a data room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

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
    const body: AddDocumentsRequest = await request.json()
    const { document_ids, folder_path = '/' } = body

    if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      )
    }

    // Verify data room ownership
    const { data: dataRoom, error: dataRoomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id, user_id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataRoomError || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found or access denied' },
        { status: 404 }
      )
    }

    // Verify document ownership
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id')
      .in('id', document_ids)
      .eq('user_id', userId)

    if (documentsError) {
      console.error('Documents verification error:', documentsError)
      return NextResponse.json(
        { error: 'Failed to verify documents' },
        { status: 500 }
      )
    }

    if (!documents || documents.length !== document_ids.length) {
      return NextResponse.json(
        { error: 'Some documents not found or access denied' },
        { status: 404 }
      )
    }

    // Check for existing documents in the data room
    const { data: existingDocs, error: existingError } = await supabaseAdmin
      .from('send_data_room_documents')
      .select('document_id')
      .eq('data_room_id', roomId)
      .in('document_id', document_ids)

    if (existingError) {
      console.error('Existing documents check error:', existingError)
      return NextResponse.json(
        { error: 'Failed to check existing documents' },
        { status: 500 }
      )
    }

    // Filter out documents that are already in the data room
    const existingDocIds = existingDocs?.map(doc => doc.document_id) || []
    const newDocumentIds = document_ids.filter(id => !existingDocIds.includes(id))

    if (newDocumentIds.length === 0) {
      return NextResponse.json(
        { error: 'All documents are already in this data room' },
        { status: 400 }
      )
    }

    // Add documents to data room
    const documentsToAdd = newDocumentIds.map((documentId, index) => ({
      data_room_id: roomId,
      document_id: documentId,
      folder_path: folder_path,
      sort_order: index
    }))

    const { data: addedDocuments, error: addError } = await supabaseAdmin
      .from('send_data_room_documents')
      .insert(documentsToAdd)
      .select(`
        *,
        document:send_shared_documents(*)
      `)

    if (addError) {
      console.error('Add documents error:', addError)
      return NextResponse.json(
        { error: 'Failed to add documents to data room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      added_documents: addedDocuments,
      added_count: newDocumentIds.length,
      skipped_count: existingDocIds.length,
      message: `Added ${newDocumentIds.length} document(s) to data room${existingDocIds.length > 0 ? `, skipped ${existingDocIds.length} already existing` : ''}`
    })

  } catch (error: any) {
    console.error('Add documents to data room error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/send/data-rooms/[roomId]/documents
 * Remove documents from a data room
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params

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

    // Get document IDs from query params
    const { searchParams } = new URL(request.url)
    const documentIds = searchParams.get('document_ids')?.split(',') || []

    if (documentIds.length === 0) {
      return NextResponse.json(
        { error: 'Document IDs are required' },
        { status: 400 }
      )
    }

    // Verify data room ownership
    const { data: dataRoom, error: dataRoomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id, user_id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataRoomError || !dataRoom) {
      return NextResponse.json(
        { error: 'Data room not found or access denied' },
        { status: 404 }
      )
    }

    // Remove documents from data room
    const { error: deleteError } = await supabaseAdmin
      .from('send_data_room_documents')
      .delete()
      .eq('data_room_id', roomId)
      .in('document_id', documentIds)

    if (deleteError) {
      console.error('Remove documents error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove documents from data room' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      removed_count: documentIds.length,
      message: `Removed ${documentIds.length} document(s) from data room`
    })

  } catch (error: any) {
    console.error('Remove documents from data room error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

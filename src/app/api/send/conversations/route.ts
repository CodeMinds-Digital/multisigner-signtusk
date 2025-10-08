import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/conversations - Get conversations for user's documents
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

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('document_id')
    const dataroomId = searchParams.get('dataroom_id')
    const conversationType = searchParams.get('type')

    // Build query for conversations
    let query = supabaseAdmin
      .from('send_conversations')
      .select(`
        *,
        document:send_shared_documents(id, title),
        dataroom:send_data_rooms(id, name),
        participant_count:send_conversation_participants(count),
        message_count:send_conversation_messages(count)
      `)

    // Filter by user's documents or datarooms
    if (documentId) {
      query = query.eq('document_id', documentId)
    } else if (dataroomId) {
      query = query.eq('data_room_id', dataroomId)
    } else {
      // Get all conversations for user's documents and datarooms
      const { data: userDocuments } = await supabaseAdmin
        .from('send_shared_documents')
        .select('id')
        .eq('user_id', userId)

      const { data: userDatarooms } = await supabaseAdmin
        .from('send_data_rooms')
        .select('id')
        .eq('user_id', userId)

      const documentIds = userDocuments?.map(d => d.id) || []
      const dataroomIds = userDatarooms?.map(d => d.id) || []

      if (documentIds.length === 0 && dataroomIds.length === 0) {
        return NextResponse.json({
          success: true,
          conversations: []
        })
      }

      query = query.or(`document_id.in.(${documentIds.join(',')}),data_room_id.in.(${dataroomIds.join(',')})`)
    }

    if (conversationType) {
      query = query.eq('conversation_type', conversationType)
    }

    const { data: conversations, error } = await query
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching conversations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversations: conversations || []
    })

  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/conversations - Create new conversation
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

    const body = await request.json()
    const {
      document_id,
      data_room_id,
      link_id,
      title,
      description,
      conversation_type = 'document',
      is_public = false,
      allow_anonymous = true,
      require_approval = false
    } = body

    // Validate required fields
    if (!document_id && !data_room_id) {
      return NextResponse.json(
        { error: 'Either document_id or data_room_id is required' },
        { status: 400 }
      )
    }

    // Verify user owns the document or dataroom
    if (document_id) {
      const { data: document, error: docError } = await supabaseAdmin
        .from('send_shared_documents')
        .select('id')
        .eq('id', document_id)
        .eq('user_id', userId)
        .single()

      if (docError || !document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        )
      }
    }

    if (data_room_id) {
      const { data: dataroom, error: dataroomError } = await supabaseAdmin
        .from('send_data_rooms')
        .select('id')
        .eq('id', data_room_id)
        .eq('user_id', userId)
        .single()

      if (dataroomError || !dataroom) {
        return NextResponse.json(
          { error: 'Dataroom not found' },
          { status: 404 }
        )
      }
    }

    // Create conversation
    const { data: conversation, error: createError } = await supabaseAdmin
      .from('send_conversations')
      .insert({
        document_id: document_id || null,
        data_room_id: data_room_id || null,
        link_id: link_id || null,
        title: title?.trim() || null,
        description: description?.trim() || null,
        conversation_type,
        is_public,
        allow_anonymous,
        require_approval,
        created_by: userId
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating conversation:', createError)
      return NextResponse.json(
        { error: 'Failed to create conversation' },
        { status: 500 }
      )
    }

    // Add creator as owner participant
    const { error: participantError } = await supabaseAdmin
      .from('send_conversation_participants')
      .insert({
        conversation_id: conversation.id,
        user_id: userId,
        display_name: 'Document Owner', // This should be replaced with actual user name
        role: 'owner',
        can_send_messages: true,
        can_edit_messages: true,
        can_delete_messages: true
      })

    if (participantError) {
      console.error('Error adding conversation participant:', participantError)
      // Don't fail the conversation creation, just log the error
    }

    return NextResponse.json({
      success: true,
      conversation
    })

  } catch (error) {
    console.error('Create conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

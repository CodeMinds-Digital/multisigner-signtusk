import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/conversations/[id] - Get conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get conversation details using the custom function
    const { data: conversationDetails, error: detailsError } = await supabaseAdmin
      .rpc('get_conversation_details', { conversation_id_param: id })

    if (detailsError || !conversationDetails || conversationDetails.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = conversationDetails[0]

    // Get participants
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('send_conversation_participants')
      .select('*')
      .eq('conversation_id', id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true })

    if (participantsError) {
      console.error('Error fetching participants:', participantsError)
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      )
    }

    // Get recent messages using the custom function
    const { data: messages, error: messagesError } = await supabaseAdmin
      .rpc('get_conversation_messages', {
        conversation_id_param: id,
        limit_param: 50,
        offset_param: 0
      })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        participants: participants || [],
        recent_messages: messages || []
      }
    })

  } catch (error) {
    console.error('Get conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/conversations/[id] - Update conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the conversation
    const { data: conversation, error: verifyError } = await supabaseAdmin
      .from('send_conversations')
      .select(`
        id,
        document:send_shared_documents!inner(user_id),
        dataroom:send_data_rooms!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (verifyError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if user owns the document or dataroom
    const hasAccess =
      (conversation.document && (conversation.document as any).user_id === userId) ||
      (conversation.dataroom && (conversation.dataroom as any).user_id === userId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      is_active,
      is_public,
      allow_anonymous,
      require_approval,
      auto_close_after_days
    } = body

    // Update conversation
    const updateData: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updateData.title = title?.trim() || null
    if (description !== undefined) updateData.description = description?.trim() || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (is_public !== undefined) updateData.is_public = is_public
    if (allow_anonymous !== undefined) updateData.allow_anonymous = allow_anonymous
    if (require_approval !== undefined) updateData.require_approval = require_approval
    if (auto_close_after_days !== undefined) updateData.auto_close_after_days = auto_close_after_days

    const { data: updatedConversation, error: updateError } = await supabaseAdmin
      .from('send_conversations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating conversation:', updateError)
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    })

  } catch (error) {
    console.error('Update conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/conversations/[id] - Delete conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the conversation
    const { data: conversation, error: verifyError } = await supabaseAdmin
      .from('send_conversations')
      .select(`
        id,
        document:send_shared_documents!inner(user_id),
        dataroom:send_data_rooms!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (verifyError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if user owns the document or dataroom
    const hasAccess =
      (conversation.document && (conversation.document as any).user_id === userId) ||
      (conversation.dataroom && (conversation.dataroom as any).user_id === userId)

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Soft delete conversation (set is_active to false)
    const { error: deleteError } = await supabaseAdmin
      .from('send_conversations')
      .update({
        is_active: false,
        closed_at: new Date().toISOString(),
        closed_by: userId
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Delete conversation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

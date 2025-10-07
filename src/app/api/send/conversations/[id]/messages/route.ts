import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/conversations/[id]/messages - Get messages for conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const threadId = searchParams.get('thread_id')

    // Get messages using the custom function
    let messages
    if (threadId) {
      // Get threaded messages
      const { data, error } = await supabaseAdmin
        .from('send_conversation_messages')
        .select(`
          *,
          participant:send_conversation_participants(
            id, display_name, avatar_url, role
          ),
          reactions:send_message_reactions(
            id, emoji, reaction_type,
            participant:send_conversation_participants(display_name)
          ),
          reply_to:send_conversation_messages(
            id, message_text,
            participant:send_conversation_participants(display_name)
          )
        `)
        .eq('conversation_id', id)
        .eq('thread_id', threadId)
        .eq('is_deleted', false)
        .eq('is_approved', true)
        .order('sent_at', { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error fetching threaded messages:', error)
        return NextResponse.json(
          { error: 'Failed to fetch messages' },
          { status: 500 }
        )
      }

      messages = data
    } else {
      // Get main conversation messages
      const { data, error } = await supabaseAdmin
        .rpc('get_conversation_messages', {
          conversation_id_param: id,
          limit_param: limit,
          offset_param: offset
        })

      if (error) {
        console.error('Error fetching messages:', error)
        return NextResponse.json(
          { error: 'Failed to fetch messages' },
          { status: 500 }
        )
      }

      messages = data
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      has_more: messages && messages.length === limit
    })

  } catch (error) {
    console.error('Get messages API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/conversations/[id]/messages - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      message_text,
      message_type = 'text',
      participant_id,
      reply_to_id,
      thread_id,
      file_url,
      file_name,
      file_size,
      file_type,
      session_id,
      viewer_email,
      display_name
    } = body

    if (!message_text?.trim() && message_type === 'text') {
      return NextResponse.json(
        { error: 'Message text is required' },
        { status: 400 }
      )
    }

    // Verify conversation exists and is active
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('send_conversations')
      .select('id, is_active, allow_anonymous, require_approval')
      .eq('id', id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!conversation.is_active) {
      return NextResponse.json(
        { error: 'Conversation is closed' },
        { status: 400 }
      )
    }

    let participantId = participant_id

    // If no participant_id provided, create or find participant
    if (!participantId) {
      if (!conversation.allow_anonymous && !viewer_email) {
        return NextResponse.json(
          { error: 'Authentication required for this conversation' },
          { status: 401 }
        )
      }

      // Find or create participant
      let participant
      if (viewer_email) {
        const { data: existingParticipant } = await supabaseAdmin
          .from('send_conversation_participants')
          .select('id')
          .eq('conversation_id', id)
          .eq('viewer_email', viewer_email)
          .single()

        if (existingParticipant) {
          participant = existingParticipant
        } else {
          const { data: newParticipant, error: participantError } = await supabaseAdmin
            .from('send_conversation_participants')
            .insert({
              conversation_id: id,
              viewer_email,
              display_name: display_name || viewer_email.split('@')[0],
              role: 'participant'
            })
            .select()
            .single()

          if (participantError) {
            console.error('Error creating participant:', participantError)
            return NextResponse.json(
              { error: 'Failed to create participant' },
              { status: 500 }
            )
          }

          participant = newParticipant
        }
      } else if (session_id) {
        const { data: existingParticipant } = await supabaseAdmin
          .from('send_conversation_participants')
          .select('id')
          .eq('conversation_id', id)
          .eq('session_id', session_id)
          .single()

        if (existingParticipant) {
          participant = existingParticipant
        } else {
          const { data: newParticipant, error: participantError } = await supabaseAdmin
            .from('send_conversation_participants')
            .insert({
              conversation_id: id,
              session_id,
              display_name: display_name || 'Anonymous User',
              role: 'participant'
            })
            .select()
            .single()

          if (participantError) {
            console.error('Error creating participant:', participantError)
            return NextResponse.json(
              { error: 'Failed to create participant' },
              { status: 500 }
            )
          }

          participant = newParticipant
        }
      } else {
        return NextResponse.json(
          { error: 'Participant identification required' },
          { status: 400 }
        )
      }

      participantId = participant.id
    }

    // Verify participant can send messages
    const { data: participant, error: participantError } = await supabaseAdmin
      .from('send_conversation_participants')
      .select('can_send_messages, is_muted')
      .eq('id', participantId)
      .eq('conversation_id', id)
      .single()

    if (participantError || !participant) {
      return NextResponse.json(
        { error: 'Participant not found' },
        { status: 404 }
      )
    }

    if (!participant.can_send_messages || participant.is_muted) {
      return NextResponse.json(
        { error: 'You do not have permission to send messages' },
        { status: 403 }
      )
    }

    // Create message
    const messageData: any = {
      conversation_id: id,
      participant_id: participantId,
      message_text: message_text?.trim() || '',
      message_type,
      reply_to_id: reply_to_id || null,
      thread_id: thread_id || null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_type: file_type || null,
      requires_approval: conversation.require_approval,
      is_approved: !conversation.require_approval
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('send_conversation_messages')
      .insert(messageData)
      .select(`
        *,
        participant:send_conversation_participants(
          id, display_name, avatar_url, role
        )
      `)
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update conversation updated_at
    await supabaseAdmin
      .from('send_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    // Update participant last_seen_at
    await supabaseAdmin
      .from('send_conversation_participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', participantId)

    return NextResponse.json({
      success: true,
      message
    })

  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

-- Add Conversation/Chat System
-- Migration: 20250107_add_conversation_system.sql
-- Description: Adds real-time conversation system for in-document collaboration

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.send_conversations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT NOT NULL REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
    link_id TEXT REFERENCES public.send_document_links(id) ON DELETE CASCADE,
    data_room_id TEXT REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    
    -- Conversation metadata
    title TEXT,
    description TEXT,
    conversation_type TEXT DEFAULT 'document' CHECK (conversation_type IN ('document', 'dataroom', 'general')),
    
    -- Status and settings
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- If false, only invited participants can see
    allow_anonymous BOOLEAN DEFAULT true, -- Allow viewers without accounts to participate
    
    -- Moderation settings
    require_approval BOOLEAN DEFAULT false, -- Messages need approval before showing
    auto_close_after_days INTEGER, -- Auto-close conversation after X days
    
    -- Creator information
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_by TEXT
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS public.send_conversation_participants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT NOT NULL REFERENCES public.send_conversations(id) ON DELETE CASCADE,
    
    -- Participant identification
    user_id TEXT, -- For authenticated users
    viewer_email TEXT, -- For document viewers
    session_id TEXT, -- For anonymous participants
    
    -- Participant details
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'moderator', 'participant', 'viewer')),
    
    -- Participation metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    is_muted BOOLEAN DEFAULT false,
    
    -- Permissions
    can_send_messages BOOLEAN DEFAULT true,
    can_edit_messages BOOLEAN DEFAULT false,
    can_delete_messages BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique participation per conversation
    UNIQUE(conversation_id, user_id),
    UNIQUE(conversation_id, viewer_email),
    UNIQUE(conversation_id, session_id),
    
    -- Ensure at least one identifier is provided
    CHECK (
        (user_id IS NOT NULL AND viewer_email IS NULL AND session_id IS NULL) OR
        (user_id IS NULL AND viewer_email IS NOT NULL AND session_id IS NULL) OR
        (user_id IS NULL AND viewer_email IS NULL AND session_id IS NOT NULL)
    )
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.send_conversation_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT NOT NULL REFERENCES public.send_conversations(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES public.send_conversation_participants(id) ON DELETE CASCADE,
    
    -- Message content
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system', 'reaction')),
    
    -- Message metadata
    reply_to_id TEXT REFERENCES public.send_conversation_messages(id) ON DELETE SET NULL,
    thread_id TEXT, -- For threaded conversations
    
    -- File attachments (for file/image messages)
    file_url TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    
    -- Message status
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT true,
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message reactions table
CREATE TABLE IF NOT EXISTS public.send_message_reactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    message_id TEXT NOT NULL REFERENCES public.send_conversation_messages(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES public.send_conversation_participants(id) ON DELETE CASCADE,
    
    -- Reaction details
    emoji TEXT NOT NULL, -- Unicode emoji or custom emoji identifier
    reaction_type TEXT DEFAULT 'emoji' CHECK (reaction_type IN ('emoji', 'custom')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique reaction per participant per message
    UNIQUE(message_id, participant_id, emoji)
);

-- Create conversation read status table
CREATE TABLE IF NOT EXISTS public.send_conversation_read_status (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT NOT NULL REFERENCES public.send_conversations(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES public.send_conversation_participants(id) ON DELETE CASCADE,
    
    -- Read status
    last_read_message_id TEXT REFERENCES public.send_conversation_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique read status per participant per conversation
    UNIQUE(conversation_id, participant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_conversations_document 
ON public.send_conversations(document_id);

CREATE INDEX IF NOT EXISTS idx_send_conversations_link 
ON public.send_conversations(link_id);

CREATE INDEX IF NOT EXISTS idx_send_conversations_data_room 
ON public.send_conversations(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_conversations_active 
ON public.send_conversations(is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_send_conversation_participants_conversation 
ON public.send_conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_send_conversation_participants_user 
ON public.send_conversation_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_send_conversation_participants_email 
ON public.send_conversation_participants(viewer_email);

CREATE INDEX IF NOT EXISTS idx_send_conversation_messages_conversation 
ON public.send_conversation_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_send_conversation_messages_participant 
ON public.send_conversation_messages(participant_id);

CREATE INDEX IF NOT EXISTS idx_send_conversation_messages_thread 
ON public.send_conversation_messages(thread_id, sent_at ASC);

CREATE INDEX IF NOT EXISTS idx_send_message_reactions_message 
ON public.send_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_send_conversation_read_status_conversation 
ON public.send_conversation_read_status(conversation_id);

-- Create function to get conversation with participants and recent messages
CREATE OR REPLACE FUNCTION public.get_conversation_details(conversation_id_param TEXT)
RETURNS TABLE (
    conversation_id TEXT,
    title TEXT,
    description TEXT,
    conversation_type TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    participant_count BIGINT,
    message_count BIGINT,
    last_message_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.description,
        c.conversation_type,
        c.is_active,
        c.created_at,
        COUNT(DISTINCT cp.id) as participant_count,
        COUNT(DISTINCT cm.id) as message_count,
        MAX(cm.sent_at) as last_message_at
    FROM public.send_conversations c
    LEFT JOIN public.send_conversation_participants cp ON c.id = cp.conversation_id AND cp.is_active = true
    LEFT JOIN public.send_conversation_messages cm ON c.id = cm.conversation_id AND cm.is_deleted = false
    WHERE c.id = conversation_id_param
    GROUP BY c.id, c.title, c.description, c.conversation_type, c.is_active, c.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to get messages with participant info
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
    conversation_id_param TEXT,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    message_id TEXT,
    message_text TEXT,
    message_type TEXT,
    file_url TEXT,
    file_name TEXT,
    reply_to_id TEXT,
    is_edited BOOLEAN,
    sent_at TIMESTAMP WITH TIME ZONE,
    participant_id TEXT,
    display_name TEXT,
    avatar_url TEXT,
    participant_role TEXT,
    reaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.message_text,
        cm.message_type,
        cm.file_url,
        cm.file_name,
        cm.reply_to_id,
        cm.is_edited,
        cm.sent_at,
        cp.id,
        cp.display_name,
        cp.avatar_url,
        cp.role,
        COUNT(mr.id) as reaction_count
    FROM public.send_conversation_messages cm
    INNER JOIN public.send_conversation_participants cp ON cm.participant_id = cp.id
    LEFT JOIN public.send_message_reactions mr ON cm.id = mr.message_id
    WHERE cm.conversation_id = conversation_id_param
      AND cm.is_deleted = false
      AND cm.is_approved = true
    GROUP BY cm.id, cm.message_text, cm.message_type, cm.file_url, cm.file_name, 
             cm.reply_to_id, cm.is_edited, cm.sent_at, cp.id, cp.display_name, 
             cp.avatar_url, cp.role
    ORDER BY cm.sent_at DESC
    LIMIT limit_param OFFSET offset_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to update read status
CREATE OR REPLACE FUNCTION public.update_conversation_read_status(
    conversation_id_param TEXT,
    participant_id_param TEXT,
    message_id_param TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.send_conversation_read_status (
        conversation_id, participant_id, last_read_message_id, last_read_at
    ) VALUES (
        conversation_id_param, participant_id_param, message_id_param, NOW()
    )
    ON CONFLICT (conversation_id, participant_id)
    DO UPDATE SET
        last_read_message_id = message_id_param,
        last_read_at = NOW(),
        updated_at = NOW();
        
    -- Update unread count
    UPDATE public.send_conversation_read_status
    SET unread_count = (
        SELECT COUNT(*)
        FROM public.send_conversation_messages cm
        WHERE cm.conversation_id = conversation_id_param
          AND cm.sent_at > COALESCE(
              (SELECT last_read_at FROM public.send_conversation_read_status 
               WHERE conversation_id = conversation_id_param AND participant_id = participant_id_param),
              '1970-01-01'::timestamp
          )
          AND cm.participant_id != participant_id_param
          AND cm.is_deleted = false
    )
    WHERE conversation_id = conversation_id_param 
      AND participant_id = participant_id_param;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for conversation tables
ALTER TABLE public.send_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_conversation_read_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations for their documents" ON public.send_conversations
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM public.send_shared_documents 
            WHERE user_id = auth.uid()::text
        ) OR
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can manage conversations for their documents" ON public.send_conversations
    FOR ALL USING (
        document_id IN (
            SELECT id FROM public.send_shared_documents 
            WHERE user_id = auth.uid()::text
        ) OR
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for participants
CREATE POLICY "Participants can view their own participation" ON public.send_conversation_participants
    FOR SELECT USING (
        user_id = auth.uid()::text OR
        conversation_id IN (
            SELECT c.id FROM public.send_conversations c
            INNER JOIN public.send_shared_documents sd ON c.document_id = sd.id
            WHERE sd.user_id = auth.uid()::text
        )
    );

CREATE POLICY "System can manage participants" ON public.send_conversation_participants
    FOR ALL USING (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in accessible conversations" ON public.send_conversation_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT cp.conversation_id FROM public.send_conversation_participants cp
            WHERE cp.user_id = auth.uid()::text OR
                  cp.conversation_id IN (
                      SELECT c.id FROM public.send_conversations c
                      INNER JOIN public.send_shared_documents sd ON c.document_id = sd.id
                      WHERE sd.user_id = auth.uid()::text
                  )
        )
    );

CREATE POLICY "System can manage messages" ON public.send_conversation_messages
    FOR ALL USING (true);

-- RLS Policies for reactions
CREATE POLICY "Users can manage reactions in accessible conversations" ON public.send_message_reactions
    FOR ALL USING (
        message_id IN (
            SELECT cm.id FROM public.send_conversation_messages cm
            INNER JOIN public.send_conversation_participants cp ON cm.conversation_id = cp.conversation_id
            WHERE cp.user_id = auth.uid()::text
        )
    );

-- RLS Policies for read status
CREATE POLICY "Users can manage their own read status" ON public.send_conversation_read_status
    FOR ALL USING (
        participant_id IN (
            SELECT id FROM public.send_conversation_participants
            WHERE user_id = auth.uid()::text
        )
    );

-- Enable realtime for conversation tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.send_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.send_conversation_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.send_conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.send_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.send_conversation_read_status;

-- Add comments for documentation
COMMENT ON TABLE public.send_conversations IS 'Conversation threads for documents and datarooms';
COMMENT ON TABLE public.send_conversation_participants IS 'Participants in conversations with their roles and permissions';
COMMENT ON TABLE public.send_conversation_messages IS 'Messages within conversations with support for threads and reactions';
COMMENT ON TABLE public.send_message_reactions IS 'Emoji reactions to messages';
COMMENT ON TABLE public.send_conversation_read_status IS 'Read status tracking for participants';
COMMENT ON FUNCTION public.get_conversation_details(TEXT) IS 'Returns conversation details with participant and message counts';
COMMENT ON FUNCTION public.get_conversation_messages(TEXT, INTEGER, INTEGER) IS 'Returns messages for a conversation with participant info';
COMMENT ON FUNCTION public.update_conversation_read_status(TEXT, TEXT, TEXT) IS 'Updates read status and unread count for a participant';

-- Add missing send_link_emails table for email tracking
-- This table tracks all emails sent for document share links

CREATE TABLE IF NOT EXISTS public.send_link_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    recipient_email TEXT NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced')),
    message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_link_emails_link_id ON public.send_link_emails(link_id);
CREATE INDEX IF NOT EXISTS idx_send_link_emails_recipient ON public.send_link_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_send_link_emails_status ON public.send_link_emails(status);
CREATE INDEX IF NOT EXISTS idx_send_link_emails_sent_at ON public.send_link_emails(sent_at DESC);

-- Add RLS policies
ALTER TABLE public.send_link_emails ENABLE ROW LEVEL SECURITY;

-- Users can only see emails for their own links
CREATE POLICY "Users can view their own link emails" ON public.send_link_emails
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.send_document_links sdl
            WHERE sdl.id = send_link_emails.link_id
            AND sdl.created_by = auth.uid()
        )
    );

-- Users can only insert emails for their own links
CREATE POLICY "Users can insert emails for their own links" ON public.send_link_emails
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.send_document_links sdl
            WHERE sdl.id = send_link_emails.link_id
            AND sdl.created_by = auth.uid()
        )
    );

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ send_link_emails table created successfully!';
    RAISE NOTICE '📧 Email tracking is now enabled for share links';
END $$;

-- Add Screenshot Protection Feature
-- Migration: 20250107_add_screenshot_protection.sql
-- Description: Adds screenshot protection capabilities to document links

-- Add screenshot protection column to document links
ALTER TABLE public.send_document_links 
ADD COLUMN IF NOT EXISTS screenshot_protection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS watermark_text TEXT,
ADD COLUMN IF NOT EXISTS watermark_opacity DECIMAL(3,2) DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS watermark_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS watermark_position TEXT DEFAULT 'center',
ADD COLUMN IF NOT EXISTS print_protection BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS right_click_protection BOOLEAN DEFAULT false;

-- Create index for protection queries
CREATE INDEX IF NOT EXISTS idx_send_links_protection 
ON public.send_document_links(screenshot_protection, watermark_enabled);

-- Create screenshot protection events table for tracking attempts
CREATE TABLE IF NOT EXISTS public.send_protection_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    link_id TEXT NOT NULL REFERENCES public.send_document_links(id) ON DELETE CASCADE,
    session_id TEXT,
    event_type TEXT NOT NULL, -- 'screenshot_attempt', 'right_click_blocked', 'print_blocked', 'devtools_detected'
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for protection events
CREATE INDEX IF NOT EXISTS idx_send_protection_events_link 
ON public.send_protection_events(link_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_send_protection_events_type 
ON public.send_protection_events(event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_send_protection_events_session 
ON public.send_protection_events(session_id, timestamp DESC);

-- Create function to log protection events
CREATE OR REPLACE FUNCTION public.log_protection_event(
    link_id_param TEXT,
    session_id_param TEXT,
    event_type_param TEXT,
    user_agent_param TEXT DEFAULT NULL,
    ip_address_param INET DEFAULT NULL,
    metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS TEXT AS $$
DECLARE
    event_id TEXT;
BEGIN
    INSERT INTO public.send_protection_events (
        link_id, session_id, event_type, user_agent, ip_address, metadata
    ) VALUES (
        link_id_param, session_id_param, event_type_param, 
        user_agent_param, ip_address_param, metadata_param
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get protection statistics
CREATE OR REPLACE FUNCTION public.get_protection_stats(
    link_id_param TEXT,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    event_type TEXT,
    event_count BIGINT,
    unique_sessions BIGINT,
    last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pe.event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT pe.session_id) as unique_sessions,
        MAX(pe.timestamp) as last_occurrence
    FROM public.send_protection_events pe
    WHERE pe.link_id = link_id_param
      AND pe.timestamp >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY pe.event_type
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create watermark configuration type
CREATE TYPE public.watermark_config AS (
    enabled BOOLEAN,
    text TEXT,
    opacity DECIMAL(3,2),
    color TEXT,
    position TEXT,
    font_size INTEGER,
    rotation INTEGER
);

-- Create function to get link protection settings
CREATE OR REPLACE FUNCTION public.get_link_protection_settings(link_id_param TEXT)
RETURNS TABLE (
    screenshot_protection BOOLEAN,
    watermark_config public.watermark_config,
    print_protection BOOLEAN,
    right_click_protection BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.screenshot_protection,
        ROW(
            dl.watermark_enabled,
            dl.watermark_text,
            dl.watermark_opacity,
            dl.watermark_color,
            dl.watermark_position,
            16, -- default font size
            -45 -- default rotation
        )::public.watermark_config as watermark_config,
        dl.print_protection,
        dl.right_click_protection
    FROM public.send_document_links dl
    WHERE dl.id = link_id_param;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for protection events
ALTER TABLE public.send_protection_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view protection events for their own links
CREATE POLICY "Users can view protection events for their links" ON public.send_protection_events
    FOR SELECT USING (
        link_id IN (
            SELECT dl.id FROM public.send_document_links dl
            INNER JOIN public.send_shared_documents sd ON dl.document_id = sd.id
            WHERE sd.user_id = auth.uid()::text
        )
    );

-- Policy: System can insert protection events (no user restriction for logging)
CREATE POLICY "System can insert protection events" ON public.send_protection_events
    FOR INSERT WITH CHECK (true);

-- Update existing links to have default protection settings
UPDATE public.send_document_links 
SET 
    screenshot_protection = false,
    watermark_enabled = false,
    print_protection = false,
    right_click_protection = false
WHERE screenshot_protection IS NULL;

-- Add comments for documentation
COMMENT ON TABLE public.send_protection_events IS 'Tracks security events and protection attempts on document links';
COMMENT ON FUNCTION public.log_protection_event(TEXT, TEXT, TEXT, TEXT, INET, JSONB) IS 'Logs security protection events with metadata';
COMMENT ON FUNCTION public.get_protection_stats(TEXT, INTEGER) IS 'Returns protection event statistics for a link';
COMMENT ON FUNCTION public.get_link_protection_settings(TEXT) IS 'Returns complete protection configuration for a link';

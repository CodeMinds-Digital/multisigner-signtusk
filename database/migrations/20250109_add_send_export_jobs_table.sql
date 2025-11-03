-- Add send_export_jobs table for analytics export tracking
-- Migration: 20250109_add_send_export_jobs_table.sql
-- Description: Adds export job tracking for Send module analytics exports

-- Create export jobs table
CREATE TABLE IF NOT EXISTS public.send_export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Export configuration
    config JSONB NOT NULL DEFAULT '{}', -- Contains format, dateRange, includeCharts, etc.
    export_type TEXT NOT NULL CHECK (export_type IN ('document', 'data_room', 'visitor', 'time_series')),
    format TEXT NOT NULL CHECK (format IN ('csv', 'pdf', 'excel', 'json')),
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Results
    download_url TEXT,
    file_size BIGINT,
    error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- Auto-delete after 7 days
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_export_jobs_user_id 
ON public.send_export_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_send_export_jobs_document_id 
ON public.send_export_jobs(document_id);

CREATE INDEX IF NOT EXISTS idx_send_export_jobs_data_room_id 
ON public.send_export_jobs(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_export_jobs_status 
ON public.send_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_send_export_jobs_created_at 
ON public.send_export_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_send_export_jobs_expires_at 
ON public.send_export_jobs(expires_at) 
WHERE status = 'completed';

-- Enable RLS
ALTER TABLE public.send_export_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own export jobs" 
ON public.send_export_jobs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own export jobs" 
ON public.send_export_jobs
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own export jobs" 
ON public.send_export_jobs
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own export jobs" 
ON public.send_export_jobs
FOR DELETE USING (user_id = auth.uid());

-- Function to auto-delete expired exports
CREATE OR REPLACE FUNCTION delete_expired_export_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.send_export_jobs
    WHERE expires_at < NOW() AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE public.send_export_jobs IS 'Tracks analytics export jobs with automatic cleanup after 7 days';
COMMENT ON FUNCTION delete_expired_export_jobs() IS 'Deletes completed export jobs that have expired (called by cron job)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ send_export_jobs table created successfully!';
    RAISE NOTICE '📊 Export jobs will auto-expire after 7 days';
    RAISE NOTICE '🔒 RLS policies configured for user isolation';
END $$;


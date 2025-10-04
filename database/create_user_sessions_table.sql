-- Create user_sessions table for refresh token management
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    refresh_token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT,
    ip_address TEXT
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_used ON public.user_sessions(last_used_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only allow users to access their own sessions
CREATE POLICY "Users can only access their own sessions" ON public.user_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Allow service role to access all sessions (for admin operations)
CREATE POLICY "Service role can access all sessions" ON public.user_sessions
    FOR ALL USING (auth.role() = 'service_role');

-- Verify table was created
SELECT 'user_sessions table created successfully' as status;

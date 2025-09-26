-- =====================================================
-- General Security Settings Database Setup
-- Add missing tables for comprehensive security features
-- =====================================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- SECURITY CONFIGURATION TABLES
-- =====================================================

-- User Security Configuration Table
CREATE TABLE IF NOT EXISTS public.user_security_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Password & Account Security
    password_last_changed TIMESTAMPTZ,
    login_notifications BOOLEAN DEFAULT true,
    suspicious_activity_alerts BOOLEAN DEFAULT true,
    
    -- Session Management
    session_timeout INTEGER DEFAULT 480, -- in minutes (8 hours)
    max_active_sessions INTEGER DEFAULT 5,
    logout_other_devices BOOLEAN DEFAULT false,
    
    -- Access Control
    ip_whitelisting BOOLEAN DEFAULT false,
    allowed_ips JSONB DEFAULT '[]'::jsonb,
    geolocation_restrictions BOOLEAN DEFAULT false,
    allowed_countries JSONB DEFAULT '[]'::jsonb,
    
    -- Privacy & Data
    activity_logging BOOLEAN DEFAULT true,
    data_retention_period INTEGER DEFAULT 365, -- in days
    share_usage_analytics BOOLEAN DEFAULT false,
    
    -- Account Protection
    account_lockout_enabled BOOLEAN DEFAULT true,
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration INTEGER DEFAULT 30, -- in minutes
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Activity Logs Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Activity Details
    action TEXT NOT NULL, -- 'login', 'logout', 'password_change', 'security_config_updated', etc.
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Session & Security Info
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    location_country TEXT,
    location_city TEXT,
    
    -- Risk Assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 risk score
    is_suspicious BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced User Sessions Table (Update existing or create new)
-- First, let's check if we need to modify the existing user_sessions table
DO $$
BEGIN
    -- Check if the table exists and has the required columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' 
        AND column_name = 'is_active'
    ) THEN
        -- Add missing columns to existing user_sessions table
        ALTER TABLE public.user_sessions 
        ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS terminated_reason TEXT,
        ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
        ADD COLUMN IF NOT EXISTS location_country TEXT,
        ADD COLUMN IF NOT EXISTS location_city TEXT;
        
        -- Rename columns if needed
        ALTER TABLE public.user_sessions 
        RENAME COLUMN session_id TO session_token;
        
        -- Add primary key if not exists
        ALTER TABLE public.user_sessions 
        ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- TOTP Configuration Table (Enhanced)
CREATE TABLE IF NOT EXISTS public.user_totp_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- TOTP Settings
    enabled BOOLEAN DEFAULT false,
    secret_key TEXT, -- Encrypted TOTP secret
    backup_codes JSONB DEFAULT '[]'::jsonb, -- Encrypted backup codes
    
    -- MFA Preferences
    login_mfa_enabled BOOLEAN DEFAULT false,
    signing_mfa_enabled BOOLEAN DEFAULT false,
    default_require_totp BOOLEAN DEFAULT false,
    
    -- Usage Statistics
    backup_codes_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    total_uses INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Failed Login Attempts Table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    attempt_count INTEGER DEFAULT 1,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(email, ip_address)
);

-- Security Events Table
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type TEXT NOT NULL, -- 'suspicious_login', 'account_lockout', 'password_breach', etc.
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    -- Resolution
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User Security Config indexes
CREATE INDEX IF NOT EXISTS idx_user_security_config_user_id ON public.user_security_config(user_id);

-- User Activity Logs indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON public.user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_ip_address ON public.user_activity_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_suspicious ON public.user_activity_logs(is_suspicious);

-- User Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);

-- TOTP Config indexes
CREATE INDEX IF NOT EXISTS idx_user_totp_config_user_id ON public.user_totp_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_totp_config_enabled ON public.user_totp_config(enabled);

-- Failed Login Attempts indexes
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_locked_until ON public.failed_login_attempts(locked_until);

-- Security Events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON public.security_events(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE public.user_security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_totp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- User Security Config Policies
CREATE POLICY "Users can view their own security config" ON public.user_security_config
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security config" ON public.user_security_config
    FOR ALL USING (auth.uid() = user_id);

-- User Activity Logs Policies
CREATE POLICY "Users can view their own activity logs" ON public.user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON public.user_activity_logs
    FOR INSERT WITH CHECK (true); -- Allow system to log activities

-- User Sessions Policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- TOTP Config Policies
CREATE POLICY "Users can manage their own TOTP config" ON public.user_totp_config
    FOR ALL USING (auth.uid() = user_id);

-- Failed Login Attempts Policies (Admin only)
CREATE POLICY "Admins can view failed login attempts" ON public.failed_login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Security Events Policies
CREATE POLICY "Users can view their own security events" ON public.security_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security events" ON public.security_events
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get user's security score
CREATE OR REPLACE FUNCTION public.get_user_security_score(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    totp_enabled BOOLEAN := false;
    config_exists BOOLEAN := false;
BEGIN
    -- Check if TOTP is enabled
    SELECT enabled INTO totp_enabled 
    FROM public.user_totp_config 
    WHERE user_id = user_uuid;
    
    -- Check if security config exists
    SELECT EXISTS(
        SELECT 1 FROM public.user_security_config 
        WHERE user_id = user_uuid
    ) INTO config_exists;
    
    -- Calculate score
    IF totp_enabled THEN score := score + 40; END IF;
    IF config_exists THEN score := score + 20; END IF;
    
    -- Add more scoring logic as needed
    
    RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old activity logs based on retention policy
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    config_record RECORD;
BEGIN
    -- Clean up logs based on each user's retention policy
    FOR config_record IN 
        SELECT user_id, data_retention_period 
        FROM public.user_security_config 
        WHERE activity_logging = true
    LOOP
        DELETE FROM public.user_activity_logs 
        WHERE user_id = config_record.user_id 
        AND created_at < NOW() - INTERVAL '1 day' * config_record.data_retention_period;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify all tables were created
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'user_security_config', 'user_activity_logs', 'user_totp_config', 
        'failed_login_attempts', 'security_events'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    current_table TEXT;
BEGIN
    FOREACH current_table IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = current_table;
        
        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ All General Security tables created successfully!';
        RAISE NOTICE 'Tables: %', array_to_string(expected_tables, ', ');
    END IF;
END $$;

-- =====================================================
-- SEND TAB DATABASE SCHEMA
-- Complete schema for Send Tab feature (DocSend + Papermark)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. Send Shared Documents
-- Main document metadata for shared documents
CREATE TABLE IF NOT EXISTS public.send_shared_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    thumbnail_url TEXT,
    page_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    version_number INTEGER DEFAULT 1,
    parent_version_id UUID REFERENCES public.send_shared_documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Send Document Links
-- Shareable links with settings and restrictions
CREATE TABLE IF NOT EXISTS public.send_document_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.send_shared_documents(id) ON DELETE CASCADE NOT NULL,
    link_id TEXT UNIQUE NOT NULL, -- Short ID for URL (e.g., 'abc123')
    custom_slug TEXT UNIQUE,
    title TEXT,
    description TEXT,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    max_views INTEGER,
    current_views INTEGER DEFAULT 0,
    allow_download BOOLEAN DEFAULT true,
    require_email BOOLEAN DEFAULT false,
    require_nda BOOLEAN DEFAULT false,
    require_totp BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Send Link Access Controls
-- Advanced access restrictions for links
CREATE TABLE IF NOT EXISTS public.send_link_access_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    require_email BOOLEAN DEFAULT false,
    allowed_emails TEXT[],
    allowed_domains TEXT[],
    blocked_domains TEXT[],
    allowed_countries TEXT[],
    blocked_countries TEXT[],
    allowed_ips TEXT[],
    blocked_ips TEXT[],
    require_totp BOOLEAN DEFAULT false,
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text TEXT,
    screenshot_prevention BOOLEAN DEFAULT false,
    print_prevention BOOLEAN DEFAULT false,
    download_prevention BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Send Document Views
-- Track individual document views with analytics
CREATE TABLE IF NOT EXISTS public.send_document_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT NOT NULL,
    viewer_email TEXT,
    viewer_name TEXT,
    viewer_company TEXT,
    ip_address INET,
    user_agent TEXT,
    device_type TEXT, -- mobile, desktop, tablet
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    referrer TEXT,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER DEFAULT 0,
    pages_viewed INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    downloaded BOOLEAN DEFAULT false,
    nda_accepted BOOLEAN DEFAULT false,
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Send Page Views
-- Page-by-page tracking for detailed analytics
CREATE TABLE IF NOT EXISTS public.send_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    view_id UUID REFERENCES public.send_document_views(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0,
    scroll_depth_percentage INTEGER DEFAULT 0 CHECK (scroll_depth_percentage >= 0 AND scroll_depth_percentage <= 100),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Send Visitor Sessions
-- Track visitor sessions across multiple views
CREATE TABLE IF NOT EXISTS public.send_visitor_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    session_id TEXT UNIQUE NOT NULL,
    viewer_email TEXT,
    first_visit TIMESTAMPTZ DEFAULT NOW(),
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    total_visits INTEGER DEFAULT 1,
    total_duration_seconds INTEGER DEFAULT 0,
    total_pages_viewed INTEGER DEFAULT 0,
    device_fingerprint TEXT,
    is_returning BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Send Email Verifications
-- Email verification for link access
CREATE TABLE IF NOT EXISTS public.send_email_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    verification_code TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Send NDA Acceptances
-- Track NDA acceptances before document access
CREATE TABLE IF NOT EXISTS public.send_document_ndas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    view_id UUID REFERENCES public.send_document_views(id) ON DELETE CASCADE,
    nda_text TEXT NOT NULL,
    acceptor_name TEXT NOT NULL,
    acceptor_email TEXT NOT NULL,
    acceptor_ip INET,
    signature_data TEXT,
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    legal_binding BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Send Document Feedback
-- Collect feedback and ratings from viewers
CREATE TABLE IF NOT EXISTS public.send_document_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.send_shared_documents(id) ON DELETE CASCADE NOT NULL,
    view_id UUID REFERENCES public.send_document_views(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    feedback_type TEXT DEFAULT 'rating' CHECK (feedback_type IN ('rating', 'comment', 'survey')),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Send Custom Domains
-- Custom domain management for white-label
CREATE TABLE IF NOT EXISTS public.send_custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    domain TEXT UNIQUE NOT NULL,
    verification_token TEXT,
    verified BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Send Branding Settings
-- Custom branding configurations per user
CREATE TABLE IF NOT EXISTS public.send_branding_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    logo_url TEXT,
    brand_color TEXT DEFAULT '#3B82F6',
    font_family TEXT DEFAULT 'Inter',
    custom_css TEXT,
    email_template TEXT,
    remove_branding BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 12. Send Analytics Events
-- Detailed event tracking for analytics
CREATE TABLE IF NOT EXISTS public.send_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID REFERENCES public.send_document_links(id) ON DELETE CASCADE NOT NULL,
    view_id UUID REFERENCES public.send_document_views(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- view, download, nda_accept, email_capture, etc.
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Send Data Rooms
-- Virtual data room collections
CREATE TABLE IF NOT EXISTS public.send_data_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    folder_structure JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Send Data Room Documents
-- Document mapping for data rooms
CREATE TABLE IF NOT EXISTS public.send_data_room_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    document_id UUID REFERENCES public.send_shared_documents(id) ON DELETE CASCADE NOT NULL,
    folder_path TEXT DEFAULT '/',
    sort_order INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Send Shared Documents indexes
CREATE INDEX IF NOT EXISTS idx_send_shared_documents_user_id ON public.send_shared_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_send_shared_documents_team_id ON public.send_shared_documents(team_id);
CREATE INDEX IF NOT EXISTS idx_send_shared_documents_status ON public.send_shared_documents(status);
CREATE INDEX IF NOT EXISTS idx_send_shared_documents_created_at ON public.send_shared_documents(created_at DESC);

-- Send Document Links indexes
CREATE INDEX IF NOT EXISTS idx_send_document_links_document_id ON public.send_document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_send_document_links_link_id ON public.send_document_links(link_id);
CREATE INDEX IF NOT EXISTS idx_send_document_links_created_by ON public.send_document_links(created_by);
CREATE INDEX IF NOT EXISTS idx_send_document_links_is_active ON public.send_document_links(is_active);

-- Send Document Views indexes
CREATE INDEX IF NOT EXISTS idx_send_document_views_link_id ON public.send_document_views(link_id);
CREATE INDEX IF NOT EXISTS idx_send_document_views_session_id ON public.send_document_views(session_id);
CREATE INDEX IF NOT EXISTS idx_send_document_views_viewer_email ON public.send_document_views(viewer_email);
CREATE INDEX IF NOT EXISTS idx_send_document_views_viewed_at ON public.send_document_views(viewed_at DESC);

-- Send Page Views indexes
CREATE INDEX IF NOT EXISTS idx_send_page_views_view_id ON public.send_page_views(view_id);
CREATE INDEX IF NOT EXISTS idx_send_page_views_page_number ON public.send_page_views(page_number);

-- Send Visitor Sessions indexes
CREATE INDEX IF NOT EXISTS idx_send_visitor_sessions_link_id ON public.send_visitor_sessions(link_id);
CREATE INDEX IF NOT EXISTS idx_send_visitor_sessions_session_id ON public.send_visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_send_visitor_sessions_viewer_email ON public.send_visitor_sessions(viewer_email);

-- Send Analytics Events indexes
CREATE INDEX IF NOT EXISTS idx_send_analytics_events_link_id ON public.send_analytics_events(link_id);
CREATE INDEX IF NOT EXISTS idx_send_analytics_events_view_id ON public.send_analytics_events(view_id);
CREATE INDEX IF NOT EXISTS idx_send_analytics_events_event_type ON public.send_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_send_analytics_events_timestamp ON public.send_analytics_events(timestamp DESC);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Send Tab database schema created successfully!';
    RAISE NOTICE '📊 Created 14 tables with indexes';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Run SEND_TAB_STORAGE_BUCKETS.sql to create storage buckets';
    RAISE NOTICE '   2. Run SEND_TAB_RLS_POLICIES.sql to set up Row Level Security';
    RAISE NOTICE '   3. Configure Upstash Redis and QStash integrations';
END $$;


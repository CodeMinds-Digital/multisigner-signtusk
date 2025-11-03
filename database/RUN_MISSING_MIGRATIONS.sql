-- =====================================================
-- RUN ALL MISSING MIGRATIONS
-- Execute this in Supabase SQL Editor to add missing components
-- =====================================================

-- This script will:
-- 1. Create send_document_versions table + functions
-- 2. Create send_export_jobs cleanup function (table already exists)
-- 3. Create enterprise tables (sso_providers, sso_sessions, audit_trails)

BEGIN;

RAISE NOTICE '==============================================';
RAISE NOTICE 'RUNNING MISSING MIGRATIONS';
RAISE NOTICE '==============================================';
RAISE NOTICE '';

-- =====================================================
-- MIGRATION 1: Document Versioning
-- =====================================================

RAISE NOTICE '📦 MIGRATION 1: Document Versioning...';

-- Create send_document_versions table
CREATE TABLE IF NOT EXISTS public.send_document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.send_shared_documents(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    thumbnail_url TEXT,
    page_count INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    change_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, version_number)
);

-- Add version columns to send_shared_documents if not exists
ALTER TABLE public.send_shared_documents 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_version_id UUID REFERENCES public.send_shared_documents(id) ON DELETE SET NULL;

-- Create get_document_version_tree function
CREATE OR REPLACE FUNCTION get_document_version_tree(doc_id UUID)
RETURNS TABLE (
    id UUID,
    version_number INTEGER,
    title TEXT,
    file_url TEXT,
    created_at TIMESTAMPTZ,
    created_by UUID,
    change_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.version_number,
        v.title,
        v.file_url,
        v.created_at,
        v.created_by,
        v.change_description
    FROM public.send_document_versions v
    WHERE v.document_id = doc_id
    ORDER BY v.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Create manage_document_version trigger function
CREATE OR REPLACE FUNCTION manage_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-increment version number
    IF NEW.version_number IS NULL THEN
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO NEW.version_number
        FROM public.send_document_versions
        WHERE document_id = NEW.document_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_manage_document_version ON public.send_document_versions;
CREATE TRIGGER trigger_manage_document_version
    BEFORE INSERT ON public.send_document_versions
    FOR EACH ROW EXECUTE FUNCTION manage_document_version();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_send_document_versions_document_id 
ON public.send_document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_send_document_versions_version_number 
ON public.send_document_versions(version_number);

-- Enable RLS
ALTER TABLE public.send_document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view versions of their documents" 
ON public.send_document_versions
FOR SELECT USING (
    document_id IN (
        SELECT id FROM public.send_shared_documents 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create versions of their documents" 
ON public.send_document_versions
FOR INSERT WITH CHECK (
    document_id IN (
        SELECT id FROM public.send_shared_documents 
        WHERE user_id = auth.uid()
    )
);

RAISE NOTICE '✅ Document versioning migration complete!';
RAISE NOTICE '';

-- =====================================================
-- MIGRATION 2: Export Jobs Cleanup Function
-- =====================================================

RAISE NOTICE '📦 MIGRATION 2: Export Jobs Cleanup Function...';

-- Create cleanup function (table already exists)
CREATE OR REPLACE FUNCTION delete_expired_export_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM public.send_export_jobs
    WHERE expires_at < NOW() AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✅ Export jobs cleanup function created!';
RAISE NOTICE '';

-- =====================================================
-- MIGRATION 3: Enterprise Tables (SSO & Audit)
-- =====================================================

RAISE NOTICE '📦 MIGRATION 3: Enterprise Tables...';

-- Create sso_providers table
CREATE TABLE IF NOT EXISTS public.sso_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc', 'oauth')),
    provider_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    
    -- SAML Configuration
    saml_entity_id TEXT,
    saml_sso_url TEXT,
    saml_certificate TEXT,
    saml_sign_requests BOOLEAN DEFAULT false,
    
    -- OIDC Configuration
    oidc_issuer TEXT,
    oidc_client_id TEXT,
    oidc_client_secret TEXT,
    oidc_authorization_endpoint TEXT,
    oidc_token_endpoint TEXT,
    oidc_userinfo_endpoint TEXT,
    
    -- Attribute Mapping
    attribute_mapping JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create sso_sessions table
CREATE TABLE IF NOT EXISTS public.sso_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID REFERENCES public.sso_providers(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    saml_session_index TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_trails table
CREATE TABLE IF NOT EXISTS public.audit_trails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID,
    
    -- Event Details
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN ('auth', 'document', 'settings', 'admin', 'security')),
    event_action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Immutability
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    hash TEXT -- For tamper detection
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sso_providers_organization_id 
ON public.sso_providers(organization_id);

CREATE INDEX IF NOT EXISTS idx_sso_providers_provider_type 
ON public.sso_providers(provider_type);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_provider_id 
ON public.sso_sessions(provider_id);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id 
ON public.sso_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at 
ON public.sso_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id 
ON public.audit_trails(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_trails_event_type 
ON public.audit_trails(event_type);

CREATE INDEX IF NOT EXISTS idx_audit_trails_event_category 
ON public.audit_trails(event_category);

CREATE INDEX IF NOT EXISTS idx_audit_trails_created_at 
ON public.audit_trails(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_trails_resource 
ON public.audit_trails(resource_type, resource_id);

-- Enable RLS
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_trails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sso_providers
CREATE POLICY "Users can view SSO providers for their organization" 
ON public.sso_providers
FOR SELECT USING (true); -- Adjust based on your org structure

CREATE POLICY "Admins can manage SSO providers" 
ON public.sso_providers
FOR ALL USING (auth.uid() IS NOT NULL); -- Adjust based on admin role

-- RLS Policies for sso_sessions
CREATE POLICY "Users can view their own SSO sessions" 
ON public.sso_sessions
FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for audit_trails
CREATE POLICY "Users can view their own audit trails" 
ON public.audit_trails
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert audit trails" 
ON public.audit_trails
FOR INSERT WITH CHECK (true);

RAISE NOTICE '✅ Enterprise tables migration complete!';
RAISE NOTICE '';

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

RAISE NOTICE '==============================================';
RAISE NOTICE 'VERIFICATION';
RAISE NOTICE '==============================================';
RAISE NOTICE '';

-- Check tables
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('send_document_versions', 'sso_providers', 'sso_sessions', 'audit_trails');
    
    RAISE NOTICE '✅ Tables created: %/4', table_count;
END $$;

-- Check functions
DO $$
DECLARE
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname IN ('get_document_version_tree', 'manage_document_version', 'delete_expired_export_jobs');
    
    RAISE NOTICE '✅ Functions created: %/3', function_count;
END $$;

RAISE NOTICE '';
RAISE NOTICE '==============================================';
RAISE NOTICE '✅ ALL MIGRATIONS COMPLETE!';
RAISE NOTICE '==============================================';
RAISE NOTICE '';
RAISE NOTICE 'Next steps:';
RAISE NOTICE '1. Run: \\i database/VERIFY_SEND_MODULE_COMPLETE.sql';
RAISE NOTICE '2. Test version control features';
RAISE NOTICE '3. Test export job cleanup';
RAISE NOTICE '4. (Optional) Test SSO/SAML';
RAISE NOTICE '';

COMMIT;


-- Corporate Control Panel Database Schema
-- Extends existing corporate features with domain-based access control

-- 1. Domain Administration Table
CREATE TABLE IF NOT EXISTS public.domain_administrators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'domain_admin' CHECK (role IN ('domain_admin', 'domain_manager')),
    is_verified BOOLEAN DEFAULT false,
    verification_token TEXT,
    verification_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(domain, admin_user_id)
);

-- 2. Domain Settings Table
CREATE TABLE IF NOT EXISTS public.domain_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL UNIQUE,
    
    -- Branding Settings
    company_logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1F2937',
    
    -- Security Settings
    enforce_totp BOOLEAN DEFAULT false,
    password_min_length INTEGER DEFAULT 8,
    password_require_special BOOLEAN DEFAULT true,
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
    allowed_ip_ranges TEXT[], -- CIDR notation
    
    -- Email Settings
    custom_smtp_enabled BOOLEAN DEFAULT false,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_username TEXT,
    smtp_password_encrypted TEXT,
    email_from_name TEXT,
    email_from_address TEXT,
    
    -- Document Settings
    default_retention_days INTEGER DEFAULT 2555, -- 7 years
    require_approval_workflow BOOLEAN DEFAULT false,
    auto_reminder_enabled BOOLEAN DEFAULT true,
    auto_reminder_days INTEGER DEFAULT 3,
    
    -- Integration Settings
    sso_enabled BOOLEAN DEFAULT false,
    sso_provider TEXT, -- 'saml', 'oauth', 'ldap'
    sso_config JSONB,
    api_access_enabled BOOLEAN DEFAULT false,
    webhook_url TEXT,
    webhook_events TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Domain User Roles Table
CREATE TABLE IF NOT EXISTS public.domain_user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'corporate_user' CHECK (role IN ('domain_admin', 'domain_manager', 'corporate_user')),
    department TEXT,
    cost_center TEXT,
    manager_user_id UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(domain, user_id)
);

-- 4. Domain Analytics Table
CREATE TABLE IF NOT EXISTS public.domain_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    date DATE NOT NULL,
    
    -- User Metrics
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    
    -- Document Metrics
    documents_created INTEGER DEFAULT 0,
    documents_signed INTEGER DEFAULT 0,
    documents_declined INTEGER DEFAULT 0,
    
    -- Security Metrics
    login_attempts INTEGER DEFAULT 0,
    failed_logins INTEGER DEFAULT 0,
    totp_verifications INTEGER DEFAULT 0,
    
    -- Usage Metrics
    storage_used_mb BIGINT DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    email_notifications INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(domain, date)
);

-- 5. Domain Audit Logs Table
CREATE TABLE IF NOT EXISTS public.domain_audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'user', 'setting', 'document', 'billing'
    target_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Domain Invitations Table
CREATE TABLE IF NOT EXISTS public.domain_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    domain TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'corporate_user',
    department TEXT,
    invitation_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(domain, email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_administrators_domain ON public.domain_administrators(domain);
CREATE INDEX IF NOT EXISTS idx_domain_administrators_user ON public.domain_administrators(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_domain_user_roles_domain ON public.domain_user_roles(domain);
CREATE INDEX IF NOT EXISTS idx_domain_user_roles_user ON public.domain_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_domain_analytics_domain_date ON public.domain_analytics(domain, date);
CREATE INDEX IF NOT EXISTS idx_domain_audit_logs_domain ON public.domain_audit_logs(domain);
CREATE INDEX IF NOT EXISTS idx_domain_invitations_domain ON public.domain_invitations(domain);
CREATE INDEX IF NOT EXISTS idx_domain_invitations_token ON public.domain_invitations(invitation_token);

-- Enable RLS on all tables
ALTER TABLE public.domain_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Domain Administrators
CREATE POLICY "Domain admins can manage their domain" ON public.domain_administrators
    FOR ALL USING (
        auth.uid() = admin_user_id OR
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_administrators.domain
            AND da.role = 'domain_admin'
        )
    );

-- RLS Policies for Domain Settings
CREATE POLICY "Domain admins can manage domain settings" ON public.domain_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_settings.domain
        )
    );

-- RLS Policies for Domain User Roles
CREATE POLICY "Domain admins can manage user roles" ON public.domain_user_roles
    FOR ALL USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_user_roles.domain
        )
    );

-- RLS Policies for Domain Analytics
CREATE POLICY "Domain admins can view analytics" ON public.domain_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_analytics.domain
        )
    );

-- RLS Policies for Domain Audit Logs
CREATE POLICY "Domain admins can view audit logs" ON public.domain_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_audit_logs.domain
        )
    );

-- RLS Policies for Domain Invitations
CREATE POLICY "Domain admins can manage invitations" ON public.domain_invitations
    FOR ALL USING (
        auth.uid() = invited_by OR
        EXISTS (
            SELECT 1 FROM public.domain_administrators da
            WHERE da.admin_user_id = auth.uid() 
            AND da.domain = domain_invitations.domain
        )
    );

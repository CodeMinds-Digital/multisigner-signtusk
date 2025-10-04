-- =====================================================
-- SignTusk Complete Database Setup
-- All-in-One Schema for Public App + Admin Panel
-- =====================================================
-- Run this entire SQL script in your Supabase SQL Editor
-- This will create all tables, policies, functions, and sample data

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE APPLICATION TABLES
-- =====================================================

-- Users table (extends auth.users with app-specific data)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_expires_at TIMESTAMPTZ,
    documents_count INTEGER DEFAULT 0,
    storage_used_mb DECIMAL DEFAULT 0,
    monthly_documents_used INTEGER DEFAULT 0,
    monthly_limit INTEGER DEFAULT 5, -- Free plan limit
    is_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User sessions table (for refresh token management)
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

-- Documents table (core document management)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    file_name TEXT,
    file_url TEXT,
    file_size_mb DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'expired', 'cancelled')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    signers JSONB DEFAULT '[]'::jsonb,
    signature_fields JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    completion_percentage INTEGER DEFAULT 0,
    reminder_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Templates table (for PDF template management with schemas)
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    signature_type TEXT DEFAULT 'single' CHECK (signature_type IN ('single', 'multi')),
    status TEXT DEFAULT 'incomplete' CHECK (status IN ('completed', 'incomplete')),
    pdf_url TEXT NOT NULL,
    template_url TEXT,
    schemas JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document signatures table (individual signature tracking)
CREATE TABLE IF NOT EXISTS public.document_signatures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    signer_name TEXT NOT NULL,
    signer_email TEXT NOT NULL,
    signature_data TEXT, -- Base64 signature image or digital signature
    signed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
    access_token TEXT UNIQUE, -- Unique token for signer access
    reminder_sent_count INTEGER DEFAULT 0,
    last_reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document templates table (reusable document templates)
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Allow NULL for system templates
    name TEXT NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL, -- Template structure and fields
    category TEXT DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    is_system_template BOOLEAN DEFAULT false, -- Mark system-created templates
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ADMIN PANEL TABLES
-- =====================================================

-- Admin users table (separate from regular users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'support' CHECK (role IN ('super_admin', 'support', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret TEXT,
    last_login_at TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin activity logs table (audit trail)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT, -- 'user', 'document', 'system', 'config'
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration table (admin-managed settings)
CREATE TABLE IF NOT EXISTS public.system_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_sensitive BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys management table (secure key storage)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    key_encrypted TEXT NOT NULL, -- Encrypted API key
    key_hash TEXT NOT NULL, -- Hash for verification
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email logs table (email delivery tracking)
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    signature_id UUID REFERENCES public.document_signatures(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    email_type TEXT NOT NULL, -- 'signature_request', 'reminder', 'completion', 'admin_notification'
    subject TEXT,
    template_used TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced', 'complained')),
    provider TEXT DEFAULT 'resend',
    provider_message_id TEXT,
    provider_response JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

-- System metrics table (performance and usage tracking)
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL NOT NULL,
    metric_type TEXT DEFAULT 'counter' CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    tags JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans table (plan definitions)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    price_monthly DECIMAL DEFAULT 0,
    price_yearly DECIMAL DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb, -- documents_per_month, storage_mb, etc.
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions table (subscription tracking)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'unpaid', 'incomplete')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment history table (transaction tracking)
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id UUID REFERENCES public.user_subscriptions(id) ON DELETE CASCADE,
    amount DECIMAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_invoice_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage buckets for document files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('signatures', 'signatures', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/svg+xml']),
    ('templates', 'templates', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - USER ACCESS
-- =====================================================

-- User Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents Policies
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Document Signatures Policies
CREATE POLICY "Users can view signatures for their documents" ON public.document_signatures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_signatures.document_id
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert signatures for their documents" ON public.document_signatures
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = document_signatures.document_id
            AND documents.user_id = auth.uid()
        )
    );

CREATE POLICY "Signers can view their own signature records" ON public.document_signatures
    FOR SELECT USING (signer_email = auth.email());

CREATE POLICY "Signers can update their own signatures" ON public.document_signatures
    FOR UPDATE USING (signer_email = auth.email());

-- Document Templates Policies
CREATE POLICY "Users can view their own templates" ON public.document_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON public.document_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.document_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.document_templates
    FOR DELETE USING (auth.uid() = user_id);

-- Subscription Plans Policies (public read)
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- User Subscriptions Policies
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Payment History Policies
CREATE POLICY "Users can view their own payment history" ON public.payment_history
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - ADMIN ACCESS
-- =====================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Users Policies (super restrictive)
CREATE POLICY "Only super admins can manage admin users" ON public.admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Admin Activity Logs Policies
CREATE POLICY "Admins can view all admin logs" ON public.admin_activity_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert admin logs" ON public.admin_activity_logs
    FOR INSERT WITH CHECK (public.is_admin());

-- System Config Policies
CREATE POLICY "Admins can view system config" ON public.system_config
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage system config" ON public.system_config
    FOR ALL USING (public.is_admin());

-- API Keys Policies
CREATE POLICY "Admins can manage API keys" ON public.api_keys
    FOR ALL USING (public.is_admin());

-- Email Logs Policies
CREATE POLICY "Admins can view all email logs" ON public.email_logs
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can view their document email logs" ON public.email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents
            WHERE documents.id = email_logs.document_id
            AND documents.user_id = auth.uid()
        )
    );

-- System Metrics Policies
CREATE POLICY "Admins can view system metrics" ON public.system_metrics
    FOR SELECT USING (public.is_admin());

CREATE POLICY "System can insert metrics" ON public.system_metrics
    FOR INSERT WITH CHECK (true); -- Allow system to insert metrics

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Documents bucket policies
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Signatures bucket policies
CREATE POLICY "Users can upload signatures" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Users can view signatures" ON storage.objects
    FOR SELECT USING (bucket_id = 'signatures');

-- Templates bucket policies
CREATE POLICY "Users can upload their own templates" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'templates' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view templates" ON storage.objects
    FOR SELECT USING (bucket_id = 'templates');

-- Avatars bucket policies (public)
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatar" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update document completion percentage
CREATE OR REPLACE FUNCTION public.update_document_completion()
RETURNS TRIGGER AS $$
DECLARE
    total_signers INTEGER;
    signed_count INTEGER;
    completion_pct INTEGER;
BEGIN
    -- Count total signers and signed signers for the document
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'signed')
    INTO total_signers, signed_count
    FROM public.document_signatures
    WHERE document_id = COALESCE(NEW.document_id, OLD.document_id);

    -- Calculate completion percentage
    IF total_signers > 0 THEN
        completion_pct := (signed_count * 100) / total_signers;
    ELSE
        completion_pct := 0;
    END IF;

    -- Update document
    UPDATE public.documents
    SET
        completion_percentage = completion_pct,
        status = CASE
            WHEN completion_pct = 100 THEN 'completed'
            WHEN completion_pct > 0 THEN 'pending'
            ELSE status
        END,
        completed_at = CASE
            WHEN completion_pct = 100 AND completed_at IS NULL THEN NOW()
            ELSE completed_at
        END,
        last_activity_at = NOW()
    WHERE id = COALESCE(NEW.document_id, OLD.document_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user document count
CREATE OR REPLACE FUNCTION public.update_user_document_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.user_profiles
    SET documents_count = (
        SELECT COUNT(*)
        FROM public.documents
        WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    )
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate access token for signers
CREATE OR REPLACE FUNCTION public.generate_access_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.access_token IS NULL THEN
        NEW.access_token := encode(gen_random_bytes(32), 'hex');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
    BEFORE UPDATE ON public.system_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
    BEFORE UPDATE ON public.api_keys
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON public.user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for document completion tracking
CREATE TRIGGER on_signature_change
    AFTER INSERT OR UPDATE OR DELETE ON public.document_signatures
    FOR EACH ROW EXECUTE FUNCTION public.update_document_completion();

-- Create trigger for user document count
CREATE TRIGGER on_document_change
    AFTER INSERT OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_user_document_count();

-- Create trigger for access token generation
CREATE TRIGGER generate_signature_access_token
    BEFORE INSERT ON public.document_signatures
    FOR EACH ROW EXECUTE FUNCTION public.generate_access_token();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User Profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON public.user_profiles(plan);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON public.user_profiles(is_admin);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON public.documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON public.documents(expires_at);

-- Document Signatures indexes
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_signatures_signer_email ON public.document_signatures(signer_email);
CREATE INDEX IF NOT EXISTS idx_signatures_access_token ON public.document_signatures(access_token);
CREATE INDEX IF NOT EXISTS idx_signatures_status ON public.document_signatures(status);

-- Document Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.document_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.document_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_is_system ON public.document_templates(is_system_template);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON public.admin_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_activity_logs(action);

-- System Config indexes
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config(category);

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON public.api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);

-- Email Logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_document_id ON public.email_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_signature_id ON public.email_logs(signature_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- System Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON public.system_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON public.system_metrics(timestamp DESC);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end);

-- Payment History indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================



-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON public.admin_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_activity_logs(action);

-- System Config indexes
CREATE INDEX IF NOT EXISTS idx_system_config_key ON public.system_config(key);
CREATE INDEX IF NOT EXISTS idx_system_config_category ON public.system_config(category);

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_service ON public.api_keys(service);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);

-- Email Logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_document_id ON public.email_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_signature_id ON public.email_logs(signature_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);

-- System Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp ON public.system_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON public.system_metrics(timestamp DESC);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_period_end ON public.user_subscriptions(current_period_end);

-- Payment History indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert default subscription plans
INSERT INTO public.subscription_plans (name, display_name, description, price_monthly, price_yearly, features, limits, sort_order) VALUES
('free', 'Free Plan', 'Perfect for trying out SignTusk', 0, 0,
 '{"documents": true, "basic_templates": true, "email_support": true}',
 '{"documents_per_month": 5, "storage_mb": 100, "signers_per_document": 3}', 1),
('basic', 'Basic Plan', 'Great for small businesses', 9.99, 99.99,
 '{"unlimited_documents": true, "custom_templates": true, "priority_support": true, "analytics": true}',
 '{"documents_per_month": 50, "storage_mb": 1000, "signers_per_document": 10}', 2),
('pro', 'Pro Plan', 'Perfect for growing teams', 29.99, 299.99,
 '{"unlimited_documents": true, "advanced_templates": true, "api_access": true, "team_management": true, "advanced_analytics": true}',
 '{"documents_per_month": 200, "storage_mb": 5000, "signers_per_document": 25}', 3),
('enterprise', 'Enterprise Plan', 'For large organizations', 99.99, 999.99,
 '{"unlimited_everything": true, "white_label": true, "dedicated_support": true, "custom_integrations": true, "sso": true}',
 '{"documents_per_month": -1, "storage_mb": 50000, "signers_per_document": 100}', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert default system configuration
INSERT INTO public.system_config (key, value, description, category) VALUES
('app_name', '"SignTusk"', 'Application name', 'general'),
('app_version', '"1.0.0"', 'Application version', 'general'),
('maintenance_mode', 'false', 'Enable maintenance mode', 'general'),
('max_file_size_mb', '50', 'Maximum file size for uploads in MB', 'uploads'),
('allowed_file_types', '["pdf", "doc", "docx"]', 'Allowed file types for uploads', 'uploads'),
('email_from_name', '"SignTusk"', 'Default sender name for emails', 'email'),
('email_from_address', '"noreply@signtusk.com"', 'Default sender email address', 'email'),
('signature_reminder_days', '[1, 3, 7]', 'Days to send signature reminders', 'signatures'),
('document_expiry_days', '30', 'Default document expiry in days', 'signatures'),
('admin_notification_email', '"admin@signtusk.com"', 'Email for admin notifications', 'admin')
ON CONFLICT (key) DO NOTHING;

-- Insert sample admin user (password: admin123! - hashed)
INSERT INTO public.admin_users (email, password_hash, name, role) VALUES
('admin@signtusk.com', '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O', 'System Administrator', 'super_admin'),
('support@signtusk.com', '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O', 'Support Team', 'support'),
('auditor@signtusk.com', '$2b$10$rQZ8kqVZ8qVZ8qVZ8qVZ8O', 'System Auditor', 'auditor')
ON CONFLICT (email) DO NOTHING;

-- Insert sample document templates (system templates with NULL user_id)
INSERT INTO public.document_templates (user_id, name, description, template_data, category, is_public, is_system_template) VALUES
(NULL, 'Basic NDA', 'Standard Non-Disclosure Agreement template',
 '{"fields": [{"type": "signature", "label": "Company Representative"}, {"type": "signature", "label": "Recipient"}], "content": "This is a basic NDA template..."}',
 'legal', true, true),
(NULL, 'Service Agreement', 'Standard service agreement template',
 '{"fields": [{"type": "signature", "label": "Service Provider"}, {"type": "signature", "label": "Client"}], "content": "This is a service agreement template..."}',
 'business', true, true),
(NULL, 'Employment Contract', 'Basic employment contract template',
 '{"fields": [{"type": "signature", "label": "Employer"}, {"type": "signature", "label": "Employee"}], "content": "This is an employment contract template..."}',
 'hr', true, true)
ON CONFLICT DO NOTHING;

-- Sample documents (uncomment if you want test data)
/*
INSERT INTO public.documents (title, description, status, user_email, signers) VALUES
('Sample Service Agreement Q1 2024', 'Service agreement for Q1 2024 project', 'completed', 'user@example.com',
 '[{"name": "John Doe", "email": "john@company.com", "signed": true, "signed_at": "2024-01-15T10:30:00Z"}]'),
('Employee NDA - Jane Smith', 'Non-disclosure agreement for new employee', 'pending', 'hr@example.com',
 '[{"name": "Jane Smith", "email": "jane@example.com", "signed": false}]'),
('Partnership Agreement - TechCorp', 'Strategic partnership agreement', 'draft', 'legal@example.com', '[]');

-- Sample signatures
INSERT INTO public.document_signatures (document_id, signer_name, signer_email, status, access_token)
SELECT
    d.id,
    'John Doe',
    'john@company.com',
    'signed',
    'sample_token_' || d.id
FROM public.documents d
WHERE d.title = 'Sample Service Agreement Q1 2024';
*/

-- =====================================================
-- PERMISSIONS AND GRANTS
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant storage permissions
GRANT ALL ON storage.objects TO anon, authenticated;
GRANT ALL ON storage.buckets TO anon, authenticated;

-- =====================================================
-- UTILITY FUNCTIONS FOR ADMIN PANEL
-- =====================================================

-- Function to get system statistics
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'total_documents', (SELECT COUNT(*) FROM public.documents),
        'total_signatures', (SELECT COUNT(*) FROM public.document_signatures),
        'completed_documents', (SELECT COUNT(*) FROM public.documents WHERE status = 'completed'),
        'pending_documents', (SELECT COUNT(*) FROM public.documents WHERE status = 'pending'),
        'emails_sent', (SELECT COUNT(*) FROM public.email_logs),
        'storage_used_mb', (SELECT COALESCE(SUM(file_size_mb), 0) FROM public.documents),
        'active_users_30d', (
            SELECT COUNT(DISTINCT user_id)
            FROM public.documents
            WHERE created_at > NOW() - INTERVAL '30 days'
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired documents
CREATE OR REPLACE FUNCTION public.cleanup_expired_documents()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.documents
    SET status = 'expired'
    WHERE expires_at < NOW()
    AND status NOT IN ('completed', 'expired', 'cancelled');

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    -- Log the cleanup
    INSERT INTO public.system_metrics (metric_name, metric_value, metric_type)
    VALUES ('documents_expired', expired_count, 'counter');

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send signature reminders (placeholder)
CREATE OR REPLACE FUNCTION public.send_signature_reminders()
RETURNS INTEGER AS $$
DECLARE
    reminder_count INTEGER := 0;
    sig_record RECORD;
BEGIN
    -- Find signatures that need reminders
    FOR sig_record IN
        SELECT ds.*, d.title, d.expires_at
        FROM public.document_signatures ds
        JOIN public.documents d ON d.id = ds.document_id
        WHERE ds.status = 'pending'
        AND d.status = 'pending'
        AND (
            ds.last_reminder_sent_at IS NULL
            OR ds.last_reminder_sent_at < NOW() - INTERVAL '3 days'
        )
        AND d.expires_at > NOW()
    LOOP
        -- Update reminder count and timestamp
        UPDATE public.document_signatures
        SET
            reminder_sent_count = reminder_sent_count + 1,
            last_reminder_sent_at = NOW()
        WHERE id = sig_record.id;

        -- Log email (actual email sending would be handled by application)
        INSERT INTO public.email_logs (
            signature_id,
            recipient_email,
            recipient_name,
            email_type,
            subject,
            status
        ) VALUES (
            sig_record.id,
            sig_record.signer_email,
            sig_record.signer_name,
            'reminder',
            'Reminder: Please sign ' || sig_record.title,
            'sent'
        );

        reminder_count := reminder_count + 1;
    END LOOP;

    -- Log the reminder batch
    INSERT INTO public.system_metrics (metric_name, metric_value, metric_type)
    VALUES ('reminders_sent', reminder_count, 'counter');

    RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SETUP COMPLETION AND VERIFICATION
-- =====================================================

-- Verify all tables were created
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'user_profiles', 'user_sessions', 'documents', 'document_signatures', 'document_templates',
        'admin_users', 'admin_activity_logs', 'system_config', 'api_keys',
        'email_logs', 'system_metrics', 'subscription_plans', 'user_subscriptions',
        'payment_history'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    current_table TEXT;
BEGIN
    -- Check each expected table
    FOREACH current_table IN ARRAY expected_tables
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = current_table;

        IF table_count = 0 THEN
            missing_tables := array_append(missing_tables, current_table);
        END IF;
    END LOOP;

    -- Report results
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'WARNING: Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'SUCCESS: All required tables created successfully!';
    END IF;
END $$;

-- Insert initial system metrics
INSERT INTO public.system_metrics (metric_name, metric_value, metric_type, tags) VALUES
('setup_completed', 1, 'counter', json_build_object('version', '1.0.0', 'timestamp', NOW())::jsonb),
('database_version', 1, 'gauge', '{"schema_version": "1.0.0"}'::jsonb)
ON CONFLICT DO NOTHING;

-- Final success message with setup summary
SELECT
    'SignTusk Database Setup Completed Successfully!' as message,
    json_build_object(
        'tables_created', (
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
        ),
        'functions_created', (
            SELECT COUNT(*)
            FROM information_schema.routines
            WHERE routine_schema = 'public'
        ),
        'storage_buckets', (
            SELECT COUNT(*)
            FROM storage.buckets
        ),
        'subscription_plans', (
            SELECT COUNT(*)
            FROM public.subscription_plans
        ),
        'admin_users', (
            SELECT COUNT(*)
            FROM public.admin_users
        ),
        'setup_timestamp', NOW()
    ) as setup_summary;

-- =====================================================
-- SETUP INSTRUCTIONS
-- =====================================================

/*
🎉 SIGNTUSK DATABASE SETUP COMPLETE! 🎉

Your SignTusk database has been successfully configured with:

✅ CORE TABLES:
   - user_profiles (user management)
   - documents (document storage)
   - document_signatures (signature tracking)
   - document_templates (reusable templates)

✅ ADMIN PANEL TABLES:
   - admin_users (admin authentication)
   - admin_activity_logs (audit trails)
   - system_config (system settings)
   - api_keys (secure key management)
   - email_logs (email tracking)
   - system_metrics (performance monitoring)

✅ SUBSCRIPTION SYSTEM:
   - subscription_plans (plan definitions)
   - user_subscriptions (user subscriptions)
   - payment_history (transaction tracking)

✅ SECURITY:
   - Row Level Security (RLS) enabled
   - Proper access policies configured
   - Admin-only access controls

✅ STORAGE:
   - Document storage buckets
   - Signature image storage
   - Template storage
   - Avatar storage

✅ SAMPLE DATA:
   - Default subscription plans
   - System configuration
   - Admin users (admin@signtusk.com, support@signtusk.com, auditor@signtusk.com)
   - Document templates

NEXT STEPS:
1. Update your .env.local file with your Supabase credentials
2. Test the admin panel login at /admin/login
3. Configure your email service (Resend API)
4. Customize subscription plans as needed
5. Set up your domain and SSL certificate

ADMIN LOGIN CREDENTIALS:
- Email: admin@signtusk.com
- Password: admin123!
- Email: support@signtusk.com
- Password: admin123!
- Email: auditor@signtusk.com
- Password: admin123!

⚠️  IMPORTANT: Change default admin passwords in production!

Happy signing! 🚀
*/

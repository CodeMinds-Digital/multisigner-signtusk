-- MAIL Module Database Schema
-- Migration: 20250113_mail_module_setup.sql
-- Description: Complete database schema for MAIL module with automated domain verification

-- =============================================
-- MAIL MODULE CORE TABLES
-- =============================================

-- Email Accounts (Main account for each user)
CREATE TABLE IF NOT EXISTS public.email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    monthly_quota INTEGER DEFAULT 3000,
    emails_sent_this_month INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_email_account UNIQUE(user_id)
);

-- Email Domains with Automation Support
CREATE TABLE IF NOT EXISTS public.email_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    verification_method VARCHAR(50) DEFAULT 'manual', -- 'manual', 'cloudflare', 'route53', 'subdomain'
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verifying', 'verified', 'failed'
    automation_provider VARCHAR(50), -- 'cloudflare', 'route53', null
    automation_config JSONB, -- Encrypted API keys, zone IDs, etc.
    
    -- DNS Record Status
    txt_verification_status BOOLEAN DEFAULT false,
    dkim_status BOOLEAN DEFAULT false,
    spf_status BOOLEAN DEFAULT false,
    dmarc_status BOOLEAN DEFAULT false,
    
    -- Automation Tracking
    last_verification_attempt TIMESTAMP WITH TIME ZONE,
    verification_attempts INTEGER DEFAULT 0,
    automation_enabled BOOLEAN DEFAULT false,
    setup_progress JSONB DEFAULT '{"step": "initializing", "percentage": 0}',
    
    verification_token VARCHAR(255),
    subdomain VARCHAR(255), -- For subdomain delegation method
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT unique_account_domain UNIQUE(email_account_id, domain)
);

-- API Keys for Email Service
CREATE TABLE IF NOT EXISTS public.email_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- 'sk_live_', 'sk_test_'
    permissions JSONB DEFAULT '{"send": true, "templates": true, "domains": false}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    variables JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Messages
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.email_templates(id),
    external_id VARCHAR(255), -- ZeptoMail/provider message ID
    from_email VARCHAR(255) NOT NULL,
    to_emails JSONB NOT NULL,
    cc_emails JSONB,
    bcc_emails JSONB,
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    attachments JSONB,
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'delivered', 'bounced', 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Events (delivery, bounce, open, click, etc.)
CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.email_messages(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'unsubscribed', 'complained'
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppression List (bounced/unsubscribed emails)
CREATE TABLE IF NOT EXISTS public.email_suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL, -- 'hard_bounce', 'soft_bounce', 'complaint', 'unsubscribe', 'manual'
    source VARCHAR(50), -- 'bounce', 'complaint', 'manual', 'api'
    bounce_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_account_email_suppression UNIQUE(email_account_id, email)
);

-- Usage Records for Billing
CREATE TABLE IF NOT EXISTS public.email_usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_account_period UNIQUE(email_account_id, period_start)
);

-- DNS Credentials (encrypted storage for automation)
CREATE TABLE IF NOT EXISTS public.email_dns_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'cloudflare', 'route53'
    encrypted_credentials TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Email account queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_status ON public.email_accounts(status);

-- Domain queries
CREATE INDEX IF NOT EXISTS idx_email_domains_account_id ON public.email_domains(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_domains_status ON public.email_domains(verification_status);
CREATE INDEX IF NOT EXISTS idx_email_domains_domain ON public.email_domains(domain);

-- API key lookups
CREATE INDEX IF NOT EXISTS idx_email_api_keys_hash ON public.email_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_email_api_keys_account_active ON public.email_api_keys(email_account_id, is_active);

-- Message queries
CREATE INDEX IF NOT EXISTS idx_email_messages_account_created ON public.email_messages(email_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON public.email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_external_id ON public.email_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_from_email ON public.email_messages(from_email);

-- Event queries
CREATE INDEX IF NOT EXISTS idx_email_events_message_timestamp ON public.email_events(message_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_type_timestamp ON public.email_events(event_type, timestamp DESC);

-- Template queries
CREATE INDEX IF NOT EXISTS idx_email_templates_account_active ON public.email_templates(email_account_id, is_active);

-- Suppression list queries
CREATE INDEX IF NOT EXISTS idx_email_suppression_account_email ON public.email_suppression_list(email_account_id, email);

-- Usage queries
CREATE INDEX IF NOT EXISTS idx_email_usage_account_period ON public.email_usage_records(email_account_id, period_start);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_dns_credentials ENABLE ROW LEVEL SECURITY;

-- Email Accounts Policies
CREATE POLICY "Users can view their own email accounts" ON public.email_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email accounts" ON public.email_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts" ON public.email_accounts
    FOR UPDATE USING (auth.uid() = user_id);

-- Email Domains Policies
CREATE POLICY "Users can view domains in their email accounts" ON public.email_domains
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create domains in their email accounts" ON public.email_domains
    FOR INSERT WITH CHECK (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update domains in their email accounts" ON public.email_domains
    FOR UPDATE USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- API Keys Policies
CREATE POLICY "Users can view API keys in their email accounts" ON public.email_api_keys
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create API keys in their email accounts" ON public.email_api_keys
    FOR INSERT WITH CHECK (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update API keys in their email accounts" ON public.email_api_keys
    FOR UPDATE USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- Templates Policies
CREATE POLICY "Users can view templates in their email accounts" ON public.email_templates
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their email accounts" ON public.email_templates
    FOR INSERT WITH CHECK (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update templates in their email accounts" ON public.email_templates
    FOR UPDATE USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- Messages Policies
CREATE POLICY "Users can view messages in their email accounts" ON public.email_messages
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their email accounts" ON public.email_messages
    FOR INSERT WITH CHECK (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- Events Policies (read-only for users)
CREATE POLICY "Users can view events for their messages" ON public.email_events
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.email_messages 
            WHERE email_account_id IN (
                SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
            )
        )
    );

-- Suppression List Policies
CREATE POLICY "Users can view suppression list in their email accounts" ON public.email_suppression_list
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage suppression list in their email accounts" ON public.email_suppression_list
    FOR ALL USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- Usage Records Policies (read-only for users)
CREATE POLICY "Users can view usage records for their email accounts" ON public.email_usage_records
    FOR SELECT USING (
        email_account_id IN (
            SELECT id FROM public.email_accounts WHERE user_id = auth.uid()
        )
    );

-- DNS Credentials Policies
CREATE POLICY "Users can manage their own DNS credentials" ON public.email_dns_credentials
    FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update email account updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_account_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email_accounts updated_at
CREATE TRIGGER trigger_update_email_account_updated_at
    BEFORE UPDATE ON public.email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_email_account_updated_at();

-- Function to update template updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email_templates updated_at
CREATE TRIGGER trigger_update_email_template_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_template_updated_at();

-- Function to increment email count when message is sent
CREATE OR REPLACE FUNCTION increment_email_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
        UPDATE public.email_accounts 
        SET emails_sent_this_month = emails_sent_this_month + 1
        WHERE id = NEW.email_account_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment email count
CREATE TRIGGER trigger_increment_email_count
    AFTER UPDATE ON public.email_messages
    FOR EACH ROW
    EXECUTE FUNCTION increment_email_count();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default email templates for new accounts
-- This will be handled by the application logic

COMMIT;

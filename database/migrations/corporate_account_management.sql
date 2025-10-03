-- =====================================================
-- CORPORATE ACCOUNT MANAGEMENT SYSTEM
-- Complete Database Schema Setup
-- =====================================================
-- This migration creates all tables and policies needed for
-- corporate account management with no external dependencies
-- Uses only Supabase built-in features

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CORPORATE ACCOUNTS TABLE
-- =====================================================
-- Stores corporate account information and settings
CREATE TABLE IF NOT EXISTS public.corporate_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name TEXT NOT NULL,
    email_domain TEXT NOT NULL UNIQUE, -- e.g., "acme.com"
    access_mode TEXT DEFAULT 'invite_only' CHECK (access_mode IN ('open', 'approval', 'invite_only')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_corporate_accounts_domain ON public.corporate_accounts(email_domain);
CREATE INDEX IF NOT EXISTS idx_corporate_accounts_owner ON public.corporate_accounts(owner_id);

-- =====================================================
-- 2. EXTEND USER_PROFILES TABLE
-- =====================================================
-- Add corporate account fields to existing user_profiles table
DO $$ 
BEGIN
    -- Add corporate_account_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'corporate_account_id'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE SET NULL;
    END IF;

    -- Add corporate_role if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'corporate_role'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN corporate_role TEXT CHECK (corporate_role IN ('owner', 'admin', 'member'));
    END IF;

    -- Add account_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended'));
    END IF;

    -- Add suspended_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'suspended_at'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN suspended_at TIMESTAMPTZ;
    END IF;

    -- Add suspended_by if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'suspended_by'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for corporate fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_corporate_account ON public.user_profiles(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_corporate_role ON public.user_profiles(corporate_role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles(account_status);

-- =====================================================
-- 3. CORPORATE INVITATIONS TABLE
-- =====================================================
-- Tracks invitation tokens for invite-only mode
CREATE TABLE IF NOT EXISTS public.corporate_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_corporate_invitations_account ON public.corporate_invitations(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_invitations_token ON public.corporate_invitations(token);
CREATE INDEX IF NOT EXISTS idx_corporate_invitations_email ON public.corporate_invitations(email);
CREATE INDEX IF NOT EXISTS idx_corporate_invitations_status ON public.corporate_invitations(status);

-- =====================================================
-- 4. CORPORATE ACCESS REQUESTS TABLE
-- =====================================================
-- Tracks access requests for approval mode
CREATE TABLE IF NOT EXISTS public.corporate_access_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    decline_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(corporate_account_id, user_id) -- One request per user per corporate account
);

-- Indexes for access requests
CREATE INDEX IF NOT EXISTS idx_corporate_access_requests_account ON public.corporate_access_requests(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_access_requests_user ON public.corporate_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_corporate_access_requests_status ON public.corporate_access_requests(status);

-- =====================================================
-- 5. CORPORATE AUDIT LOGS TABLE
-- =====================================================
-- Tracks all admin actions for compliance and transparency
CREATE TABLE IF NOT EXISTS public.corporate_audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    corporate_account_id UUID REFERENCES public.corporate_accounts(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    action TEXT NOT NULL, -- e.g., 'user_invited', 'user_removed', 'role_changed', 'user_suspended'
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb, -- Additional context (old_role, new_role, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_corporate_audit_logs_account ON public.corporate_audit_logs(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_audit_logs_admin ON public.corporate_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_corporate_audit_logs_action ON public.corporate_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_corporate_audit_logs_created ON public.corporate_audit_logs(created_at DESC);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is corporate admin or owner
CREATE OR REPLACE FUNCTION public.is_corporate_admin(user_id UUID, corp_account_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id
        AND corporate_account_id = corp_account_id
        AND corporate_role IN ('owner', 'admin')
        AND account_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is corporate owner
CREATE OR REPLACE FUNCTION public.is_corporate_owner(user_id UUID, corp_account_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = user_id
        AND corporate_account_id = corp_account_id
        AND corporate_role = 'owner'
        AND account_status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_corporate_audit(
    corp_account_id UUID,
    admin_user_id UUID,
    action_type TEXT,
    target_user UUID DEFAULT NULL,
    action_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO public.corporate_audit_logs (
        corporate_account_id,
        admin_id,
        action,
        target_user_id,
        details
    ) VALUES (
        corp_account_id,
        admin_user_id,
        action_type,
        target_user,
        action_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire invitations
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.corporate_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all corporate tables
ALTER TABLE public.corporate_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Corporate Accounts Policies
-- Users can view their own corporate account
CREATE POLICY "Users can view their corporate account"
    ON public.corporate_accounts FOR SELECT
    USING (
        id IN (
            SELECT corporate_account_id 
            FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    );

-- Only owners can update corporate account settings
CREATE POLICY "Owners can update corporate account"
    ON public.corporate_accounts FOR UPDATE
    USING (public.is_corporate_owner(auth.uid(), id))
    WITH CHECK (public.is_corporate_owner(auth.uid(), id));

-- Corporate Invitations Policies
-- Admins can view invitations for their corporate account
CREATE POLICY "Admins can view corporate invitations"
    ON public.corporate_invitations FOR SELECT
    USING (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
    );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations"
    ON public.corporate_invitations FOR INSERT
    WITH CHECK (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
    );

-- Admins can update invitations (revoke, resend)
CREATE POLICY "Admins can update invitations"
    ON public.corporate_invitations FOR UPDATE
    USING (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
    );

-- Corporate Access Requests Policies
-- Admins can view access requests
CREATE POLICY "Admins can view access requests"
    ON public.corporate_access_requests FOR SELECT
    USING (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
        OR user_id = auth.uid() -- Users can see their own requests
    );

-- Users can create access requests
CREATE POLICY "Users can create access requests"
    ON public.corporate_access_requests FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Admins can update access requests (approve/decline)
CREATE POLICY "Admins can update access requests"
    ON public.corporate_access_requests FOR UPDATE
    USING (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
    );

-- Corporate Audit Logs Policies
-- Admins can view audit logs for their corporate account
CREATE POLICY "Admins can view audit logs"
    ON public.corporate_audit_logs FOR SELECT
    USING (
        public.is_corporate_admin(
            auth.uid(),
            corporate_account_id
        )
    );

-- System can insert audit logs (via function)
CREATE POLICY "System can insert audit logs"
    ON public.corporate_audit_logs FOR INSERT
    WITH CHECK (true); -- Controlled by SECURITY DEFINER function

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp on corporate_accounts
CREATE OR REPLACE FUNCTION public.update_corporate_account_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_accounts_timestamp
    BEFORE UPDATE ON public.corporate_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_corporate_account_timestamp();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All tables, indexes, functions, and RLS policies created
-- Ready for corporate account management implementation


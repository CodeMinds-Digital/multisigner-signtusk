-- =====================================================
-- Organization TOTP Policies Database Schema
-- =====================================================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization TOTP policies table
CREATE TABLE IF NOT EXISTS organization_totp_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Login MFA policies
    enforce_login_mfa BOOLEAN DEFAULT false,
    login_mfa_grace_period_days INTEGER DEFAULT 7,
    
    -- Signing MFA policies
    enforce_signing_mfa BOOLEAN DEFAULT false,
    require_totp_for_all_documents BOOLEAN DEFAULT false,
    allow_user_override BOOLEAN DEFAULT true,
    
    -- Security settings
    max_backup_codes INTEGER DEFAULT 10,
    totp_window_tolerance INTEGER DEFAULT 1,
    require_mfa_for_admin_actions BOOLEAN DEFAULT false,
    
    -- Compliance settings
    audit_totp_events BOOLEAN DEFAULT true,
    retention_period_days INTEGER DEFAULT 365,
    
    -- Emergency access
    allow_admin_override BOOLEAN DEFAULT true,
    emergency_access_codes TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- User organization memberships
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- Organization TOTP exemptions (for emergency access)
CREATE TABLE IF NOT EXISTS organization_totp_exemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    exemption_type VARCHAR(50) CHECK (exemption_type IN ('login', 'signing', 'both')),
    reason TEXT NOT NULL,
    granted_by UUID REFERENCES user_profiles(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id, exemption_type)
);

-- Add organization_id to user_profiles for easier queries
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Add organization context to TOTP configs
ALTER TABLE user_totp_configs
ADD COLUMN IF NOT EXISTS organization_enforced BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS policy_compliance_date TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_totp_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_totp_exemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Organization members can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- RLS Policies for organization_totp_policies
CREATE POLICY "Organization admins can view TOTP policies" ON organization_totp_policies
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

CREATE POLICY "Organization admins can update TOTP policies" ON organization_totp_policies
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- RLS Policies for user_organizations
CREATE POLICY "Users can view their organization memberships" ON user_organizations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all memberships" ON user_organizations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- RLS Policies for organization_totp_exemptions
CREATE POLICY "Organization admins can manage TOTP exemptions" ON organization_totp_exemptions
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND status = 'active'
        )
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_totp_policies_org_id ON organization_totp_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_totp_exemptions_user_org ON organization_totp_exemptions(user_id, organization_id);

-- Function to check if user must comply with organization TOTP policy
CREATE OR REPLACE FUNCTION check_organization_totp_requirement(
    p_user_id UUID,
    p_context TEXT DEFAULT 'login'
) RETURNS BOOLEAN AS $$
DECLARE
    v_organization_id UUID;
    v_policy RECORD;
    v_exemption RECORD;
BEGIN
    -- Get user's organization
    SELECT organization_id INTO v_organization_id
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- If no organization, no policy applies
    IF v_organization_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Get organization policy
    SELECT * INTO v_policy
    FROM organization_totp_policies
    WHERE organization_id = v_organization_id;
    
    -- If no policy exists, no requirement
    IF v_policy IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check for exemptions
    SELECT * INTO v_exemption
    FROM organization_totp_exemptions
    WHERE organization_id = v_organization_id
    AND user_id = p_user_id
    AND exemption_type IN ('both', p_context)
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- If exemption exists, no requirement
    IF v_exemption IS NOT NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check context-specific requirements
    IF p_context = 'login' THEN
        RETURN v_policy.enforce_login_mfa;
    ELSIF p_context = 'signing' THEN
        RETURN v_policy.enforce_signing_mfa;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get organization TOTP policy for a user
CREATE OR REPLACE FUNCTION get_user_organization_totp_policy(p_user_id UUID)
RETURNS TABLE(
    organization_name TEXT,
    enforce_login_mfa BOOLEAN,
    enforce_signing_mfa BOOLEAN,
    require_totp_for_all_documents BOOLEAN,
    allow_user_override BOOLEAN,
    login_mfa_grace_period_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.name::TEXT,
        otp.enforce_login_mfa,
        otp.enforce_signing_mfa,
        otp.require_totp_for_all_documents,
        otp.allow_user_override,
        otp.login_mfa_grace_period_days
    FROM user_profiles up
    JOIN organizations o ON up.organization_id = o.id
    JOIN organization_totp_policies otp ON o.id = otp.organization_id
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

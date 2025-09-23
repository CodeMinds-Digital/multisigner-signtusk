-- =====================================================
-- Corporate-Organization Integration Migration
-- =====================================================
-- This migration integrates existing corporate accounts with the new organization TOTP system

-- Step 1: Create organizations from existing corporate accounts
INSERT INTO organizations (id, name, domain, plan, status, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    COALESCE(company_name, 'Unknown Company') as name,
    company_domain as domain,
    CASE 
        WHEN account_type = 'corporate' THEN 'pro'
        ELSE 'free'
    END as plan,
    'active' as status,
    created_at,
    NOW() as updated_at
FROM user_profiles 
WHERE company_domain IS NOT NULL 
    AND company_domain != ''
    AND NOT EXISTS (
        SELECT 1 FROM organizations o WHERE o.domain = user_profiles.company_domain
    )
GROUP BY company_name, company_domain, account_type, created_at;

-- Step 2: Update user_profiles to link to organizations
UPDATE user_profiles 
SET organization_id = (
    SELECT o.id 
    FROM organizations o 
    WHERE o.domain = user_profiles.company_domain
    LIMIT 1
)
WHERE company_domain IS NOT NULL 
    AND company_domain != ''
    AND organization_id IS NULL;

-- Step 3: Create user_organizations memberships for existing corporate users
INSERT INTO user_organizations (user_id, organization_id, role, status, joined_at)
SELECT 
    up.id as user_id,
    up.organization_id,
    CASE 
        WHEN up.is_admin = true THEN 'admin'
        ELSE 'member'
    END as role,
    'active' as status,
    up.created_at as joined_at
FROM user_profiles up
WHERE up.organization_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_organizations uo 
        WHERE uo.user_id = up.id AND uo.organization_id = up.organization_id
    );

-- Step 4: Create default TOTP policies for existing organizations
INSERT INTO organization_totp_policies (
    organization_id,
    enforce_login_mfa,
    login_mfa_grace_period_days,
    enforce_signing_mfa,
    require_totp_for_all_documents,
    allow_user_override,
    max_backup_codes,
    totp_window_tolerance,
    require_mfa_for_admin_actions,
    audit_totp_events,
    retention_period_days,
    allow_admin_override,
    emergency_access_codes
)
SELECT 
    o.id as organization_id,
    false as enforce_login_mfa, -- Start with policies disabled for existing orgs
    7 as login_mfa_grace_period_days,
    false as enforce_signing_mfa,
    false as require_totp_for_all_documents,
    true as allow_user_override,
    10 as max_backup_codes,
    1 as totp_window_tolerance,
    false as require_mfa_for_admin_actions,
    true as audit_totp_events,
    365 as retention_period_days,
    true as allow_admin_override,
    ARRAY[]::TEXT[] as emergency_access_codes
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM organization_totp_policies otp 
    WHERE otp.organization_id = o.id
);

-- Step 5: Create function to auto-create organization for new corporate signups
CREATE OR REPLACE FUNCTION auto_create_organization_for_corporate()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Only process corporate accounts with company domains
    IF NEW.account_type = 'corporate' AND NEW.company_domain IS NOT NULL AND NEW.company_domain != '' THEN
        
        -- Check if organization already exists for this domain
        SELECT id INTO org_id 
        FROM organizations 
        WHERE domain = NEW.company_domain;
        
        -- If no organization exists, create one
        IF org_id IS NULL THEN
            INSERT INTO organizations (name, domain, plan, status)
            VALUES (
                COALESCE(NEW.company_name, 'Unknown Company'),
                NEW.company_domain,
                'pro', -- Corporate accounts get pro plan by default
                'active'
            )
            RETURNING id INTO org_id;
            
            -- Create default TOTP policy for new organization
            INSERT INTO organization_totp_policies (organization_id)
            VALUES (org_id);
        END IF;
        
        -- Link user to organization
        NEW.organization_id = org_id;
        
        -- Create organization membership
        INSERT INTO user_organizations (user_id, organization_id, role, status)
        VALUES (
            NEW.id,
            org_id,
            CASE WHEN NEW.is_admin THEN 'admin' ELSE 'member' END,
            'active'
        )
        ON CONFLICT (user_id, organization_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for auto-organization creation
DROP TRIGGER IF EXISTS trigger_auto_create_organization ON user_profiles;
CREATE TRIGGER trigger_auto_create_organization
    BEFORE INSERT OR UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_organization_for_corporate();

-- Step 7: Update TOTP service to check organization policies
CREATE OR REPLACE FUNCTION check_user_totp_requirements(
    p_user_id UUID,
    p_context TEXT DEFAULT 'login'
) RETURNS JSONB AS $$
DECLARE
    v_user_config RECORD;
    v_org_policy RECORD;
    v_result JSONB;
BEGIN
    -- Get user TOTP config
    SELECT * INTO v_user_config
    FROM user_totp_configs
    WHERE user_id = p_user_id;
    
    -- Get organization policy if user belongs to an organization
    SELECT otp.* INTO v_org_policy
    FROM user_profiles up
    JOIN organization_totp_policies otp ON up.organization_id = otp.organization_id
    WHERE up.id = p_user_id;
    
    -- Build result
    v_result = jsonb_build_object(
        'user_has_totp', COALESCE(v_user_config.enabled, false),
        'user_login_mfa_enabled', COALESCE(v_user_config.login_mfa_enabled, false),
        'user_signing_mfa_enabled', COALESCE(v_user_config.signing_mfa_enabled, false),
        'organization_enforces_login_mfa', COALESCE(v_org_policy.enforce_login_mfa, false),
        'organization_enforces_signing_mfa', COALESCE(v_org_policy.enforce_signing_mfa, false),
        'organization_requires_all_documents', COALESCE(v_org_policy.require_totp_for_all_documents, false),
        'organization_allows_override', COALESCE(v_org_policy.allow_user_override, true)
    );
    
    -- Determine if TOTP is required for this context
    IF p_context = 'login' THEN
        v_result = v_result || jsonb_build_object(
            'totp_required', 
            COALESCE(v_user_config.login_mfa_enabled, false) OR 
            COALESCE(v_org_policy.enforce_login_mfa, false)
        );
    ELSIF p_context = 'signing' THEN
        v_result = v_result || jsonb_build_object(
            'totp_required',
            COALESCE(v_user_config.signing_mfa_enabled, false) OR 
            COALESCE(v_org_policy.enforce_signing_mfa, false) OR
            COALESCE(v_org_policy.require_totp_for_all_documents, false)
        );
    END IF;
    
    -- Check for exemptions
    IF EXISTS (
        SELECT 1 FROM organization_totp_exemptions ote
        JOIN user_profiles up ON up.organization_id = ote.organization_id
        WHERE up.id = p_user_id 
        AND ote.user_id = p_user_id
        AND ote.exemption_type IN ('both', p_context)
        AND (ote.expires_at IS NULL OR ote.expires_at > NOW())
    ) THEN
        v_result = v_result || jsonb_build_object('totp_required', false, 'exemption_active', true);
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_domain ON user_profiles(company_domain);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON user_profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_organizations_domain ON organizations(domain);

-- Step 9: Add helpful views for admin dashboard
CREATE OR REPLACE VIEW organization_summary AS
SELECT 
    o.id,
    o.name,
    o.domain,
    o.plan,
    o.status,
    COUNT(uo.user_id) as member_count,
    COUNT(CASE WHEN utc.enabled = true THEN 1 END) as totp_enabled_count,
    otp.enforce_login_mfa,
    otp.enforce_signing_mfa,
    o.created_at
FROM organizations o
LEFT JOIN user_organizations uo ON o.id = uo.organization_id AND uo.status = 'active'
LEFT JOIN user_profiles up ON uo.user_id = up.id
LEFT JOIN user_totp_configs utc ON up.id = utc.user_id
LEFT JOIN organization_totp_policies otp ON o.id = otp.organization_id
GROUP BY o.id, o.name, o.domain, o.plan, o.status, otp.enforce_login_mfa, otp.enforce_signing_mfa, o.created_at;

-- Step 10: Migration verification queries
-- Uncomment these to verify the migration worked correctly:

/*
-- Check organization creation
SELECT 'Organizations created' as check_type, COUNT(*) as count FROM organizations;

-- Check user-organization linking
SELECT 'Users linked to organizations' as check_type, COUNT(*) as count 
FROM user_profiles WHERE organization_id IS NOT NULL;

-- Check organization memberships
SELECT 'Organization memberships' as check_type, COUNT(*) as count FROM user_organizations;

-- Check TOTP policies created
SELECT 'TOTP policies created' as check_type, COUNT(*) as count FROM organization_totp_policies;

-- Check corporate users with organizations
SELECT 
    'Corporate users with organizations' as check_type,
    COUNT(*) as count 
FROM user_profiles up
JOIN organizations o ON up.organization_id = o.id
WHERE up.account_type = 'corporate';
*/

-- Migration complete!
-- This migration preserves all existing corporate functionality while adding organization TOTP capabilities

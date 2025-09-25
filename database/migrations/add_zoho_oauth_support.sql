-- =====================================================
-- TOTP Authentication System Database Schema
-- =====================================================

-- Add SSO providers table if not exists (for future OAuth integrations)
CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('saml', 'oauth', 'oidc')),
    config JSONB NOT NULL,
    active BOOLEAN DEFAULT true,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add SSO sessions table if not exists (for future OAuth integrations)
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES sso_providers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    external_user_id VARCHAR(255) NOT NULL,
    session_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add TOTP configurations table for MFA
CREATE TABLE IF NOT EXISTS user_totp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
    secret VARCHAR(255) NOT NULL,
    backup_codes TEXT[],
    enabled BOOLEAN DEFAULT false,
    login_mfa_enabled BOOLEAN DEFAULT false,
    signing_mfa_enabled BOOLEAN DEFAULT false,
    default_require_totp BOOLEAN DEFAULT false,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add TOTP requirement to signing requests
ALTER TABLE signing_requests
ADD COLUMN IF NOT EXISTS require_totp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS totp_required_by UUID REFERENCES user_profiles(id);

-- Add TOTP verification tracking to signers
ALTER TABLE signing_request_signers
ADD COLUMN IF NOT EXISTS totp_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS totp_verification_ip INET;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sso_providers_type ON sso_providers(type);
CREATE INDEX IF NOT EXISTS idx_sso_providers_active ON sso_providers(active);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_provider_id ON sso_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_totp_configs_user_id ON user_totp_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_totp_configs_enabled ON user_totp_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_user_totp_configs_login_mfa ON user_totp_configs(login_mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_user_totp_configs_signing_mfa ON user_totp_configs(signing_mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_signing_requests_require_totp ON signing_requests(require_totp);
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_totp_verified ON signing_request_signers(totp_verified);

-- Add RLS policies
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_totp_configs ENABLE ROW LEVEL SECURITY;

-- SSO providers policies (admin only)
CREATE POLICY "Admin can manage SSO providers" ON sso_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- SSO sessions policies (users can view their own)
CREATE POLICY "Users can view their own SSO sessions" ON sso_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can manage SSO sessions" ON sso_sessions
    FOR ALL USING (true);

-- TOTP configs policies (users can manage their own)
CREATE POLICY "Users can manage their own TOTP config" ON user_totp_configs
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service can manage TOTP configs" ON user_totp_configs
    FOR ALL USING (true);

-- Add updated_at trigger for sso_providers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sso_providers_updated_at 
    BEFORE UPDATE ON sso_providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_totp_configs_updated_at 
    BEFORE UPDATE ON user_totp_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

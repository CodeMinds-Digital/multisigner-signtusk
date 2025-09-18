-- Database schema updates for Integration Layer and Compliance Features
-- Run this after the main SUPABASE_SETUP.sql

-- =============================================
-- INTEGRATION LAYER TABLES
-- =============================================

-- Webhook endpoints table
CREATE TABLE IF NOT EXISTS webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    headers JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    response_status INTEGER,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SSO providers table
CREATE TABLE IF NOT EXISTS sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('saml', 'oauth', 'oidc')),
    config JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    organization_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SSO sessions table
CREATE TABLE IF NOT EXISTS sso_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    external_user_id TEXT NOT NULL,
    session_data JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third-party connectors table
CREATE TABLE IF NOT EXISTS third_party_connectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('crm', 'erp', 'storage', 'email', 'calendar', 'other')),
    provider TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync operations table
CREATE TABLE IF NOT EXISTS sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id UUID NOT NULL REFERENCES third_party_connectors(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('create', 'update', 'delete', 'sync')),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    data JSONB NOT NULL DEFAULT '{}'
);

-- =============================================
-- COMPLIANCE & LEGAL TABLES
-- =============================================

-- Digital certificates table
CREATE TABLE IF NOT EXISTS digital_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_type TEXT NOT NULL CHECK (certificate_type IN ('self_signed', 'ca_issued', 'qualified')),
    certificate_pem TEXT NOT NULL,
    private_key_pem TEXT NOT NULL,
    public_key_pem TEXT NOT NULL,
    subject JSONB NOT NULL DEFAULT '{}',
    issuer JSONB NOT NULL DEFAULT '{}',
    serial_number TEXT NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    fingerprint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Digital signatures table
CREATE TABLE IF NOT EXISTS digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    signer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    certificate_id UUID NOT NULL REFERENCES digital_certificates(id) ON DELETE RESTRICT,
    signature_data TEXT NOT NULL,
    signature_algorithm TEXT NOT NULL DEFAULT 'SHA256withRSA',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    tsa_timestamp TEXT,
    signature_hash TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'valid' CHECK (verification_status IN ('valid', 'invalid', 'unknown')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Certificate revocations table
CREATE TABLE IF NOT EXISTS certificate_revocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES digital_certificates(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance frameworks table
CREATE TABLE IF NOT EXISTS compliance_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    requirements JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, region)
);

-- Audit trails table (enhanced)
CREATE TABLE IF NOT EXISTS audit_trails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    compliance_frameworks TEXT[] DEFAULT '{}'
);

-- Consent records table
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    consent_type TEXT NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    evidence JSONB DEFAULT '{}'
);

-- Legal documents table
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('terms_of_service', 'privacy_policy', 'consent_form', 'disclosure', 'other')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    jurisdiction TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email confirmations table
CREATE TABLE IF NOT EXISTS email_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    confirmation_token TEXT NOT NULL UNIQUE,
    confirmation_type TEXT NOT NULL CHECK (confirmation_type IN ('registration', 'email_change', 'password_reset')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_data JSONB DEFAULT '{}'
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_user_id ON webhook_endpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON webhook_endpoints(active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_endpoint_id ON webhook_events(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- SSO indexes
CREATE INDEX IF NOT EXISTS idx_sso_providers_active ON sso_providers(active);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_expires_at ON sso_sessions(expires_at);

-- Connector indexes
CREATE INDEX IF NOT EXISTS idx_third_party_connectors_user_id ON third_party_connectors(user_id);
CREATE INDEX IF NOT EXISTS idx_third_party_connectors_type ON third_party_connectors(type);
CREATE INDEX IF NOT EXISTS idx_sync_operations_connector_id ON sync_operations(connector_id);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON sync_operations(status);

-- Certificate indexes
CREATE INDEX IF NOT EXISTS idx_digital_certificates_user_id ON digital_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_status ON digital_certificates(status);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_valid_to ON digital_certificates(valid_to);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_document_id ON digital_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_digital_signatures_signer_id ON digital_signatures(signer_id);

-- Compliance indexes
CREATE INDEX IF NOT EXISTS idx_audit_trails_user_id ON audit_trails(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trails_timestamp ON audit_trails(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_trails_action ON audit_trails(action);
CREATE INDEX IF NOT EXISTS idx_audit_trails_resource_type ON audit_trails(resource_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_consent_date ON consent_records(consent_date);

-- Email confirmation indexes
CREATE INDEX IF NOT EXISTS idx_email_confirmations_email ON email_confirmations(email);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_token ON email_confirmations(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_email_confirmations_expires_at ON email_confirmations(expires_at);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_party_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_confirmations ENABLE ROW LEVEL SECURITY;

-- Webhook policies
CREATE POLICY "Users can manage their own webhooks" ON webhook_endpoints
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their webhook events" ON webhook_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM webhook_endpoints 
            WHERE webhook_endpoints.id = webhook_events.webhook_endpoint_id 
            AND webhook_endpoints.user_id = auth.uid()
        )
    );

-- SSO policies
CREATE POLICY "Admins can manage SSO providers" ON sso_providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.user_id = auth.uid() 
            AND admin_users.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Users can view their SSO sessions" ON sso_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Connector policies
CREATE POLICY "Users can manage their own connectors" ON third_party_connectors
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their sync operations" ON sync_operations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM third_party_connectors 
            WHERE third_party_connectors.id = sync_operations.connector_id 
            AND third_party_connectors.user_id = auth.uid()
        )
    );

-- Certificate policies
CREATE POLICY "Users can manage their own certificates" ON digital_certificates
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view signatures on their documents" ON digital_signatures
    FOR SELECT USING (
        auth.uid() = signer_id OR
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = digital_signatures.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- Compliance policies
CREATE POLICY "Everyone can read compliance frameworks" ON compliance_frameworks
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own audit trails" ON audit_trails
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consent records" ON consent_records
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Everyone can read active legal documents" ON legal_documents
    FOR SELECT USING (status = 'active');

-- Email confirmation policies
CREATE POLICY "Users can view their own email confirmations" ON email_confirmations
    FOR SELECT USING (
        email IN (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_webhook_endpoints_updated_at BEFORE UPDATE ON webhook_endpoints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sso_providers_updated_at BEFORE UPDATE ON sso_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_third_party_connectors_updated_at BEFORE UPDATE ON third_party_connectors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_digital_certificates_updated_at BEFORE UPDATE ON digital_certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_compliance_frameworks_updated_at BEFORE UPDATE ON compliance_frameworks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_legal_documents_updated_at BEFORE UPDATE ON legal_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert default compliance frameworks
INSERT INTO compliance_frameworks (name, region, requirements, active) VALUES
('eIDAS (EU)', 'EU', '[
    {
        "id": "eidas-1",
        "name": "Qualified Electronic Signatures",
        "description": "Support for qualified electronic signatures with qualified certificates",
        "mandatory": true,
        "implementation_status": "partial",
        "evidence_required": ["certificate_validation", "signature_verification", "timestamp_authority"]
    },
    {
        "id": "eidas-2", 
        "name": "Identity Verification",
        "description": "Strong identity verification for signers",
        "mandatory": true,
        "implementation_status": "implemented",
        "evidence_required": ["identity_verification_logs", "authentication_records"]
    }
]', true),
('ESIGN Act (US)', 'US', '[
    {
        "id": "esign-1",
        "name": "Intent to Sign",
        "description": "Clear indication of intent to sign electronically", 
        "mandatory": true,
        "implementation_status": "implemented",
        "evidence_required": ["consent_records", "signature_intent_logs"]
    },
    {
        "id": "esign-2",
        "name": "Record Retention",
        "description": "Proper retention of electronic records and signatures",
        "mandatory": true, 
        "implementation_status": "implemented",
        "evidence_required": ["retention_policies", "backup_procedures"]
    }
]', true)
ON CONFLICT (name, region) DO NOTHING;

-- Insert default legal documents
INSERT INTO legal_documents (type, title, content, version, effective_date, jurisdiction, language, status) VALUES
('terms_of_service', 'Terms of Service', 'Default Terms of Service content for SignTusk platform...', 'v1.0.0', NOW(), 'Global', 'en', 'active'),
('privacy_policy', 'Privacy Policy', 'Default Privacy Policy content for SignTusk platform...', 'v1.0.0', NOW(), 'Global', 'en', 'active'),
('consent_form', 'Electronic Signature Consent', 'Default Electronic Signature Consent form...', 'v1.0.0', NOW(), 'Global', 'en', 'active')
ON CONFLICT DO NOTHING;

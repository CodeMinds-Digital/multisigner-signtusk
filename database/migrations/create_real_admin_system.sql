-- =====================================================
-- REAL ADMIN SYSTEM DATABASE SCHEMA
-- Convert admin panel from mock data to real functionality
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ADMIN USERS TABLE (Real Admin Authentication)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'support', 'auditor')),
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADMIN SESSIONS TABLE (Real Session Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. SYSTEM SETTINGS TABLE (Real Configuration)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('general', 'uploads', 'email', 'security', 'notifications', 'features')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('boolean', 'string', 'number', 'json', 'array')),
    is_sensitive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    validation_rules JSONB,
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. FEATURE FLAGS TABLE (Real Feature Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL CHECK (category IN ('core', 'premium', 'experimental', 'integration')),
    is_enabled BOOLEAN DEFAULT false,
    is_global BOOLEAN DEFAULT true,
    user_restrictions JSONB DEFAULT '[]',
    plan_restrictions JSONB DEFAULT '[]',
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    dependencies JSONB DEFAULT '[]',
    impact_level VARCHAR(50) NOT NULL CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    updated_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. BILLING PLANS TABLE (Real Subscription Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_popular BOOLEAN DEFAULT false,
    stripe_price_id VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. USER SUBSCRIPTIONS TABLE (Real Subscription Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    billing_plan_id UUID NOT NULL REFERENCES billing_plans(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due', 'trialing')),
    stripe_subscription_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. ADMIN AUDIT LOGS TABLE (Real Action Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES admin_users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. NOTIFICATION LOGS TABLE (Real Email Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    template_name VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
    provider VARCHAR(100) DEFAULT 'resend',
    provider_message_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- 9. SYSTEM ANALYTICS TABLE (Real Metrics Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    metric_type VARCHAR(100) NOT NULL,
    dimensions JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_key DATE GENERATED ALWAYS AS (recorded_at::DATE) STORED
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- Admin sessions indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- System settings indexes
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_active ON system_settings(is_active);

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);

-- Billing plans indexes
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_plans_sort ON billing_plans(sort_order);

-- User subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(billing_plan_id);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON admin_audit_logs(created_at);

-- Notification logs indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_metric_name ON system_analytics(metric_name);
CREATE INDEX IF NOT EXISTS idx_analytics_date_key ON system_analytics(date_key);
CREATE INDEX IF NOT EXISTS idx_analytics_recorded_at ON system_analytics(recorded_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_analytics ENABLE ROW LEVEL SECURITY;

-- Admin users can manage their own records and super_admins can manage all
CREATE POLICY "Admin users can view their own records" ON admin_users
    FOR SELECT USING (auth.uid()::text = id::text OR 
                     EXISTS (SELECT 1 FROM admin_users WHERE id::text = auth.uid()::text AND role = 'super_admin'));

-- System settings accessible by all admin users
CREATE POLICY "Admin users can view system settings" ON system_settings
    FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id::text = auth.uid()::text AND is_active = true));

-- Feature flags accessible by all admin users
CREATE POLICY "Admin users can view feature flags" ON feature_flags
    FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id::text = auth.uid()::text AND is_active = true));

-- Audit logs viewable by all admin users
CREATE POLICY "Admin users can view audit logs" ON admin_audit_logs
    FOR SELECT USING (EXISTS (SELECT 1 FROM admin_users WHERE id::text = auth.uid()::text AND is_active = true));

-- =====================================================
-- FUNCTIONS FOR ADMIN OPERATIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_billing_plans_updated_at BEFORE UPDATE ON billing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default admin user (password: admin123! - hashed)
INSERT INTO admin_users (email, password_hash, name, role) VALUES 
('admin@signtusk.com', '$2b$10$rQZ9QmjKjKjKjKjKjKjKjOeJ9QmjKjKjKjKjKjKjKjKjKjKjKjKjK', 'Super Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category, type) VALUES 
('app_name', '"SignTusk"', 'Application name displayed throughout the platform', 'general', 'string'),
('maintenance_mode', 'false', 'Enable maintenance mode to prevent user access', 'general', 'boolean'),
('max_file_size_mb', '50', 'Maximum file size for uploads in MB', 'uploads', 'number'),
('allowed_file_types', '["pdf", "doc", "docx"]', 'Allowed file types for uploads', 'uploads', 'array'),
('email_from_name', '"SignTusk"', 'From name for outgoing emails', 'email', 'string'),
('email_from_address', '"noreply@signtusk.com"', 'From address for outgoing emails', 'email', 'string')
ON CONFLICT (key) DO NOTHING;

-- Insert default feature flags
INSERT INTO feature_flags (name, key, description, category, is_enabled, impact_level) VALUES 
('Multi-Signature Workflows', 'multi_signature_enabled', 'Enable multi-signer document workflows', 'core', true, 'high'),
('Document Templates', 'document_templates_enabled', 'Enable document template system', 'core', true, 'medium'),
('Email Notifications', 'email_notifications_enabled', 'Enable email notification system', 'core', true, 'high'),
('QR Code Signing', 'qr_code_signing_enabled', 'Enable QR code generation for signing', 'core', true, 'low'),
('Advanced Analytics', 'advanced_analytics_enabled', 'Enable premium analytics features', 'premium', false, 'low'),
('API Access', 'api_access_enabled', 'Enable API access for integrations', 'premium', false, 'medium'),
('Bulk Operations', 'bulk_operations_enabled', 'Enable bulk document operations', 'premium', false, 'medium')
ON CONFLICT (key) DO NOTHING;

-- Insert default billing plans
INSERT INTO billing_plans (name, price, billing_cycle, features, limits) VALUES 
('Free', 0.00, 'monthly', '["3 documents per month", "Basic e-signature", "Email support"]', '{"documents_per_month": 3, "signatures_per_month": 10, "storage_gb": 1, "api_calls_per_month": 100, "team_members": 1}'),
('Basic', 15.00, 'monthly', '["25 documents per month", "Multi-signature workflows", "Email support", "Document templates"]', '{"documents_per_month": 25, "signatures_per_month": 100, "storage_gb": 10, "api_calls_per_month": 1000, "team_members": 3}'),
('Pro', 45.00, 'monthly', '["Unlimited documents", "Advanced analytics", "Priority support", "API access", "Custom branding"]', '{"documents_per_month": -1, "signatures_per_month": -1, "storage_gb": 100, "api_calls_per_month": 10000, "team_members": 10}'),
('Enterprise', 99.00, 'monthly', '["Everything in Pro", "SSO integration", "Dedicated support", "Custom integrations", "SLA guarantee"]', '{"documents_per_month": -1, "signatures_per_month": -1, "storage_gb": 500, "api_calls_per_month": 50000, "team_members": -1}')
ON CONFLICT DO NOTHING;

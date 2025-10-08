-- Send Tab: Webhooks and API Infrastructure
-- Migration: 20250106_send_webhooks_api.sql

-- ============================================================================
-- WEBHOOKS
-- ============================================================================

-- Webhooks table
CREATE TABLE IF NOT EXISTS send_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook logs table
CREATE TABLE IF NOT EXISTS send_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES send_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- API KEYS
-- ============================================================================

-- API keys table
CREATE TABLE IF NOT EXISTS send_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes JSONB DEFAULT '["read", "write"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API key usage logs
CREATE TABLE IF NOT EXISTS send_api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES send_api_keys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

-- Integrations table (Slack, email, etc.)
CREATE TABLE IF NOT EXISTS send_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('slack', 'email', 'zapier', 'custom')),
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_send_webhooks_user ON send_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_send_webhooks_enabled ON send_webhooks(enabled);
CREATE INDEX IF NOT EXISTS idx_send_webhook_logs_webhook ON send_webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_send_webhook_logs_status ON send_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_send_api_keys_user ON send_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_send_api_keys_prefix ON send_api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_send_api_key_usage_key ON send_api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_send_integrations_user ON send_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_send_integrations_type ON send_integrations(type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE send_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_api_key_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_integrations ENABLE ROW LEVEL SECURITY;

-- Webhooks: Users can manage their own webhooks
CREATE POLICY "Users can view their webhooks" ON send_webhooks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create webhooks" ON send_webhooks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their webhooks" ON send_webhooks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their webhooks" ON send_webhooks
  FOR DELETE USING (user_id = auth.uid());

-- Webhook logs: Users can view logs for their webhooks
CREATE POLICY "Users can view webhook logs" ON send_webhook_logs
  FOR SELECT USING (
    webhook_id IN (SELECT id FROM send_webhooks WHERE user_id = auth.uid())
  );

-- API keys: Users can manage their own API keys
CREATE POLICY "Users can view their API keys" ON send_api_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create API keys" ON send_api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their API keys" ON send_api_keys
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their API keys" ON send_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- Integrations: Users can manage their own integrations
CREATE POLICY "Users can view their integrations" ON send_integrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create integrations" ON send_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their integrations" ON send_integrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their integrations" ON send_integrations
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_send_webhooks_updated_at
  BEFORE UPDATE ON send_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_api_keys_updated_at
  BEFORE UPDATE ON send_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_integrations_updated_at
  BEFORE UPDATE ON send_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


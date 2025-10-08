-- Send Tab: Branding and Custom Domains
-- Migration: 20250107_send_branding_domains.sql

-- ============================================================================
-- BRANDING SETTINGS
-- ============================================================================

-- Branding settings table
CREATE TABLE IF NOT EXISTS send_branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#10b981',
  secondary_color TEXT DEFAULT '#059669',
  accent_color TEXT,
  background_color TEXT,
  text_color TEXT,
  font_family TEXT DEFAULT 'Inter',
  heading_font TEXT,
  custom_css TEXT,
  remove_branding BOOLEAN DEFAULT false,
  powered_by_text TEXT,
  custom_footer TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================================================
-- CUSTOM DOMAINS
-- ============================================================================

-- Custom domains table
CREATE TABLE IF NOT EXISTS send_custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  team_id UUID,
  domain TEXT NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT false,
  verification_token TEXT NOT NULL,
  ssl_status TEXT DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'failed')),
  dns_records JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_send_branding_settings_user ON send_branding_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_send_branding_settings_team ON send_branding_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_send_custom_domains_user ON send_custom_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_send_custom_domains_domain ON send_custom_domains(domain);
CREATE INDEX IF NOT EXISTS idx_send_custom_domains_verified ON send_custom_domains(verified);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE send_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_custom_domains ENABLE ROW LEVEL SECURITY;

-- Branding settings: Users can manage their own settings
CREATE POLICY "Users can view their branding settings" ON send_branding_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create branding settings" ON send_branding_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their branding settings" ON send_branding_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their branding settings" ON send_branding_settings
  FOR DELETE USING (user_id = auth.uid());

-- Custom domains: Users can manage their own domains
CREATE POLICY "Users can view their custom domains" ON send_custom_domains
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create custom domains" ON send_custom_domains
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their custom domains" ON send_custom_domains
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their custom domains" ON send_custom_domains
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_send_branding_settings_updated_at
  BEFORE UPDATE ON send_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_send_custom_domains_updated_at
  BEFORE UPDATE ON send_custom_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


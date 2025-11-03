-- Migration: Create signature templates table
-- Description: Adds support for reusable signature request templates
-- Author: AI Assistant
-- Date: 2025-11-03

-- Create signature_templates table
CREATE TABLE IF NOT EXISTS signature_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  default_signers JSONB DEFAULT '[]' NOT NULL,
  signing_order VARCHAR(20) DEFAULT 'sequential' NOT NULL,
  require_totp BOOLEAN DEFAULT false NOT NULL,
  expires_in_days INTEGER DEFAULT 30 NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT signature_templates_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT signature_templates_expires_in_days_range CHECK (expires_in_days >= 1 AND expires_in_days <= 365),
  CONSTRAINT signature_templates_usage_count_positive CHECK (usage_count >= 0),
  CONSTRAINT signature_templates_version_positive CHECK (version >= 1)
);

-- Create indexes for performance
CREATE INDEX idx_signature_templates_user_id ON signature_templates(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_signature_templates_is_public ON signature_templates(is_public) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_signature_templates_created_at ON signature_templates(created_at DESC);
CREATE INDEX idx_signature_templates_usage_count ON signature_templates(usage_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_signature_templates_name_search ON signature_templates USING gin(to_tsvector('english', name));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_signature_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_signature_templates_updated_at
  BEFORE UPDATE ON signature_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_templates_updated_at();

-- Enable Row Level Security
ALTER TABLE signature_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own templates
CREATE POLICY signature_templates_select_own
  ON signature_templates
  FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

-- Users can insert their own templates
CREATE POLICY signature_templates_insert_own
  ON signature_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY signature_templates_update_own
  ON signature_templates
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY signature_templates_delete_own
  ON signature_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comment
COMMENT ON TABLE signature_templates IS 'Stores reusable signature request templates for quick workflow creation';
COMMENT ON COLUMN signature_templates.default_signers IS 'JSONB array of default signer configurations with email, name, signing_order, and placeholder fields';
COMMENT ON COLUMN signature_templates.signing_order IS 'Signing order type: sequential or parallel';
COMMENT ON COLUMN signature_templates.usage_count IS 'Number of times this template has been used to create signature requests';
COMMENT ON COLUMN signature_templates.version IS 'Template version number, incremented on each update';


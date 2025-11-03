-- Migration: Create signature field configuration tables
-- Description: Adds tables for document field configurations and field templates
-- Author: AI Assistant
-- Date: 2025-11-03
-- Related: Comment 5 - FieldService relies on non-existent tables

-- ============================================================================
-- Table: document_field_configurations
-- Description: Stores field configurations for documents
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_field_configurations (
  document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT document_field_configurations_fields_is_array CHECK (jsonb_typeof(fields) = 'array')
);

-- Create indexes for performance
CREATE INDEX idx_document_field_configurations_user_id ON document_field_configurations(user_id);
CREATE INDEX idx_document_field_configurations_created_at ON document_field_configurations(created_at DESC);
CREATE INDEX idx_document_field_configurations_fields_gin ON document_field_configurations USING gin(fields);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_document_field_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_field_configurations_updated_at
  BEFORE UPDATE ON document_field_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_document_field_configurations_updated_at();

-- Enable Row Level Security
ALTER TABLE document_field_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own field configurations
CREATE POLICY document_field_configurations_select_own
  ON document_field_configurations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own field configurations
CREATE POLICY document_field_configurations_insert_own
  ON document_field_configurations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own field configurations
CREATE POLICY document_field_configurations_update_own
  ON document_field_configurations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own field configurations
CREATE POLICY document_field_configurations_delete_own
  ON document_field_configurations
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE document_field_configurations IS 'Stores field configurations for documents including signature fields, text fields, date fields, etc.';
COMMENT ON COLUMN document_field_configurations.fields IS 'JSONB array of field configurations with type, position, size, assigned_to, and other properties';

-- ============================================================================
-- Table: field_templates
-- Description: Stores reusable field templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT field_templates_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
  CONSTRAINT field_templates_fields_is_array CHECK (jsonb_typeof(fields) = 'array'),
  CONSTRAINT field_templates_usage_count_positive CHECK (usage_count >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_field_templates_user_id ON field_templates(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_templates_is_public ON field_templates(is_public) WHERE deleted_at IS NULL AND is_public = true;
CREATE INDEX idx_field_templates_created_at ON field_templates(created_at DESC);
CREATE INDEX idx_field_templates_usage_count ON field_templates(usage_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_templates_category ON field_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_field_templates_tags_gin ON field_templates USING gin(tags);
CREATE INDEX idx_field_templates_fields_gin ON field_templates USING gin(fields);
CREATE INDEX idx_field_templates_name_search ON field_templates USING gin(to_tsvector('english', name));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_field_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_field_templates_updated_at
  BEFORE UPDATE ON field_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_field_templates_updated_at();

-- Enable Row Level Security
ALTER TABLE field_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own templates and public templates
CREATE POLICY field_templates_select_own_or_public
  ON field_templates
  FOR SELECT
  USING (user_id = auth.uid() OR is_public = true);

-- Users can insert their own templates
CREATE POLICY field_templates_insert_own
  ON field_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own templates
CREATE POLICY field_templates_update_own
  ON field_templates
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own templates
CREATE POLICY field_templates_delete_own
  ON field_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Add comments
COMMENT ON TABLE field_templates IS 'Stores reusable field templates for quick document field configuration';
COMMENT ON COLUMN field_templates.fields IS 'JSONB array of field configurations that can be applied to documents';
COMMENT ON COLUMN field_templates.is_public IS 'Whether this template is available to all users';
COMMENT ON COLUMN field_templates.category IS 'Template category for organization (e.g., contract, nda, invoice)';
COMMENT ON COLUMN field_templates.tags IS 'Array of tags for filtering and search';
COMMENT ON COLUMN field_templates.usage_count IS 'Number of times this template has been used';

-- ============================================================================
-- RPC Function: increment_field_template_usage
-- Description: Atomically increment field template usage count
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_field_template_usage(
  p_template_id UUID
)
RETURNS TABLE (
  new_usage_count INT
) AS $$
DECLARE
  v_usage_count INT;
BEGIN
  -- Atomically increment usage_count
  UPDATE field_templates
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE id = p_template_id
  RETURNING usage_count INTO v_usage_count;

  -- Return the new value
  RETURN QUERY SELECT v_usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION increment_field_template_usage IS 'Atomically increments field template usage_count';

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_field_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_field_template_usage(UUID) TO service_role;


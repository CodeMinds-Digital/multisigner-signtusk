-- =====================================================
-- DATABASE FUNCTIONS FOR DOCUMENT MANAGEMENT
-- =====================================================

-- Function to check if a document type can be deleted
CREATE OR REPLACE FUNCTION can_delete_document_type(
  type_name TEXT,
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_count INTEGER;
BEGIN
  -- Count templates using this document type
  SELECT COUNT(*)
  INTO template_count
  FROM document_templates
  WHERE type = type_name
    AND user_id = user_id_param;
  
  -- Return true if no templates are using this type
  RETURN template_count = 0;
END;
$$;

-- Function to get template count for a document type
CREATE OR REPLACE FUNCTION get_document_type_template_count(
  type_name TEXT,
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO template_count
  FROM document_templates
  WHERE type = type_name
    AND user_id = user_id_param;
  
  RETURN template_count;
END;
$$;

-- Function to check if a category can be deleted
CREATE OR REPLACE FUNCTION can_delete_category(
  category_name TEXT,
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_count INTEGER;
BEGIN
  -- Count templates using this category
  SELECT COUNT(*)
  INTO template_count
  FROM document_templates
  WHERE category = category_name
    AND user_id = user_id_param;
  
  -- Return true if no templates are using this category
  RETURN template_count = 0;
END;
$$;

-- Function to get template count for a category
CREATE OR REPLACE FUNCTION get_category_template_count(
  category_name TEXT,
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO template_count
  FROM document_templates
  WHERE category = category_name
    AND user_id = user_id_param;
  
  RETURN template_count;
END;
$$;

-- Function to reassign templates when deleting a document type
CREATE OR REPLACE FUNCTION reassign_document_type_templates(
  old_type_name TEXT,
  new_type_name TEXT,
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all templates using the old type to use the new type
  UPDATE document_templates
  SET type = new_type_name,
      updated_at = NOW()
  WHERE type = old_type_name
    AND user_id = user_id_param;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Function to reassign templates when deleting a category
CREATE OR REPLACE FUNCTION reassign_category_templates(
  old_category_name TEXT,
  new_category_name TEXT,
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update all templates using the old category to use the new category
  UPDATE document_templates
  SET category = new_category_name,
      updated_at = NOW()
  WHERE category = old_category_name
    AND user_id = user_id_param;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$;

-- Function to get document types with template counts
CREATE OR REPLACE FUNCTION get_document_types_with_counts(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  is_system BOOLEAN,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  template_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.name,
    dt.description,
    dt.color,
    dt.icon,
    dt.is_system,
    dt.user_id,
    dt.created_at,
    dt.updated_at,
    COALESCE(tc.template_count, 0) as template_count
  FROM document_types dt
  LEFT JOIN (
    SELECT 
      type,
      COUNT(*) as template_count
    FROM document_templates
    WHERE user_id = user_id_param
    GROUP BY type
  ) tc ON dt.name = tc.type
  WHERE dt.is_system = true 
    OR dt.user_id = user_id_param
  ORDER BY dt.is_system DESC, dt.name ASC;
END;
$$;

-- Function to get categories with template counts
CREATE OR REPLACE FUNCTION get_categories_with_counts(user_id_param UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  is_system BOOLEAN,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  template_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.name,
    dc.description,
    dc.color,
    dc.icon,
    dc.is_system,
    dc.user_id,
    dc.created_at,
    dc.updated_at,
    COALESCE(tc.template_count, 0) as template_count
  FROM document_categories dc
  LEFT JOIN (
    SELECT 
      category,
      COUNT(*) as template_count
    FROM document_templates
    WHERE user_id = user_id_param
    GROUP BY category
  ) tc ON dc.name = tc.category
  WHERE dc.is_system = true 
    OR dc.user_id = user_id_param
  ORDER BY dc.is_system DESC, dc.name ASC;
END;
$$;

-- =====================================================
-- MULTI-SIGNATURE WORKFLOW TABLES
-- =====================================================

-- Signature Requests Table
CREATE TABLE IF NOT EXISTS signature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'expired', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 1,
  settings JSONB DEFAULT '{}',
  audit_trail JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signature Request Signers Table
CREATE TABLE IF NOT EXISTS signature_request_signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100),
  order_number INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  signed_at TIMESTAMP WITH TIME ZONE,
  declined_at TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  reminders_sent INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  access_code VARCHAR(10),
  ip_address INET,
  user_agent TEXT,
  signature_image TEXT, -- Base64 or URL
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signing Sessions Table
CREATE TABLE IF NOT EXISTS signing_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE NOT NULL,
  signer_id UUID REFERENCES signature_request_signers(id) ON DELETE CASCADE NOT NULL,
  signer_email VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'expired')),
  access_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  access_code VARCHAR(10),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  fields_to_complete JSONB DEFAULT '[]',
  fields_completed JSONB DEFAULT '[]',
  current_field_id UUID,
  session_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Field Assignments Table
CREATE TABLE IF NOT EXISTS field_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE NOT NULL,
  field_id UUID NOT NULL, -- References schema field
  field_name VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL,
  assignment_type VARCHAR(20) DEFAULT 'specific' CHECK (assignment_type IN ('specific', 'any', 'all')),
  assigned_signers JSONB DEFAULT '[]', -- Array of signer assignments
  dependencies JSONB DEFAULT '[]', -- Field dependencies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signature Workflow Templates Table
CREATE TABLE IF NOT EXISTS signature_workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  steps JSONB DEFAULT '[]',
  default_signers JSONB DEFAULT '[]',
  default_settings JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signature_requests_created_by ON signature_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_template ON signature_requests(document_template_id);

CREATE INDEX IF NOT EXISTS idx_signers_signature_request ON signature_request_signers(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signers_email ON signature_request_signers(email);
CREATE INDEX IF NOT EXISTS idx_signers_status ON signature_request_signers(status);
CREATE INDEX IF NOT EXISTS idx_signers_order ON signature_request_signers(order_number);

CREATE INDEX IF NOT EXISTS idx_signing_sessions_request ON signing_sessions(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_signer ON signing_sessions(signer_id);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_token ON signing_sessions(access_token);
CREATE INDEX IF NOT EXISTS idx_signing_sessions_status ON signing_sessions(status);

CREATE INDEX IF NOT EXISTS idx_field_assignments_request ON field_assignments(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_field_assignments_field ON field_assignments(field_id);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_created_by ON signature_workflow_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_templates_public ON signature_workflow_templates(is_public);

-- Enable RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_request_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Signature Requests
CREATE POLICY "Users can view own signature requests" ON signature_requests
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create signature requests" ON signature_requests
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own signature requests" ON signature_requests
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own signature requests" ON signature_requests
  FOR DELETE USING (auth.uid() = created_by);

-- RLS Policies for Signers
CREATE POLICY "Users can view signers for own requests" ON signature_request_signers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create signers for own requests" ON signature_request_signers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update signers for own requests" ON signature_request_signers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for Signing Sessions
CREATE POLICY "Users can view sessions for own requests" ON signing_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Signers can view own sessions" ON signing_sessions
  FOR SELECT USING (signer_email = auth.email());

CREATE POLICY "Users can create sessions for own requests" ON signing_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for Field Assignments
CREATE POLICY "Users can manage field assignments for own requests" ON field_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM signature_requests
      WHERE id = signature_request_id AND created_by = auth.uid()
    )
  );

-- RLS Policies for Workflow Templates
CREATE POLICY "Users can view public and own templates" ON signature_workflow_templates
  FOR SELECT USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create own templates" ON signature_workflow_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own templates" ON signature_workflow_templates
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own templates" ON signature_workflow_templates
  FOR DELETE USING (auth.uid() = created_by);

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION can_delete_document_type(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_type_template_count(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_category(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_template_count(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reassign_document_type_templates(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reassign_category_templates(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_types_with_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_categories_with_counts(UUID) TO authenticated;

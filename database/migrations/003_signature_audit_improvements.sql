-- Migration: Enhance signature audit logging
-- Description: Adds comprehensive audit logging for signature operations
-- Author: AI Assistant
-- Date: 2025-11-03

-- Add audit columns to signing_requests if they don't exist
ALTER TABLE signing_requests 
  ADD COLUMN IF NOT EXISTS last_modified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add audit columns to signing_request_signers if they don't exist
ALTER TABLE signing_request_signers 
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS location JSONB;

-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_request_id UUID REFERENCES signing_requests(id) ON DELETE CASCADE,
  signer_id UUID,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}' NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT signature_audit_log_action_not_empty CHECK (char_length(action) > 0)
);

-- Create indexes for audit log queries
CREATE INDEX idx_signature_audit_log_request_id 
  ON signature_audit_log(signature_request_id);

CREATE INDEX idx_signature_audit_log_created_at 
  ON signature_audit_log(created_at DESC);

CREATE INDEX idx_signature_audit_log_action 
  ON signature_audit_log(action);

CREATE INDEX idx_signature_audit_log_signer_id 
  ON signature_audit_log(signer_id) 
  WHERE signer_id IS NOT NULL;

-- Create trigger to update last_modified_at on signing_requests
CREATE OR REPLACE FUNCTION update_signing_requests_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_signing_requests_last_modified
  BEFORE UPDATE ON signing_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signing_requests_last_modified();

-- Create function to log signature actions
CREATE OR REPLACE FUNCTION log_signature_action(
  p_signature_request_id UUID,
  p_signer_id UUID,
  p_action VARCHAR(100),
  p_details JSONB DEFAULT '{}',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO signature_audit_log (
    signature_request_id,
    signer_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_signature_request_id,
    p_signer_id,
    p_action,
    p_details,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically log signature events
CREATE OR REPLACE FUNCTION auto_log_signature_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM log_signature_action(
      NEW.signature_request_id,
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  
  -- Log signature completion
  IF TG_OP = 'UPDATE' AND OLD.signed_at IS NULL AND NEW.signed_at IS NOT NULL THEN
    PERFORM log_signature_action(
      NEW.signature_request_id,
      NEW.id,
      'document_signed',
      jsonb_build_object(
        'signed_at', NEW.signed_at,
        'signature_method', NEW.signature_method,
        'ip_address', NEW.ip_address
      ),
      NEW.ip_address,
      NEW.user_agent
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_log_signer_events
  AFTER UPDATE ON signing_request_signers
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_signature_events();

-- Enable Row Level Security on audit log
ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
-- Users can view audit logs for their own requests
CREATE POLICY signature_audit_log_select_own
  ON signature_audit_log
  FOR SELECT
  USING (
    signature_request_id IN (
      SELECT id FROM signing_requests WHERE initiated_by = auth.uid()
    )
    OR signer_id = auth.uid()
  );

-- Only system can insert audit logs (via triggers/functions)
CREATE POLICY signature_audit_log_insert_system
  ON signature_audit_log
  FOR INSERT
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE signature_audit_log IS 'Comprehensive audit trail for all signature-related actions';
COMMENT ON COLUMN signature_audit_log.action IS 'Action type: created, viewed, signed, declined, cancelled, expired, reminded, etc.';
COMMENT ON COLUMN signature_audit_log.details IS 'JSONB object containing action-specific details and metadata';
COMMENT ON FUNCTION log_signature_action IS 'Helper function to manually log signature actions with full context';
COMMENT ON FUNCTION auto_log_signature_events IS 'Trigger function that automatically logs important signature events';


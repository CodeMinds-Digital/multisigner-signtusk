-- Migration: Create signature RPC functions
-- Description: Adds PostgreSQL RPC functions for atomic signature operations
-- Author: AI Assistant
-- Date: 2025-11-03
-- Related: Comment 4 - Missing PostgreSQL RPC functions

-- ============================================================================
-- Function: increment_completed_signers
-- Description: Atomically increment completed_signers and update status
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_completed_signers(
  p_signing_request_id UUID,
  p_total_signers INT
)
RETURNS TABLE (
  new_completed_signers INT,
  new_status TEXT
) AS $$
DECLARE
  v_completed_signers INT;
  v_status TEXT;
BEGIN
  -- Atomically increment completed_signers
  UPDATE signing_requests
  SET 
    completed_signers = completed_signers + 1,
    updated_at = NOW()
  WHERE id = p_signing_request_id
  RETURNING completed_signers, status INTO v_completed_signers, v_status;

  -- Check if all signers have completed
  IF v_completed_signers >= p_total_signers THEN
    -- Update status to completed
    UPDATE signing_requests
    SET 
      status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = p_signing_request_id
    RETURNING status INTO v_status;
  END IF;

  -- Return the new values
  RETURN QUERY SELECT v_completed_signers, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION increment_completed_signers IS 'Atomically increments completed_signers count and sets status to completed when all signers have signed';

-- ============================================================================
-- Function: increment_template_usage
-- Description: Atomically increment template usage_count and update last_used_at
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_template_usage(
  p_template_id UUID
)
RETURNS TABLE (
  new_usage_count INT,
  new_last_used_at TIMESTAMPTZ
) AS $$
DECLARE
  v_usage_count INT;
  v_last_used_at TIMESTAMPTZ;
BEGIN
  -- Atomically increment usage_count and update last_used_at
  UPDATE signature_templates
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = p_template_id
  RETURNING usage_count, last_used_at INTO v_usage_count, v_last_used_at;

  -- Return the new values
  RETURN QUERY SELECT v_usage_count, v_last_used_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION increment_template_usage IS 'Atomically increments template usage_count and updates last_used_at timestamp';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_completed_signers(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;

-- Grant execute permissions to service role
GRANT EXECUTE ON FUNCTION increment_completed_signers(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO service_role;


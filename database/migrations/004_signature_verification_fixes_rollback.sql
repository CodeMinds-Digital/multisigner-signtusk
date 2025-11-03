-- =====================================================
-- Rollback Migration: Signature Module Verification Fixes
-- Description: Rolls back changes from 004_signature_verification_fixes.sql
-- Author: AI Assistant
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- PART 1: DROP ATOMIC COMPLETION COUNTER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS increment_completed_signers(UUID, INTEGER);

-- =====================================================
-- PART 2: DROP NEW INDEXES
-- =====================================================

-- Drop signing_requests indexes
DROP INDEX IF EXISTS idx_signing_requests_initiated_by;
DROP INDEX IF EXISTS idx_signing_requests_initiated_by_status;
DROP INDEX IF EXISTS idx_signing_requests_status;
DROP INDEX IF EXISTS idx_signing_requests_expires_at;
DROP INDEX IF EXISTS idx_signing_requests_created_at;
DROP INDEX IF EXISTS idx_signing_requests_document_id;
DROP INDEX IF EXISTS idx_signing_requests_completed_at;

-- Drop signing_request_signers indexes
DROP INDEX IF EXISTS idx_signing_request_signers_email;
DROP INDEX IF EXISTS idx_signing_request_signers_email_status;
DROP INDEX IF EXISTS idx_signing_request_signers_request_id;
DROP INDEX IF EXISTS idx_signing_request_signers_request_order;
DROP INDEX IF EXISTS idx_signing_request_signers_signer_id;
DROP INDEX IF EXISTS idx_signing_request_signers_status;
DROP INDEX IF EXISTS idx_signing_request_signers_signed_at;

-- Drop signature_fields indexes
DROP INDEX IF EXISTS idx_signature_fields_request_id;
DROP INDEX IF EXISTS idx_signature_fields_signer_id;

-- Drop signature_audit_log indexes (only if they were created by this migration)
-- Note: These might have been created by 003_signature_audit_improvements.sql
-- so we only drop them if they don't exist in that migration
-- DROP INDEX IF EXISTS idx_signature_audit_log_request_id;
-- DROP INDEX IF EXISTS idx_signature_audit_log_created_at;
DROP INDEX IF EXISTS idx_signature_audit_log_signer_id;
DROP INDEX IF EXISTS idx_signature_audit_log_action;

-- Drop signature_templates indexes
DROP INDEX IF EXISTS idx_signature_templates_user_id;
DROP INDEX IF EXISTS idx_signature_templates_public;
DROP INDEX IF EXISTS idx_signature_templates_created_at;

-- =====================================================
-- PART 3: RESTORE OLD INDEXES (Optional)
-- =====================================================

-- Optionally restore the old indexes from 002_signature_indexes.sql
-- Uncomment if you want to restore the previous state

/*
-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON documents(expires_at) WHERE status IN ('pending', 'draft');
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON documents USING gin(to_tsvector('english', title));

-- Document signatures table indexes
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_status ON document_signatures(status);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_email ON document_signatures(signer_email);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_at ON document_signatures(signed_at DESC) WHERE signed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_signer ON document_signatures(document_id, signer_email);

-- Document templates table indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_user_id ON document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON document_templates(status);
CREATE INDEX IF NOT EXISTS idx_document_templates_signature_type ON document_templates(signature_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_at ON document_templates(created_at DESC);
*/

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Rollback of 004_signature_verification_fixes.sql completed successfully!' as status;


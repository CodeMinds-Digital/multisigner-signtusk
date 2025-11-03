-- Migration: Add performance optimization indexes for signature tables
-- Description: Creates indexes to optimize common signature request queries
-- Author: AI Assistant
-- Date: 2025-11-03

-- NOTE: This migration creates indexes for the signature workflow tables
-- The tables are: signing_requests, signing_request_signers, signature_audit_log

-- =====================================================
-- SIGNING_REQUESTS TABLE INDEXES
-- =====================================================

-- Composite index for user + status queries (most common dashboard query)
CREATE INDEX IF NOT EXISTS idx_signing_requests_initiated_by_status
  ON signing_requests(initiated_by, status);

-- Index for created_at ordering (for pagination and sorting)
CREATE INDEX IF NOT EXISTS idx_signing_requests_created_at
  ON signing_requests(created_at DESC);

-- Partial index for active requests with expiration (for expiration checks)
CREATE INDEX IF NOT EXISTS idx_signing_requests_expires_at_active
  ON signing_requests(expires_at)
  WHERE status IN ('initiated', 'in_progress');

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_signing_requests_status
  ON signing_requests(status);

-- Full-text search index for title (for search functionality)
CREATE INDEX IF NOT EXISTS idx_signing_requests_title_search
  ON signing_requests USING gin(to_tsvector('english', title));

-- Index for document_id lookups
CREATE INDEX IF NOT EXISTS idx_signing_requests_document_id
  ON signing_requests(document_id);

-- =====================================================
-- SIGNING_REQUEST_SIGNERS TABLE INDEXES
-- =====================================================

-- Composite index for signer email + status (for "received" view)
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_email_status
  ON signing_request_signers(signer_email, status);

-- Composite index for signer_id + status (for UUID-based auth)
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_id_status
  ON signing_request_signers(signer_id, status)
  WHERE signer_id IS NOT NULL;

-- Composite index for request + signing order (for sequential signing)
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_request_order
  ON signing_request_signers(signing_request_id, signing_order);

-- Index for request lookups (for joins)
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_request_id
  ON signing_request_signers(signing_request_id);

-- Index for signed_at timestamp (for analytics)
CREATE INDEX IF NOT EXISTS idx_signing_request_signers_signed_at
  ON signing_request_signers(signed_at DESC)
  WHERE signed_at IS NOT NULL;

-- =====================================================
-- SIGNATURE_AUDIT_LOG TABLE INDEXES
-- =====================================================

-- Index for request lookups (for audit trail)
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_request_id
  ON signature_audit_log(signature_request_id);

-- Index for signer lookups
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_signer_id
  ON signature_audit_log(signer_id)
  WHERE signer_id IS NOT NULL;

-- Index for created_at ordering (for chronological audit trail)
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_created_at
  ON signature_audit_log(created_at DESC);

-- Composite index for request + action (for filtering audit events)
CREATE INDEX IF NOT EXISTS idx_signature_audit_log_request_action
  ON signature_audit_log(signature_request_id, action);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_signing_requests_initiated_by_status IS 'Optimizes user dashboard queries filtering by status';
COMMENT ON INDEX idx_signing_requests_expires_at_active IS 'Optimizes expiration check queries for active requests';
COMMENT ON INDEX idx_signing_requests_title_search IS 'Enables full-text search on request titles';
COMMENT ON INDEX idx_signing_request_signers_email_status IS 'Optimizes "received" view queries by signer email';
COMMENT ON INDEX idx_signing_request_signers_id_status IS 'Optimizes "received" view queries by signer UUID';
COMMENT ON INDEX idx_signing_request_signers_request_order IS 'Optimizes sequential signing order validation';
COMMENT ON INDEX idx_signature_audit_log_request_id IS 'Optimizes audit trail queries by request';


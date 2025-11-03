-- =====================================================
-- Verification Script: Migration 004
-- Description: Verifies that 004_signature_verification_fixes.sql was applied correctly
-- Author: AI Assistant
-- Date: 2025-11-03
-- =====================================================

-- =====================================================
-- HEADER
-- =====================================================

SELECT '========================================' as info;
SELECT 'Migration 004 Verification Report' as info;
SELECT '========================================' as info;
SELECT '' as info;

-- =====================================================
-- PART 1: VERIFY ATOMIC FUNCTION
-- =====================================================

SELECT '1. ATOMIC COMPLETION COUNTER FUNCTION' as section;
SELECT '----------------------------------------' as divider;

-- Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'increment_completed_signers'
    ) THEN '✅ PASS - Function increment_completed_signers exists'
    ELSE '❌ FAIL - Function increment_completed_signers not found'
  END as check_result;

-- Show function details
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type,
  obj_description(oid, 'pg_proc') as description
FROM pg_proc 
WHERE proname = 'increment_completed_signers';

SELECT '' as info;

-- =====================================================
-- PART 2: VERIFY SIGNING_REQUESTS INDEXES
-- =====================================================

SELECT '2. SIGNING_REQUESTS TABLE INDEXES' as section;
SELECT '----------------------------------------' as divider;

-- Check each required index
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_initiated_by'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_initiated_by' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_initiated_by_status'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_initiated_by_status' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_status'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_status' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_expires_at'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_expires_at' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_created_at'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_created_at' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_document_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_document_id' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_requests' 
      AND indexname = 'idx_signing_requests_completed_at'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_requests_completed_at' as index_name;

-- Count total indexes
SELECT 
  COUNT(*) as total_indexes,
  '(Expected: 7)' as expected
FROM pg_indexes 
WHERE tablename = 'signing_requests' 
AND indexname LIKE 'idx_signing_requests_%';

SELECT '' as info;

-- =====================================================
-- PART 3: VERIFY SIGNING_REQUEST_SIGNERS INDEXES
-- =====================================================

SELECT '3. SIGNING_REQUEST_SIGNERS TABLE INDEXES' as section;
SELECT '----------------------------------------' as divider;

-- Check each required index
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_email'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_email' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_email_status'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_email_status' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_request_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_request_id' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_request_order'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_request_order' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_signer_id'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_signer_id' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_status'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_status' as index_name;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'signing_request_signers' 
      AND indexname = 'idx_signing_request_signers_signed_at'
    ) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'idx_signing_request_signers_signed_at' as index_name;

-- Count total indexes
SELECT 
  COUNT(*) as total_indexes,
  '(Expected: 7)' as expected
FROM pg_indexes 
WHERE tablename = 'signing_request_signers' 
AND indexname LIKE 'idx_signing_request_signers_%';

SELECT '' as info;

-- =====================================================
-- PART 4: VERIFY OLD INDEXES REMOVED
-- =====================================================

SELECT '4. OLD INCORRECT INDEXES REMOVED' as section;
SELECT '----------------------------------------' as divider;

-- Check that old indexes are gone
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname IN (
        'idx_documents_user_id',
        'idx_documents_status',
        'idx_document_signatures_document_id',
        'idx_document_templates_user_id'
      )
    ) THEN '✅ PASS - Old indexes removed'
    ELSE '⚠️  WARNING - Some old indexes still exist'
  END as check_result;

-- List any remaining old indexes
SELECT 
  indexname,
  tablename,
  '(Should be removed)' as note
FROM pg_indexes 
WHERE indexname IN (
  'idx_documents_user_id',
  'idx_documents_status',
  'idx_documents_created_at',
  'idx_documents_expires_at',
  'idx_documents_user_status',
  'idx_documents_title_search',
  'idx_document_signatures_document_id',
  'idx_document_signatures_status',
  'idx_document_signatures_signer_email',
  'idx_document_signatures_signed_at',
  'idx_document_signatures_document_signer',
  'idx_document_templates_user_id',
  'idx_document_templates_status',
  'idx_document_templates_signature_type',
  'idx_document_templates_created_at'
);

SELECT '' as info;

-- =====================================================
-- PART 5: SUMMARY
-- =====================================================

SELECT '5. MIGRATION SUMMARY' as section;
SELECT '----------------------------------------' as divider;

-- Overall status
SELECT 
  CASE 
    WHEN (
      -- Function exists
      EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_completed_signers')
      AND
      -- All signing_requests indexes exist
      (SELECT COUNT(*) FROM pg_indexes 
       WHERE tablename = 'signing_requests' 
       AND indexname LIKE 'idx_signing_requests_%') >= 7
      AND
      -- All signing_request_signers indexes exist
      (SELECT COUNT(*) FROM pg_indexes 
       WHERE tablename = 'signing_request_signers' 
       AND indexname LIKE 'idx_signing_request_signers_%') >= 7
    ) THEN '✅ MIGRATION SUCCESSFUL - All checks passed'
    ELSE '❌ MIGRATION INCOMPLETE - Some checks failed'
  END as overall_status;

-- Detailed counts
SELECT 
  'Atomic Function' as component,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_completed_signers')
    THEN 'Created' ELSE 'Missing' END as status;

SELECT 
  'signing_requests indexes' as component,
  COUNT(*)::text || ' created' as status
FROM pg_indexes 
WHERE tablename = 'signing_requests' 
AND indexname LIKE 'idx_signing_requests_%';

SELECT 
  'signing_request_signers indexes' as component,
  COUNT(*)::text || ' created' as status
FROM pg_indexes 
WHERE tablename = 'signing_request_signers' 
AND indexname LIKE 'idx_signing_request_signers_%';

SELECT '' as info;
SELECT '========================================' as info;
SELECT 'End of Verification Report' as info;
SELECT '========================================' as info;


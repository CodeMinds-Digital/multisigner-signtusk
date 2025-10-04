-- ============================================================================
-- VERIFY TABLE STRUCTURE BEFORE RUNNING PERFORMANCE OPTIMIZATIONS
-- ============================================================================
-- Run this script first to verify your table structure matches expectations
-- ============================================================================

-- Check document_templates table structure
SELECT 
    '=== DOCUMENT_TEMPLATES TABLE STRUCTURE ===' as info;

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'document_templates'
ORDER BY ordinal_position;

-- Check documents table structure
SELECT 
    '=== DOCUMENTS TABLE STRUCTURE ===' as info;

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'documents'
ORDER BY ordinal_position;

-- Check signing_requests table structure
SELECT 
    '=== SIGNING_REQUESTS TABLE STRUCTURE ===' as info;

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'signing_requests'
ORDER BY ordinal_position;

-- Check signing_request_signers table structure
SELECT 
    '=== SIGNING_REQUEST_SIGNERS TABLE STRUCTURE ===' as info;

SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'signing_request_signers'
ORDER BY ordinal_position;

-- Check existing indexes
SELECT 
    '=== EXISTING INDEXES ===' as info;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'signing_requests', 'signing_request_signers', 'document_templates')
ORDER BY tablename, indexname;

-- Summary
SELECT 
    '=== VERIFICATION SUMMARY ===' as info;

SELECT 
    'document_templates has type column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_templates' 
            AND column_name = 'type'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Column missing'
    END as status;

SELECT 
    'document_templates has name column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'document_templates' 
            AND column_name = 'name'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Column missing'
    END as status;

SELECT 
    'documents has title column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'title'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Column missing'
    END as status;

SELECT 
    'documents has status column' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'documents' 
            AND column_name = 'status'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Column missing'
    END as status;

SELECT 
    'signing_requests table exists' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'signing_requests'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Table missing'
    END as status;

SELECT 
    'signing_request_signers table exists' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'signing_request_signers'
        ) THEN '✅ PASS'
        ELSE '❌ FAIL - Table missing'
    END as status;


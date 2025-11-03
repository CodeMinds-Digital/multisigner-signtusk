-- =====================================================
-- SEND MODULE COMPLETE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify all components
-- =====================================================

-- Check if all required tables exist
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    required_tables TEXT[] := ARRAY[
        'send_shared_documents',
        'send_document_links',
        'send_link_access_controls',
        'send_document_views',
        'send_page_views',
        'send_visitor_sessions',
        'send_email_verifications',
        'send_document_ndas',
        'send_document_feedback',
        'send_custom_domains',
        'send_branding_settings',
        'send_analytics_events',
        'send_data_rooms',
        'send_data_room_documents',
        'send_document_versions',
        'send_dataroom_viewer_groups',
        'send_dataroom_links',
        'send_export_jobs',
        'sso_providers',
        'sso_sessions',
        'audit_trails'
    ];
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SEND MODULE VERIFICATION REPORT';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    
    -- Check tables
    RAISE NOTICE '📊 CHECKING DATABASE TABLES...';
    RAISE NOTICE '';
    
    FOREACH table_name IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
            RAISE NOTICE '❌ MISSING: %', table_name;
        ELSE
            RAISE NOTICE '✅ EXISTS: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % table(s) missing!', array_length(missing_tables, 1);
        RAISE NOTICE 'Missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE '✅ ALL TABLES EXIST (%/% tables)', array_length(required_tables, 1), array_length(required_tables, 1);
    END IF;
END $$;

-- Check storage buckets
DO $$
DECLARE
    missing_buckets TEXT[] := ARRAY[]::TEXT[];
    bucket_name TEXT;
    required_buckets TEXT[] := ARRAY[
        'send-documents',
        'send-thumbnails',
        'send-watermarks',
        'send-brand-assets'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '💾 CHECKING STORAGE BUCKETS...';
    RAISE NOTICE '';
    
    FOREACH bucket_name IN ARRAY required_buckets
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM storage.buckets 
            WHERE id = bucket_name
        ) THEN
            missing_buckets := array_append(missing_buckets, bucket_name);
            RAISE NOTICE '❌ MISSING: %', bucket_name;
        ELSE
            RAISE NOTICE '✅ EXISTS: %', bucket_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF array_length(missing_buckets, 1) > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % bucket(s) missing!', array_length(missing_buckets, 1);
        RAISE NOTICE 'Missing buckets: %', array_to_string(missing_buckets, ', ');
        RAISE NOTICE 'Run: database/SEND_TAB_STORAGE_BUCKETS.sql';
    ELSE
        RAISE NOTICE '✅ ALL BUCKETS EXIST (%/% buckets)', array_length(required_buckets, 1), array_length(required_buckets, 1);
    END IF;
END $$;

-- Check RLS policies
DO $$
DECLARE
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
    rls_enabled BOOLEAN;
    send_tables TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '🔒 CHECKING RLS POLICIES...';
    RAISE NOTICE '';
    
    -- Get all send_ tables
    SELECT array_agg(tablename) INTO send_tables
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename LIKE 'send_%';
    
    -- Check RLS on each table
    FOREACH table_name IN ARRAY send_tables
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = table_name
        AND relnamespace = 'public'::regnamespace;
        
        IF rls_enabled THEN
            RAISE NOTICE '✅ RLS ENABLED: %', table_name;
        ELSE
            tables_without_rls := array_append(tables_without_rls, table_name);
            RAISE NOTICE '❌ RLS DISABLED: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % table(s) without RLS!', array_length(tables_without_rls, 1);
        RAISE NOTICE 'Tables: %', array_to_string(tables_without_rls, ', ');
        RAISE NOTICE 'Run: database/SEND_TAB_RLS_POLICIES.sql';
    ELSE
        RAISE NOTICE '✅ ALL SEND TABLES HAVE RLS ENABLED';
    END IF;
END $$;

-- Check database functions
DO $$
DECLARE
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_name TEXT;
    required_functions TEXT[] := ARRAY[
        'get_document_version_tree',
        'manage_document_version',
        'delete_expired_export_jobs'
    ];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '⚙️  CHECKING DATABASE FUNCTIONS...';
    RAISE NOTICE '';
    
    FOREACH function_name IN ARRAY required_functions
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = function_name
        ) THEN
            missing_functions := array_append(missing_functions, function_name);
            RAISE NOTICE '❌ MISSING: %()', function_name;
        ELSE
            RAISE NOTICE '✅ EXISTS: %()', function_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '⚠️  WARNING: % function(s) missing!', array_length(missing_functions, 1);
        RAISE NOTICE 'Missing functions: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✅ ALL FUNCTIONS EXIST (%/% functions)', array_length(required_functions, 1), array_length(required_functions, 1);
    END IF;
END $$;

-- Summary statistics
DO $$
DECLARE
    total_send_tables INTEGER;
    total_send_buckets INTEGER;
    total_send_policies INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '📈 SUMMARY STATISTICS';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    
    -- Count send tables
    SELECT COUNT(*) INTO total_send_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'send_%';
    
    RAISE NOTICE '📊 Total Send Tables: %', total_send_tables;
    
    -- Count send buckets
    SELECT COUNT(*) INTO total_send_buckets
    FROM storage.buckets
    WHERE id LIKE 'send-%';
    
    RAISE NOTICE '💾 Total Send Buckets: %', total_send_buckets;
    
    -- Count RLS policies on send tables
    SELECT COUNT(*) INTO total_send_policies
    FROM pg_policies
    WHERE tablename LIKE 'send_%';
    
    RAISE NOTICE '🔒 Total RLS Policies: %', total_send_policies;
    
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '✅ VERIFICATION COMPLETE';
    RAISE NOTICE '==============================================';
END $$;

-- Display bucket details
SELECT
    id as bucket_name,
    CASE 
        WHEN public THEN '🌐 Public'
        ELSE '🔒 Private'
    END as access,
    (file_size_limit / 1048576)::INTEGER || ' MB' as size_limit,
    array_length(allowed_mime_types, 1) as mime_types_count
FROM storage.buckets
WHERE id LIKE 'send-%'
ORDER BY id;


-- =====================================================
-- Verification Script for notification_preferences Table
-- Run this in Supabase SQL Editor to check if table exists
-- =====================================================

-- Check if table exists
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notification_preferences'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '✅ notification_preferences table EXISTS';
    ELSE
        RAISE NOTICE '❌ notification_preferences table DOES NOT EXIST';
        RAISE NOTICE '👉 You need to run: database/migrations/create_notification_preferences.sql';
    END IF;
END $$;

-- If table exists, show structure
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- If table exists, show row count
SELECT 
    COUNT(*) as total_preferences,
    COUNT(*) FILTER (WHERE email_notifications = true) as email_enabled,
    COUNT(*) FILTER (WHERE document_viewed_emails = true) as viewed_enabled,
    COUNT(*) FILTER (WHERE other_signer_notifications = true) as other_signer_enabled
FROM notification_preferences;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notification_preferences';


-- Enable Supabase Realtime for SignTusk Tables
-- Run this in Supabase SQL Editor to enable real-time subscriptions

-- =====================================================
-- ENABLE REALTIME REPLICATION
-- =====================================================

-- Enable realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Enable realtime for signing_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE signing_requests;

-- Enable realtime for signing_request_signers table
ALTER PUBLICATION supabase_realtime ADD TABLE signing_request_signers;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for user_profiles table (for presence tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- Enable realtime for document_templates table
ALTER PUBLICATION supabase_realtime ADD TABLE document_templates;

-- =====================================================
-- VERIFY RLS POLICIES ARE IN PLACE
-- =====================================================

-- Check existing RLS policies
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'documents' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notifications' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify realtime is enabled
SELECT 
    schemaname,
    tablename,
    'Realtime Enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('documents', 'signing_requests', 'signing_request_signers', 'notifications', 'user_profiles', 'document_templates')
ORDER BY tablename;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('documents', 'signing_requests', 'signing_request_signers', 'notifications', 'user_profiles', 'document_templates')
ORDER BY tablename;

-- Check existing RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as operation
FROM pg_policies 
WHERE tablename IN ('documents', 'signing_requests', 'notifications')
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Supabase Realtime has been enabled for SignTusk tables!';
    RAISE NOTICE '📊 Tables enabled: documents, signing_requests, signing_request_signers, notifications, user_profiles, document_templates';
    RAISE NOTICE '🔒 Please verify RLS policies are properly configured above';
    RAISE NOTICE '🚀 You can now use real-time subscriptions in your application';
END $$;


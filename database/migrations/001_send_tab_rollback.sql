-- =====================================================
-- SEND TAB MIGRATION ROLLBACK
-- Migration: 001_send_tab_initial
-- Description: Rollback Send Tab database schema
-- WARNING: This will delete all Send Tab data!
-- =====================================================

-- Confirm rollback
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ========================================';
    RAISE NOTICE '⚠️  WARNING: ROLLBACK IN PROGRESS';
    RAISE NOTICE '⚠️  ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  This will delete:';
    RAISE NOTICE '   - All Send Tab tables and data';
    RAISE NOTICE '   - All storage buckets and files';
    RAISE NOTICE '   - All RLS policies';
    RAISE NOTICE '   - All functions and triggers';
    RAISE NOTICE '';
    RAISE NOTICE '⏸️  Pausing for 5 seconds...';
    RAISE NOTICE '   Press Ctrl+C to cancel';
    RAISE NOTICE '';
    PERFORM pg_sleep(5);
END $$;

-- =====================================================
-- DROP FUNCTIONS AND TRIGGERS
-- =====================================================

-- Drop triggers
DROP TRIGGER IF EXISTS update_shared_documents_updated_at ON public.shared_documents;
DROP TRIGGER IF EXISTS update_document_links_updated_at ON public.document_links;
DROP TRIGGER IF EXISTS update_link_access_controls_updated_at ON public.link_access_controls;
DROP TRIGGER IF EXISTS update_visitor_sessions_updated_at ON public.visitor_sessions;
DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON public.custom_domains;
DROP TRIGGER IF EXISTS update_branding_settings_updated_at ON public.branding_settings;
DROP TRIGGER IF EXISTS update_data_rooms_updated_at ON public.data_rooms;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.generate_link_id();
DROP FUNCTION IF EXISTS public.increment_link_view_count(UUID);
DROP FUNCTION IF EXISTS public.calculate_engagement_score(INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS public.upsert_visitor_session(UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.is_link_accessible(UUID);
DROP FUNCTION IF EXISTS public.get_link_analytics(UUID);
DROP FUNCTION IF EXISTS public.get_document_analytics(UUID);
DROP FUNCTION IF EXISTS public.cleanup_expired_verifications();
DROP FUNCTION IF EXISTS public.deactivate_expired_links();

-- =====================================================
-- DROP RLS POLICIES
-- =====================================================

-- Shared Documents policies
DROP POLICY IF EXISTS "Users can view their own shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Users can create shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Users can update their own shared documents" ON public.shared_documents;
DROP POLICY IF EXISTS "Users can delete their own shared documents" ON public.shared_documents;

-- Document Links policies
DROP POLICY IF EXISTS "Users can view their document links" ON public.document_links;
DROP POLICY IF EXISTS "Users can create document links" ON public.document_links;
DROP POLICY IF EXISTS "Users can update their document links" ON public.document_links;
DROP POLICY IF EXISTS "Users can delete their document links" ON public.document_links;

-- Link Access Controls policies
DROP POLICY IF EXISTS "Users can view their link access controls" ON public.link_access_controls;
DROP POLICY IF EXISTS "Users can create link access controls" ON public.link_access_controls;
DROP POLICY IF EXISTS "Users can update their link access controls" ON public.link_access_controls;
DROP POLICY IF EXISTS "Users can delete their link access controls" ON public.link_access_controls;

-- Document Views policies
DROP POLICY IF EXISTS "Users can view their document analytics" ON public.document_views;
DROP POLICY IF EXISTS "Anyone can create document views" ON public.document_views;

-- Page Views policies
DROP POLICY IF EXISTS "Users can view their page analytics" ON public.page_views;
DROP POLICY IF EXISTS "Anyone can create page views" ON public.page_views;

-- Visitor Sessions policies
DROP POLICY IF EXISTS "Users can view their visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can create visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor sessions" ON public.visitor_sessions;

-- Email Verifications policies
DROP POLICY IF EXISTS "Users can view their email verifications" ON public.link_email_verifications;
DROP POLICY IF EXISTS "Anyone can create email verifications" ON public.link_email_verifications;
DROP POLICY IF EXISTS "Anyone can update email verifications" ON public.link_email_verifications;

-- Document NDAs policies
DROP POLICY IF EXISTS "Users can view their document NDAs" ON public.document_ndas;
DROP POLICY IF EXISTS "Anyone can create NDA acceptances" ON public.document_ndas;

-- Document Feedback policies
DROP POLICY IF EXISTS "Users can view their document feedback" ON public.document_feedback;
DROP POLICY IF EXISTS "Anyone can submit document feedback" ON public.document_feedback;

-- Custom Domains policies
DROP POLICY IF EXISTS "Users can manage their custom domains" ON public.custom_domains;

-- Branding Settings policies
DROP POLICY IF EXISTS "Users can manage their branding settings" ON public.branding_settings;

-- Analytics Events policies
DROP POLICY IF EXISTS "Users can view their analytics events" ON public.link_analytics_events;
DROP POLICY IF EXISTS "Anyone can create analytics events" ON public.link_analytics_events;

-- Data Rooms policies
DROP POLICY IF EXISTS "Users can manage their data rooms" ON public.data_rooms;

-- Data Room Documents policies
DROP POLICY IF EXISTS "Users can view their data room documents" ON public.data_room_documents;
DROP POLICY IF EXISTS "Users can manage their data room documents" ON public.data_room_documents;
DROP POLICY IF EXISTS "Users can update their data room documents" ON public.data_room_documents;
DROP POLICY IF EXISTS "Users can delete their data room documents" ON public.data_room_documents;

-- =====================================================
-- DROP STORAGE POLICIES
-- =====================================================

-- send-documents policies
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- send-thumbnails policies
DROP POLICY IF EXISTS "Users can upload their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own thumbnails" ON storage.objects;

-- send-watermarks policies
DROP POLICY IF EXISTS "Users can upload their own watermarks" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own watermarks" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own watermarks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own watermarks" ON storage.objects;

-- brand-assets policies
DROP POLICY IF EXISTS "Users can upload their own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own brand assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own brand assets" ON storage.objects;

-- =====================================================
-- DROP STORAGE BUCKETS
-- =====================================================

-- WARNING: This will delete all files in these buckets!
DELETE FROM storage.buckets WHERE id IN (
    'send-documents',
    'send-thumbnails',
    'send-watermarks',
    'brand-assets'
);

-- =====================================================
-- DROP INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_shared_documents_user_id;
DROP INDEX IF EXISTS idx_shared_documents_status;
DROP INDEX IF EXISTS idx_shared_documents_created_at;
DROP INDEX IF EXISTS idx_document_links_document_id;
DROP INDEX IF EXISTS idx_document_links_link_id;
DROP INDEX IF EXISTS idx_document_links_created_by;
DROP INDEX IF EXISTS idx_document_links_is_active;
DROP INDEX IF EXISTS idx_document_views_link_id;
DROP INDEX IF EXISTS idx_document_views_session_id;
DROP INDEX IF EXISTS idx_document_views_viewer_email;
DROP INDEX IF EXISTS idx_document_views_viewed_at;
DROP INDEX IF EXISTS idx_page_views_view_id;
DROP INDEX IF EXISTS idx_visitor_sessions_link_id;
DROP INDEX IF EXISTS idx_visitor_sessions_session_id;
DROP INDEX IF EXISTS idx_analytics_events_link_id;
DROP INDEX IF EXISTS idx_analytics_events_event_type;
DROP INDEX IF EXISTS idx_analytics_events_timestamp;

-- =====================================================
-- DROP TABLES
-- =====================================================

-- Drop in reverse order of dependencies
DROP TABLE IF EXISTS public.data_room_documents CASCADE;
DROP TABLE IF EXISTS public.data_rooms CASCADE;
DROP TABLE IF EXISTS public.link_analytics_events CASCADE;
DROP TABLE IF EXISTS public.branding_settings CASCADE;
DROP TABLE IF EXISTS public.custom_domains CASCADE;
DROP TABLE IF EXISTS public.document_feedback CASCADE;
DROP TABLE IF EXISTS public.document_ndas CASCADE;
DROP TABLE IF EXISTS public.link_email_verifications CASCADE;
DROP TABLE IF EXISTS public.visitor_sessions CASCADE;
DROP TABLE IF EXISTS public.page_views CASCADE;
DROP TABLE IF EXISTS public.document_views CASCADE;
DROP TABLE IF EXISTS public.link_access_controls CASCADE;
DROP TABLE IF EXISTS public.document_links CASCADE;
DROP TABLE IF EXISTS public.shared_documents CASCADE;

-- =====================================================
-- REMOVE MIGRATION RECORD
-- =====================================================

DELETE FROM public.schema_migrations WHERE version = '001';

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ ROLLBACK COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Removed:';
    RAISE NOTICE '   ✓ 14 tables dropped';
    RAISE NOTICE '   ✓ 4 storage buckets deleted';
    RAISE NOTICE '   ✓ All RLS policies removed';
    RAISE NOTICE '   ✓ All functions and triggers removed';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  All Send Tab data has been permanently deleted!';
    RAISE NOTICE '';
END $$;


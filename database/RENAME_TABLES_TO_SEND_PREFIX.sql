-- =====================================================
-- RENAME TABLES TO USE send_ PREFIX
-- This script renames all Send Tab tables to use send_ prefix
-- Run this ONLY if you have existing tables without the prefix
-- =====================================================

-- WARNING: This will rename existing tables!
-- Make sure to backup your data before running this script

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ========================================';
    RAISE NOTICE '⚠️  TABLE RENAMING IN PROGRESS';
    RAISE NOTICE '⚠️  ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Renaming tables to use send_ prefix...';
    RAISE NOTICE '';
END $$;

-- Rename tables (in order to avoid foreign key conflicts)
ALTER TABLE IF EXISTS public.shared_documents RENAME TO send_shared_documents;
ALTER TABLE IF EXISTS public.document_links RENAME TO send_document_links;
ALTER TABLE IF EXISTS public.link_access_controls RENAME TO send_link_access_controls;
ALTER TABLE IF EXISTS public.document_views RENAME TO send_document_views;
ALTER TABLE IF EXISTS public.page_views RENAME TO send_page_views;
ALTER TABLE IF EXISTS public.visitor_sessions RENAME TO send_visitor_sessions;
ALTER TABLE IF EXISTS public.link_email_verifications RENAME TO send_email_verifications;
ALTER TABLE IF EXISTS public.document_ndas RENAME TO send_document_ndas;
ALTER TABLE IF EXISTS public.document_feedback RENAME TO send_document_feedback;
ALTER TABLE IF EXISTS public.custom_domains RENAME TO send_custom_domains;
ALTER TABLE IF EXISTS public.branding_settings RENAME TO send_branding_settings;
ALTER TABLE IF EXISTS public.link_analytics_events RENAME TO send_analytics_events;
ALTER TABLE IF EXISTS public.data_rooms RENAME TO send_data_rooms;
ALTER TABLE IF EXISTS public.data_room_documents RENAME TO send_data_room_documents;

-- Rename indexes
ALTER INDEX IF EXISTS idx_shared_documents_user_id RENAME TO idx_send_shared_documents_user_id;
ALTER INDEX IF EXISTS idx_shared_documents_team_id RENAME TO idx_send_shared_documents_team_id;
ALTER INDEX IF EXISTS idx_shared_documents_status RENAME TO idx_send_shared_documents_status;
ALTER INDEX IF EXISTS idx_shared_documents_created_at RENAME TO idx_send_shared_documents_created_at;

ALTER INDEX IF EXISTS idx_document_links_document_id RENAME TO idx_send_document_links_document_id;
ALTER INDEX IF EXISTS idx_document_links_link_id RENAME TO idx_send_document_links_link_id;
ALTER INDEX IF EXISTS idx_document_links_created_by RENAME TO idx_send_document_links_created_by;
ALTER INDEX IF EXISTS idx_document_links_is_active RENAME TO idx_send_document_links_is_active;

ALTER INDEX IF EXISTS idx_document_views_link_id RENAME TO idx_send_document_views_link_id;
ALTER INDEX IF EXISTS idx_document_views_session_id RENAME TO idx_send_document_views_session_id;
ALTER INDEX IF EXISTS idx_document_views_viewer_email RENAME TO idx_send_document_views_viewer_email;
ALTER INDEX IF EXISTS idx_document_views_viewed_at RENAME TO idx_send_document_views_viewed_at;

ALTER INDEX IF EXISTS idx_page_views_view_id RENAME TO idx_send_page_views_view_id;
ALTER INDEX IF EXISTS idx_page_views_page_number RENAME TO idx_send_page_views_page_number;

ALTER INDEX IF EXISTS idx_visitor_sessions_link_id RENAME TO idx_send_visitor_sessions_link_id;
ALTER INDEX IF EXISTS idx_visitor_sessions_session_id RENAME TO idx_send_visitor_sessions_session_id;
ALTER INDEX IF EXISTS idx_visitor_sessions_viewer_email RENAME TO idx_send_visitor_sessions_viewer_email;

ALTER INDEX IF EXISTS idx_analytics_events_link_id RENAME TO idx_send_analytics_events_link_id;
ALTER INDEX IF EXISTS idx_analytics_events_view_id RENAME TO idx_send_analytics_events_view_id;
ALTER INDEX IF EXISTS idx_analytics_events_event_type RENAME TO idx_send_analytics_events_event_type;
ALTER INDEX IF EXISTS idx_analytics_events_timestamp RENAME TO idx_send_analytics_events_timestamp;

-- Rename storage bucket (if exists)
UPDATE storage.buckets SET id = 'send-brand-assets', name = 'send-brand-assets' WHERE id = 'brand-assets';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ TABLE RENAMING COMPLETED!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Renamed 14 tables to use send_ prefix:';
    RAISE NOTICE '   ✓ shared_documents → send_shared_documents';
    RAISE NOTICE '   ✓ document_links → send_document_links';
    RAISE NOTICE '   ✓ link_access_controls → send_link_access_controls';
    RAISE NOTICE '   ✓ document_views → send_document_views';
    RAISE NOTICE '   ✓ page_views → send_page_views';
    RAISE NOTICE '   ✓ visitor_sessions → send_visitor_sessions';
    RAISE NOTICE '   ✓ link_email_verifications → send_email_verifications';
    RAISE NOTICE '   ✓ document_ndas → send_document_ndas';
    RAISE NOTICE '   ✓ document_feedback → send_document_feedback';
    RAISE NOTICE '   ✓ custom_domains → send_custom_domains';
    RAISE NOTICE '   ✓ branding_settings → send_branding_settings';
    RAISE NOTICE '   ✓ link_analytics_events → send_analytics_events';
    RAISE NOTICE '   ✓ data_rooms → send_data_rooms';
    RAISE NOTICE '   ✓ data_room_documents → send_data_room_documents';
    RAISE NOTICE '';
    RAISE NOTICE '📦 Renamed storage bucket:';
    RAISE NOTICE '   ✓ brand-assets → send-brand-assets';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Update your application code to use new table names!';
    RAISE NOTICE '';
END $$;


-- =====================================================
-- SEND TAB MIGRATION - Initial Setup
-- Migration: 001_send_tab_initial
-- Created: 2025-01-04
-- Description: Initial Send Tab database schema
-- =====================================================

-- Migration metadata
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record this migration
INSERT INTO public.schema_migrations (version, name)
VALUES ('001', 'send_tab_initial')
ON CONFLICT (version) DO NOTHING;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Execute the main schema creation
\i SEND_TAB_COMPLETE_SETUP.sql

-- =====================================================
-- CREATE STORAGE BUCKETS
-- =====================================================

-- Execute storage bucket creation
\i SEND_TAB_STORAGE_BUCKETS.sql

-- =====================================================
-- CONFIGURE RLS POLICIES
-- =====================================================

-- Execute RLS policy configuration
\i SEND_TAB_RLS_POLICIES.sql

-- =====================================================
-- CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Execute functions and triggers
\i SEND_TAB_FUNCTIONS.sql

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '✅ MIGRATION 001 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Send Tab Initial Setup:';
    RAISE NOTICE '   ✓ 14 tables created';
    RAISE NOTICE '   ✓ 4 storage buckets created';
    RAISE NOTICE '   ✓ RLS policies configured';
    RAISE NOTICE '   ✓ Functions and triggers created';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Next steps:';
    RAISE NOTICE '   1. Configure environment variables';
    RAISE NOTICE '   2. Set up Upstash Redis';
    RAISE NOTICE '   3. Set up Upstash QStash';
    RAISE NOTICE '   4. Deploy application code';
    RAISE NOTICE '';
END $$;


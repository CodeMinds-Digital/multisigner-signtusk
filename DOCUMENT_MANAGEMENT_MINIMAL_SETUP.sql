-- =====================================================
-- Document Management System - Minimal Setup
-- Run this if the full setup has policy conflicts
-- =====================================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DOCUMENT TEMPLATES TABLE ONLY
-- =====================================================

-- Document Templates table (for PDF template management with schemas)
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    signature_type TEXT DEFAULT 'single' CHECK (signature_type IN ('single', 'multi')),
    status TEXT DEFAULT 'incomplete' CHECK (status IN ('completed', 'incomplete')),
    pdf_url TEXT NOT NULL,
    template_url TEXT,
    schemas JSONB DEFAULT '[]'::jsonb,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on document_templates table
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR DOCUMENT TEMPLATES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can insert their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.document_templates;

-- Create new policies
CREATE POLICY "Users can view their own templates" ON public.document_templates
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates" ON public.document_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.document_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.document_templates
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_templates_user_id ON public.document_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON public.document_templates(status);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_at ON public.document_templates(created_at);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON public.document_templates(type);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- This will show a success message when the script completes
DO $$
BEGIN
    RAISE NOTICE 'Document Management System minimal setup completed successfully!';
    RAISE NOTICE 'Table created: document_templates';
    RAISE NOTICE 'RLS policies: Enabled for user data isolation';
    RAISE NOTICE 'Indexes: Created for optimal performance';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Manually create storage buckets in Supabase Dashboard if they do not exist:';
    RAISE NOTICE '   - documents (private)';
    RAISE NOTICE '   - signatures (private)';
    RAISE NOTICE '   - templates (private)';
    RAISE NOTICE '   - files (private)';
    RAISE NOTICE '   - qrcodes (private)';
    RAISE NOTICE '   - avatars (public)';
    RAISE NOTICE '2. Set up storage policies manually if needed';
    RAISE NOTICE '3. Test the document management system';
END $$;

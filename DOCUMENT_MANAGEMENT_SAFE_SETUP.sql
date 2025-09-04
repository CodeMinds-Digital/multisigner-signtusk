-- =====================================================
-- Document Management System - Safe Setup
-- This version preserves existing data and adds missing columns
-- =====================================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DOCUMENT TEMPLATES TABLE - SAFE CREATION/UPDATE
-- =====================================================

-- Create table if it doesn't exist with basic structure
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist
DO $$
BEGIN
    -- Add name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'name') THEN
        ALTER TABLE public.document_templates ADD COLUMN name TEXT NOT NULL DEFAULT 'Untitled Document';
        ALTER TABLE public.document_templates ALTER COLUMN name DROP DEFAULT;
    END IF;

    -- Add type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'type') THEN
        ALTER TABLE public.document_templates ADD COLUMN type TEXT NOT NULL DEFAULT 'Document';
        ALTER TABLE public.document_templates ALTER COLUMN type DROP DEFAULT;
    END IF;

    -- Add signature_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'signature_type') THEN
        ALTER TABLE public.document_templates ADD COLUMN signature_type TEXT DEFAULT 'single';
    END IF;

    -- Add status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'status') THEN
        ALTER TABLE public.document_templates ADD COLUMN status TEXT DEFAULT 'incomplete';
    END IF;

    -- Add pdf_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'pdf_url') THEN
        ALTER TABLE public.document_templates ADD COLUMN pdf_url TEXT NOT NULL DEFAULT '';
        ALTER TABLE public.document_templates ALTER COLUMN pdf_url DROP DEFAULT;
    END IF;

    -- Add template_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'template_url') THEN
        ALTER TABLE public.document_templates ADD COLUMN template_url TEXT;
    END IF;

    -- Add schemas column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'schemas') THEN
        ALTER TABLE public.document_templates ADD COLUMN schemas JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'document_templates' AND column_name = 'updated_at') THEN
        ALTER TABLE public.document_templates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    RAISE NOTICE 'Document templates table structure updated successfully!';
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add signature_type check constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'document_templates_signature_type_check') THEN
        ALTER TABLE public.document_templates 
        ADD CONSTRAINT document_templates_signature_type_check 
        CHECK (signature_type IN ('single', 'multi'));
    END IF;

    -- Add status check constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'document_templates_status_check') THEN
        ALTER TABLE public.document_templates 
        ADD CONSTRAINT document_templates_status_check 
        CHECK (status IN ('completed', 'incomplete'));
    END IF;

    RAISE NOTICE 'Document templates table constraints added successfully!';
END $$;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('documents', 'documents', false, 52428800, ARRAY['application/pdf']),
    ('signatures', 'signatures', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/svg+xml']),
    ('templates', 'templates', false, 52428800, ARRAY['application/json', 'application/pdf']),
    ('files', 'files', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('qrcodes', 'qrcodes', false, 2097152, ARRAY['image/png', 'image/jpeg', 'image/svg+xml']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

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
-- STORAGE POLICIES (MINIMAL - ONLY FOR DOCUMENTS BUCKET)
-- =====================================================

-- Only create essential storage policies for documents bucket
-- (Skip if you have existing storage policies that work)

DO $$
BEGIN
    -- Documents bucket policies (only if they don't exist)
    BEGIN
        CREATE POLICY "Users can upload their own documents" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'documents' AND 
                auth.uid()::text = (storage.foldername(name))[1]
            );
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Users can upload their own documents" already exists, skipping...';
    END;

    BEGIN
        CREATE POLICY "Users can view their own documents" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'documents' AND 
                auth.uid()::text = (storage.foldername(name))[1]
            );
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Users can view their own documents" already exists, skipping...';
    END;

    BEGIN
        CREATE POLICY "Users can update their own documents" ON storage.objects
            FOR UPDATE USING (
                bucket_id = 'documents' AND 
                auth.uid()::text = (storage.foldername(name))[1]
            );
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Users can update their own documents" already exists, skipping...';
    END;

    BEGIN
        CREATE POLICY "Users can delete their own documents" ON storage.objects
            FOR DELETE USING (
                bucket_id = 'documents' AND 
                auth.uid()::text = (storage.foldername(name))[1]
            );
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy "Users can delete their own documents" already exists, skipping...';
    END;
END $$;

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
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Document Management System SAFE setup completed!';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Table: document_templates (safely updated)';
    RAISE NOTICE 'Storage buckets: documents, signatures, templates, files, qrcodes, avatars';
    RAISE NOTICE 'RLS policies: Enabled for user data isolation';
    RAISE NOTICE 'Storage policies: Created for documents bucket (others skipped if exist)';
    RAISE NOTICE 'Indexes: Created for optimal performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Your existing data has been preserved!';
    RAISE NOTICE 'You can now test the document management system.';
    RAISE NOTICE '=================================================';
END $$;

-- =====================================================
-- Document Management System Setup
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- =====================================================

-- Drop existing table if it exists (to avoid schema conflicts)
DROP TABLE IF EXISTS public.document_templates CASCADE;

-- Document Templates table (for PDF template management with schemas)
CREATE TABLE public.document_templates (
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
-- STORAGE POLICIES
-- =====================================================

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own templates" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own signatures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own qrcodes" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Documents bucket policies
CREATE POLICY "Users can upload their own documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own documents" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own documents" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'documents' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Templates bucket policies
CREATE POLICY "Users can upload their own templates" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'templates' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own templates" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'templates' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own templates" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'templates' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own templates" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'templates' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Signatures bucket policies
CREATE POLICY "Users can upload their own signatures" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'signatures' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own signatures" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'signatures' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own signatures" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'signatures' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own signatures" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'signatures' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Files bucket policies
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'files' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- QR Codes bucket policies
CREATE POLICY "Users can upload their own qrcodes" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'qrcodes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own qrcodes" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'qrcodes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own qrcodes" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'qrcodes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own qrcodes" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'qrcodes' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Avatars bucket policies (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'avatars' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

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
    RAISE NOTICE 'Document Management System setup completed successfully!';
    RAISE NOTICE 'Tables created: document_templates';
    RAISE NOTICE 'Storage buckets: documents, signatures, templates, files, qrcodes, avatars';
    RAISE NOTICE 'RLS policies: Enabled for user data isolation';
    RAISE NOTICE 'Indexes: Created for optimal performance';
END $$;

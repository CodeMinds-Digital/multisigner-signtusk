-- Fix RLS Policies for Document Management
-- Run this in Supabase SQL Editor to fix permission issues

-- 1. Check current RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('document_templates')
ORDER BY tablename, policyname;

-- 2. Check storage bucket policies
SELECT 
    name,
    public,
    allowed_mime_types,
    file_size_limit
FROM storage.buckets 
WHERE name IN ('documents', 'templates');

-- 3. Check storage object policies (if storage.policies exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'policies') THEN
        RAISE NOTICE 'Storage policies table exists, checking policies...';
        PERFORM 1; -- We'll check policies later
    ELSE
        RAISE NOTICE 'Storage policies table does not exist - storage may not be fully configured';
    END IF;
END $$;

-- 4. Fix document_templates table RLS policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can insert own document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can update own document templates" ON public.document_templates;
DROP POLICY IF EXISTS "Users can delete own document templates" ON public.document_templates;

-- Create comprehensive RLS policies for document_templates
CREATE POLICY "Users can view own document templates" 
ON public.document_templates FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document templates" 
ON public.document_templates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own document templates" 
ON public.document_templates FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own document templates" 
ON public.document_templates FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Ensure RLS is enabled on document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- 6. Fix storage bucket policies (if storage.objects table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        RAISE NOTICE 'Storage objects table exists, creating storage policies...';

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Users can insert own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
        DROP POLICY IF EXISTS "Users can view own templates" ON storage.objects;
        DROP POLICY IF EXISTS "Users can insert own templates" ON storage.objects;
        DROP POLICY IF EXISTS "Users can update own templates" ON storage.objects;
        DROP POLICY IF EXISTS "Users can delete own templates" ON storage.objects;

        -- Create storage policies for documents bucket
        EXECUTE 'CREATE POLICY "Users can view own documents"
        ON storage.objects FOR SELECT
        USING (bucket_id = ''documents'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can insert own documents"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = ''documents'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can update own documents"
        ON storage.objects FOR UPDATE
        USING (bucket_id = ''documents'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can delete own documents"
        ON storage.objects FOR DELETE
        USING (bucket_id = ''documents'' AND auth.uid()::text = (storage.foldername(name))[1])';

        -- Create storage policies for templates bucket
        EXECUTE 'CREATE POLICY "Users can view own templates"
        ON storage.objects FOR SELECT
        USING (bucket_id = ''templates'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can insert own templates"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = ''templates'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can update own templates"
        ON storage.objects FOR UPDATE
        USING (bucket_id = ''templates'' AND auth.uid()::text = (storage.foldername(name))[1])';

        EXECUTE 'CREATE POLICY "Users can delete own templates"
        ON storage.objects FOR DELETE
        USING (bucket_id = ''templates'' AND auth.uid()::text = (storage.foldername(name))[1])';

        RAISE NOTICE 'Storage policies created successfully';
    ELSE
        RAISE NOTICE 'Storage objects table does not exist - storage may not be enabled';
        RAISE NOTICE 'Please enable Storage in your Supabase project dashboard';
    END IF;
END $$;

-- 8. Ensure storage buckets exist and are properly configured
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        RAISE NOTICE 'Storage buckets table exists, creating/updating buckets...';

        -- Create documents bucket if it doesn't exist
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('documents', 'documents', false, 52428800, '{"application/pdf"}')
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = 52428800,
            allowed_mime_types = '{"application/pdf"}';

        -- Create templates bucket if it doesn't exist
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('templates', 'templates', false, 10485760, '{"application/json"}')
        ON CONFLICT (id) DO UPDATE SET
            public = false,
            file_size_limit = 10485760,
            allowed_mime_types = '{"application/json"}';

        RAISE NOTICE 'Storage buckets created/updated successfully';
    ELSE
        RAISE NOTICE 'Storage buckets table does not exist';
        RAISE NOTICE 'Please enable Storage in your Supabase project dashboard first';
        RAISE NOTICE 'Go to: Project Settings > Storage > Enable Storage';
    END IF;
END $$;

-- 9. Test the policies with a sample query
-- This should return the current user's documents (if any)
SELECT 
    id,
    name,
    type,
    user_id,
    created_at
FROM public.document_templates 
WHERE user_id = auth.uid()
LIMIT 5;

-- 10. Show final policy status
SELECT 'RLS Policies Fixed Successfully' as status;

-- Show current policies after fix
SELECT 
    'document_templates policies:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'document_templates'
ORDER BY policyname;

-- Show storage policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'policies') THEN
        RAISE NOTICE 'Storage policies:';
        -- Note: We can't easily return query results from DO blocks
        -- Users should check storage policies in Supabase Dashboard
    ELSE
        RAISE NOTICE 'Storage policies table not available - check Supabase Dashboard for storage configuration';
    END IF;
END $$;

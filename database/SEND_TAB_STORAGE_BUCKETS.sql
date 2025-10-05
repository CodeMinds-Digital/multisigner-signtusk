-- =====================================================
-- SEND TAB STORAGE BUCKETS
-- Create storage buckets for Send Tab feature
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Create storage buckets for Send Tab
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    -- 1. send-documents: Main document storage (100MB limit)
    ('send-documents', 'send-documents', false, 104857600, ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp'
    ]),
    
    -- 2. send-thumbnails: Document thumbnails (5MB limit, public)
    ('send-thumbnails', 'send-thumbnails', true, 5242880, ARRAY[
        'image/png',
        'image/jpeg',
        'image/webp'
    ]),
    
    -- 3. send-watermarks: Watermark images (2MB limit, private)
    ('send-watermarks', 'send-watermarks', false, 2097152, ARRAY[
        'image/png',
        'image/svg+xml'
    ]),
    
    -- 4. send-brand-assets: Brand logos and assets (5MB limit, public)
    ('send-brand-assets', 'send-brand-assets', true, 5242880, ARRAY[
        'image/png',
        'image/jpeg',
        'image/svg+xml',
        'image/webp'
    ])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- send-documents bucket policies
-- Users can upload their own documents
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'send-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'send-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'send-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'send-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- send-thumbnails bucket policies (public read)
-- Users can upload their own thumbnails
CREATE POLICY "Users can upload their own thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'send-thumbnails' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view thumbnails (public bucket)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'send-thumbnails');

-- Users can update their own thumbnails
CREATE POLICY "Users can update their own thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'send-thumbnails' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own thumbnails
CREATE POLICY "Users can delete their own thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'send-thumbnails' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- send-watermarks bucket policies
-- Users can upload their own watermarks
CREATE POLICY "Users can upload their own watermarks"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'send-watermarks' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own watermarks
CREATE POLICY "Users can view their own watermarks"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'send-watermarks' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update their own watermarks
CREATE POLICY "Users can update their own watermarks"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'send-watermarks' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own watermarks
CREATE POLICY "Users can delete their own watermarks"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'send-watermarks' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- send-brand-assets bucket policies (public read)
-- Users can upload their own brand assets
CREATE POLICY "Users can upload their own brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'send-brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can view brand assets (public bucket)
CREATE POLICY "Anyone can view brand assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'send-brand-assets');

-- Users can update their own brand assets
CREATE POLICY "Users can update their own brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'send-brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own brand assets
CREATE POLICY "Users can delete their own brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'send-brand-assets' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify buckets were created
SELECT
    id as bucket_name,
    public,
    file_size_limit / 1048576 as size_limit_mb,
    array_length(allowed_mime_types, 1) as mime_types_count,
    CASE
        WHEN id = 'send-documents' THEN '✅ Documents bucket (private, 100MB)'
        WHEN id = 'send-thumbnails' THEN '✅ Thumbnails bucket (public, 5MB)'
        WHEN id = 'send-watermarks' THEN '✅ Watermarks bucket (private, 2MB)'
        WHEN id = 'send-brand-assets' THEN '✅ Brand assets bucket (public, 5MB)'
        ELSE '⚠️ ' || id || ' bucket'
    END as bucket_status
FROM storage.buckets
WHERE id IN ('send-documents', 'send-thumbnails', 'send-watermarks', 'send-brand-assets')
ORDER BY id;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Send Tab storage buckets created successfully!';
    RAISE NOTICE '📁 Created 4 storage buckets:';
    RAISE NOTICE '   - send-documents (100MB, private)';
    RAISE NOTICE '   - send-thumbnails (5MB, public)';
    RAISE NOTICE '   - send-watermarks (2MB, private)';
    RAISE NOTICE '   - send-brand-assets (5MB, public)';
    RAISE NOTICE '🔒 Storage policies configured for data isolation';
    RAISE NOTICE '🔄 Next step: Run SEND_TAB_RLS_POLICIES.sql';
END $$;


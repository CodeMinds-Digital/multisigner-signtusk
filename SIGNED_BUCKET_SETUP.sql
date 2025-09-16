-- =====================================================
-- SIGNED BUCKET SETUP FOR MULTI-SIGNATURE WORKFLOW
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create the 'signed' storage bucket for final signed PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('signed', 'signed', false, 104857600, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = 104857600,
    allowed_mime_types = ARRAY['application/pdf'];

-- =====================================================
-- STORAGE POLICIES FOR SIGNED BUCKET
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view signed documents" ON storage.objects;
DROP POLICY IF EXISTS "System can upload signed documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can download their signed documents" ON storage.objects;

-- Allow system (service role) to upload signed documents
CREATE POLICY "System can upload signed documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'signed');

-- Allow users to view signed documents they are involved in
-- This policy allows access to signed documents for:
-- 1. The user who initiated the signing request
-- 2. Users who are signers in the request
CREATE POLICY "Users can view signed documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'signed' AND (
            -- Allow access if user initiated any signing request with this final PDF
            EXISTS (
                SELECT 1 FROM signing_requests sr 
                WHERE sr.final_pdf_url LIKE '%' || name || '%' 
                AND sr.initiated_by = auth.uid()
            )
            OR
            -- Allow access if user is a signer in any signing request with this final PDF
            EXISTS (
                SELECT 1 FROM signing_requests sr 
                JOIN signing_request_signers srs ON sr.id = srs.signing_request_id
                WHERE sr.final_pdf_url LIKE '%' || name || '%' 
                AND srs.signer_email = (
                    SELECT email FROM auth.users WHERE id = auth.uid()
                )
            )
        )
    );

-- Allow users to download their signed documents (same as view)
CREATE POLICY "Users can download their signed documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'signed' AND (
            EXISTS (
                SELECT 1 FROM signing_requests sr 
                WHERE sr.final_pdf_url LIKE '%' || name || '%' 
                AND sr.initiated_by = auth.uid()
            )
            OR
            EXISTS (
                SELECT 1 FROM signing_requests sr 
                JOIN signing_request_signers srs ON sr.id = srs.signing_request_id
                WHERE sr.final_pdf_url LIKE '%' || name || '%' 
                AND srs.signer_email = (
                    SELECT email FROM auth.users WHERE id = auth.uid()
                )
            )
        )
    );

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the bucket was created
SELECT 
    id as bucket_name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN id = 'signed' AND NOT public THEN '✅ Signed documents bucket (private, 100MB limit)'
        ELSE '⚠️ ' || id || ' bucket'
    END as bucket_status
FROM storage.buckets 
WHERE id = 'signed';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '✅ Signed bucket setup completed successfully!';
    RAISE NOTICE '📁 Bucket: signed (private, 100MB limit)';
    RAISE NOTICE '🔒 Policies: System upload, user view/download access';
    RAISE NOTICE '📄 Purpose: Store final signed PDFs from multi-signature workflows';
END $$;

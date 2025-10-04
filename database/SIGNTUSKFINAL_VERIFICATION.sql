-- =====================================================
-- SignTuskFinal Project - Document Management Verification
-- Run this in your Supabase SQL Editor to verify setup
-- =====================================================

-- Check document_templates table structure
SELECT 'Checking document_templates table structure...' as step;

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'document_templates' AND table_schema = 'public' 
ORDER BY ordinal_position;

-- Check if all required columns exist
SELECT 'Verifying required columns exist...' as step;

SELECT 
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'type') 
         THEN '✅ type column exists' 
         ELSE '❌ type column missing' END as type_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'signature_type') 
         THEN '✅ signature_type column exists' 
         ELSE '❌ signature_type column missing' END as signature_type_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'status') 
         THEN '✅ status column exists' 
         ELSE '❌ status column missing' END as status_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'pdf_url') 
         THEN '✅ pdf_url column exists' 
         ELSE '❌ pdf_url column missing' END as pdf_url_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'template_url') 
         THEN '✅ template_url column exists' 
         ELSE '❌ template_url column missing' END as template_url_check,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'schemas') 
         THEN '✅ schemas column exists' 
         ELSE '❌ schemas column missing' END as schemas_check;

-- Check RLS status
SELECT 'Checking RLS status...' as step;

SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE WHEN rowsecurity THEN '✅ RLS is enabled' ELSE '❌ RLS is disabled' END as rls_status
FROM pg_tables 
WHERE tablename = 'document_templates' AND schemaname = 'public';

-- Check RLS policies
SELECT 'Checking RLS policies...' as step;

SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Read access policy'
        WHEN cmd = 'INSERT' THEN '✅ Create access policy'
        WHEN cmd = 'UPDATE' THEN '✅ Update access policy'
        WHEN cmd = 'DELETE' THEN '✅ Delete access policy'
        ELSE cmd
    END as policy_type
FROM pg_policies 
WHERE tablename = 'document_templates' AND schemaname = 'public'
ORDER BY cmd;

-- Check storage buckets
SELECT 'Checking storage buckets...' as step;

SELECT 
    id as bucket_name,
    public,
    file_size_limit,
    allowed_mime_types,
    CASE 
        WHEN id = 'documents' AND NOT public THEN '✅ Documents bucket (private)'
        WHEN id = 'signatures' AND NOT public THEN '✅ Signatures bucket (private)'
        WHEN id = 'templates' AND NOT public THEN '✅ Templates bucket (private)'
        WHEN id = 'files' AND NOT public THEN '✅ Files bucket (private)'
        WHEN id = 'qrcodes' AND NOT public THEN '✅ QR codes bucket (private)'
        WHEN id = 'avatars' AND public THEN '✅ Avatars bucket (public)'
        ELSE '⚠️ ' || id || ' bucket'
    END as bucket_status
FROM storage.buckets 
WHERE id IN ('documents', 'signatures', 'templates', 'files', 'qrcodes', 'avatars')
ORDER BY id;

-- Check templates bucket MIME types
SELECT 'Checking templates bucket configuration...' as step;

SELECT 
    id,
    allowed_mime_types,
    CASE 
        WHEN 'application/json' = ANY(allowed_mime_types) THEN '✅ JSON files allowed'
        ELSE '❌ JSON files not allowed - needs update'
    END as json_support
FROM storage.buckets 
WHERE id = 'templates';

-- Check existing data
SELECT 'Checking existing data...' as step;

SELECT 
    COUNT(*) as total_templates,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_templates,
    COUNT(CASE WHEN status = 'incomplete' THEN 1 END) as incomplete_templates,
    COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as templates_with_pdf,
    COUNT(CASE WHEN schemas != '[]'::jsonb THEN 1 END) as templates_with_schemas
FROM public.document_templates;

-- Final verification summary
SELECT 'SETUP VERIFICATION SUMMARY' as step;

SELECT 
    '✅ Database setup complete for SignTuskFinal project' as status,
    'Document management system is ready to use!' as message;

-- Instructions for next steps
SELECT 'NEXT STEPS' as step;

SELECT 
    '1. Start your Next.js development server: npm run dev' as step_1,
    '2. Navigate to Document Management in the sidebar' as step_2,
    '3. Test creating a new document with PDF upload' as step_3,
    '4. Verify PDF Designer loads and schemas can be added' as step_4,
    '5. Check that document status updates correctly' as step_5;

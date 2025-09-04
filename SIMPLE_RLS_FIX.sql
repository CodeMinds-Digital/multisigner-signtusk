-- Simple RLS Fix for Document Management
-- Run this if the main script fails due to missing storage tables

-- 1. First, check if storage is enabled
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') 
        THEN 'Storage schema exists' 
        ELSE 'Storage schema missing - please enable Storage in Supabase Dashboard'
    END as storage_status;

-- 2. Fix document_templates table RLS policies (this should always work)
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

-- 3. Ensure RLS is enabled on document_templates
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- 4. Test the document_templates policies
SELECT 
    'Document Templates RLS Test:' as test,
    COUNT(*) as accessible_documents
FROM public.document_templates 
WHERE user_id = auth.uid();

-- 5. Show current document_templates policies
SELECT 
    'Document Templates Policies:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'document_templates'
ORDER BY policyname;

-- 6. Instructions for Storage setup
SELECT 'STORAGE SETUP INSTRUCTIONS:' as instructions;
SELECT '1. Go to Supabase Dashboard > Project Settings > Storage' as step1;
SELECT '2. Click "Enable Storage" if not already enabled' as step2;
SELECT '3. Create two buckets manually:' as step3;
SELECT '   - Name: documents, Public: false, File size limit: 50MB' as step3a;
SELECT '   - Name: templates, Public: false, File size limit: 10MB' as step3b;
SELECT '4. Set bucket policies to allow authenticated users access to their own folders' as step4;

-- 7. Alternative: Try to enable storage programmatically (may fail)
DO $$
BEGIN
    -- This might fail if storage extension is not available
    BEGIN
        -- Try to create storage schema if it doesn't exist
        CREATE SCHEMA IF NOT EXISTS storage;
        RAISE NOTICE 'Storage schema created or already exists';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create storage schema: %', SQLERRM;
        RAISE NOTICE 'Please enable Storage manually in Supabase Dashboard';
    END;
END $$;

-- 8. Final status
SELECT 'RLS Policies for document_templates table have been fixed!' as final_status;
SELECT 'If storage errors persist, please enable Storage in Supabase Dashboard manually' as storage_note;

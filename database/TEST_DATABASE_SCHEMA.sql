-- Test script to check document_templates table schema
-- Run this in Supabase SQL Editor to see what the table expects

-- 1. Check table structure
SELECT 
    'Table Structure:' as section,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check constraints
SELECT 
    'Constraints:' as section,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'document_templates' 
AND table_schema = 'public';

-- 3. Test minimal insert to see what's required
DO $$
DECLARE
    test_user_id uuid;
    result_id uuid;
BEGIN
    -- Get a real user ID from auth.users for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Try to insert minimal record with only required fields
    BEGIN
        INSERT INTO public.document_templates (
            name,
            template_data,
            user_id
        ) VALUES (
            'Test Document',
            '{}'::jsonb,
            test_user_id
        ) RETURNING id INTO result_id;
        
        RAISE NOTICE 'SUCCESS: Minimal insert worked with ID: %', result_id;
        
        -- Clean up test record
        DELETE FROM public.document_templates WHERE id = result_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Minimal insert failed: %', SQLERRM;
    END;
    
    -- Try to insert with all the fields our service is trying to use
    BEGIN
        INSERT INTO public.document_templates (
            name,
            template_data,
            user_id,
            description,
            category,
            is_public,
            is_system_template,
            usage_count
        ) VALUES (
            'Test Document Full',
            '{"type": "Contract", "signature_type": "single", "status": "incomplete", "pdf_url": "test/path.pdf", "schemas": []}'::jsonb,
            test_user_id,
            'Test description',
            'contract',
            false,
            false,
            0
        ) RETURNING id INTO result_id;
        
        RAISE NOTICE 'SUCCESS: Full insert worked with ID: %', result_id;
        
        -- Clean up test record
        DELETE FROM public.document_templates WHERE id = result_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Full insert failed: %', SQLERRM;
    END;
END $$;

-- 4. Show current data sample
SELECT 
    'Current Data Sample:' as section,
    id,
    name,
    template_data,
    user_id,
    created_at
FROM public.document_templates 
LIMIT 3;

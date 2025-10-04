-- Debug script to understand the document_templates table structure
-- Run this in Supabase SQL Editor to see what's required

-- 1. Check all columns and their constraints
SELECT 
    'Column Information:' as section,
    column_name, 
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check all constraints
SELECT 
    'Constraints:' as section,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'document_templates' 
AND table_schema = 'public';

-- 3. Check foreign key constraints specifically
SELECT 
    'Foreign Keys:' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'document_templates';

-- 4. Check check constraints
SELECT 
    'Check Constraints:' as section,
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%document_templates%';

-- 5. Test insert with minimal data to see what fails
SELECT 'Testing minimal insert...' as section;

-- This will show us exactly what's required
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    -- Get a real user ID from auth.users for testing
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing with user ID: %', test_user_id;
    
    -- Try to insert minimal record
    BEGIN
        INSERT INTO public.document_templates (
            name,
            template_data,
            user_id
        ) VALUES (
            'Test Document',
            '{}'::jsonb,
            test_user_id
        );
        
        RAISE NOTICE 'SUCCESS: Minimal insert worked';
        
        -- Clean up test record
        DELETE FROM public.document_templates 
        WHERE name = 'Test Document' AND user_id = test_user_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Minimal insert failed: %', SQLERRM;
    END;
END $$;

-- 6. Show current data structure
SELECT 
    'Current Data Sample:' as section,
    id,
    name,
    type,
    user_id,
    created_at
FROM public.document_templates 
LIMIT 3;

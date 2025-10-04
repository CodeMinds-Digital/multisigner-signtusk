-- Fix user_id constraint in document_templates table
-- Run this in Supabase SQL Editor if you're still getting errors

-- First, let's check the current constraint on user_id
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
AND column_name = 'user_id';

-- Make sure user_id is NOT NULL and has proper foreign key constraint
DO $$
BEGIN
    -- Set user_id to NOT NULL if it isn't already
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_templates' 
        AND column_name = 'user_id' 
        AND is_nullable = 'YES'
    ) THEN
        -- First update any NULL values to a default (this shouldn't happen in practice)
        UPDATE public.document_templates 
        SET user_id = '00000000-0000-0000-0000-000000000000'::uuid 
        WHERE user_id IS NULL;
        
        -- Then set the column to NOT NULL
        ALTER TABLE public.document_templates 
        ALTER COLUMN user_id SET NOT NULL;
        
        RAISE NOTICE 'Set user_id column to NOT NULL';
    ELSE
        RAISE NOTICE 'user_id column is already NOT NULL';
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'document_templates' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_id%'
    ) THEN
        ALTER TABLE public.document_templates 
        ADD CONSTRAINT fk_document_templates_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint for user_id already exists';
    END IF;
END $$;

-- Verify the final structure
SELECT 
    'Final verification:' as step,
    column_name, 
    is_nullable, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'document_templates' 
AND column_name IN ('user_id', 'template_data', 'name', 'type')
ORDER BY column_name;

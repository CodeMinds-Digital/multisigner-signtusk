-- =====================================================
-- Fix Enterprise Account for cmd@codeminds.digital
-- =====================================================
-- This script fixes the incomplete enterprise account setup
-- for the user cmd@codeminds.digital

-- Step 1: Create the corporate account for codeminds.digital domain
INSERT INTO public.corporate_accounts (
    id,
    company_name,
    email_domain,
    access_mode,
    owner_id,
    created_at,
    updated_at
)
VALUES (
    gen_random_uuid(),
    'Codeminds Digital',
    'codeminds.digital',
    'invite_only', -- Default to most restrictive mode
    '4e382a8a-74b2-4984-881b-9166f997df61', -- User ID of cmd@codeminds.digital
    NOW(),
    NOW()
)
ON CONFLICT (email_domain) DO NOTHING
RETURNING id;

-- Step 2: Get the corporate account ID (run this after Step 1)
-- Store the result to use in Step 3
DO $$
DECLARE
    corp_account_id UUID;
BEGIN
    -- Get the corporate account ID
    SELECT id INTO corp_account_id
    FROM public.corporate_accounts
    WHERE email_domain = 'codeminds.digital';

    -- Step 3: Update the user profile to link to corporate account
    UPDATE public.user_profiles
    SET
        corporate_account_id = corp_account_id,
        corporate_role = 'owner', -- First user becomes owner
        company_name = 'Codeminds Digital',
        account_status = 'active',
        email_verified = true, -- Set to true since they're already using the account
        updated_at = NOW()
    WHERE email = 'cmd@codeminds.digital';

    RAISE NOTICE 'Enterprise account setup completed for cmd@codeminds.digital';
    RAISE NOTICE 'Corporate Account ID: %', corp_account_id;
END $$;

-- Step 4: Verify the setup
SELECT 
    up.email,
    up.full_name,
    up.account_type,
    up.corporate_role,
    up.account_status,
    ca.company_name,
    ca.email_domain,
    ca.access_mode,
    ca.id as corporate_account_id
FROM public.user_profiles up
LEFT JOIN public.corporate_accounts ca ON up.corporate_account_id = ca.id
WHERE up.email = 'cmd@codeminds.digital';

-- =====================================================
-- Additional: Check for other fields that might need updating
-- =====================================================
-- You can manually update these fields as needed:
-- UPDATE public.user_profiles
-- SET
--     industry_field = 'Technology', -- Example
--     employee_count = 10, -- Example
--     job_title = 'CEO', -- Example
--     department = 'Management', -- Example
--     phone_number = '+1234567890' -- Example
-- WHERE email = 'cmd@codeminds.digital';


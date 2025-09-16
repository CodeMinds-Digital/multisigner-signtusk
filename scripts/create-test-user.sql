-- Create a test user profile for development
-- This script ensures we have a user with complete profile data for testing

-- First, check if the user already exists
DO $$
DECLARE
    test_user_id UUID := 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    test_email TEXT := 'admin@signtusk.com';
BEGIN
    -- Insert or update the test user profile
    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        first_name,
        last_name,
        company_name,
        company_domain,
        industry_field,
        employee_count,
        job_title,
        department,
        phone_number,
        account_type,
        email_verified,
        company_verified,
        onboarding_completed,
        avatar_url,
        plan,
        subscription_status,
        subscription_expires_at,
        documents_count,
        storage_used_mb,
        monthly_documents_used,
        monthly_limit,
        is_admin,
        last_login_at,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        test_email,
        'Admin User',
        'Admin',
        'User',
        'SignTusk Inc.',
        'signtusk.com',
        'Technology',
        50,
        'System Administrator',
        'IT',
        '+1-555-0123',
        'corporate',
        true,
        true,
        true,
        null,
        'enterprise',
        'active',
        NOW() + INTERVAL '1 year',
        0,
        0,
        0,
        1000,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        company_name = EXCLUDED.company_name,
        company_domain = EXCLUDED.company_domain,
        industry_field = EXCLUDED.industry_field,
        employee_count = EXCLUDED.employee_count,
        job_title = EXCLUDED.job_title,
        department = EXCLUDED.department,
        phone_number = EXCLUDED.phone_number,
        account_type = EXCLUDED.account_type,
        email_verified = EXCLUDED.email_verified,
        company_verified = EXCLUDED.company_verified,
        onboarding_completed = EXCLUDED.onboarding_completed,
        plan = EXCLUDED.plan,
        subscription_status = EXCLUDED.subscription_status,
        subscription_expires_at = EXCLUDED.subscription_expires_at,
        monthly_limit = EXCLUDED.monthly_limit,
        is_admin = EXCLUDED.is_admin,
        updated_at = NOW();

    RAISE NOTICE 'Test user profile created/updated successfully for: %', test_email;
END $$;

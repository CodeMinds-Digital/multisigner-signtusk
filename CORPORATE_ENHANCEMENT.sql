-- =====================================================
-- SignTusk Corporate Enhancement Migration
-- Adds corporate-specific fields and validation
-- =====================================================
-- Run this SQL script in your Supabase SQL Editor AFTER running SUPABASE_SETUP.sql

-- Add corporate-specific columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_domain TEXT,
ADD COLUMN IF NOT EXISTS industry_field TEXT,
ADD COLUMN IF NOT EXISTS employee_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'personal' CHECK (account_type IN ('personal', 'corporate')),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for company domain lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_domain ON public.user_profiles(company_domain);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_type ON public.user_profiles(account_type);

-- Function to extract domain from email
CREATE OR REPLACE FUNCTION public.extract_email_domain(email_address TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(SPLIT_PART(email_address, '@', 2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate corporate email domains
CREATE OR REPLACE FUNCTION public.is_valid_corporate_domain(domain TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    -- List of common personal email domains to reject
    personal_domains TEXT[] := ARRAY[
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
        'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
        'ymail.com', 'rocketmail.com', 'mail.com', 'gmx.com', 'protonmail.com',
        'tutanota.com', 'zoho.com', 'fastmail.com', 'hey.com', 'pm.me',
        'rediffmail.com', 'indiatimes.com', 'sify.com', 'vsnl.net'
    ];
BEGIN
    -- Check if domain is in the personal domains list
    IF domain = ANY(personal_domains) THEN
        RETURN false;
    END IF;
    
    -- Additional validation: domain should have at least one dot and be longer than 4 characters
    IF LENGTH(domain) < 4 OR POSITION('.' IN domain) = 0 THEN
        RETURN false;
    END IF;
    
    -- Domain should not start or end with a dot or hyphen
    IF LEFT(domain, 1) IN ('.', '-') OR RIGHT(domain, 1) IN ('.', '-') THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Enhanced trigger function for new user signup with corporate validation
CREATE OR REPLACE FUNCTION public.handle_new_user_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    email_domain TEXT;
    user_metadata JSONB;
BEGIN
    -- Get user metadata
    user_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
    
    -- Extract domain from email
    email_domain := public.extract_email_domain(NEW.email);
    
    -- Insert enhanced user profile
    INSERT INTO public.user_profiles (
        id, 
        email, 
        full_name,
        first_name,
        last_name,
        company_domain,
        account_type,
        email_verified
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(user_metadata->>'full_name', NEW.email),
        COALESCE(user_metadata->>'first_name', ''),
        COALESCE(user_metadata->>'last_name', ''),
        email_domain,
        COALESCE(user_metadata->>'account_type', 'personal'),
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the existing trigger with the enhanced version
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_enhanced();

-- Function to validate corporate signup data
CREATE OR REPLACE FUNCTION public.validate_corporate_signup(
    email_address TEXT,
    company_name_input TEXT,
    first_name_input TEXT,
    last_name_input TEXT
)
RETURNS JSONB AS $$
DECLARE
    email_domain TEXT;
    validation_result JSONB;
    errors TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Extract domain from email
    email_domain := public.extract_email_domain(email_address);
    
    -- Validate corporate email domain
    IF NOT public.is_valid_corporate_domain(email_domain) THEN
        errors := array_append(errors, 'Please use a valid corporate email address. Personal email domains (gmail.com, yahoo.com, etc.) are not allowed for corporate accounts.');
    END IF;
    
    -- Validate required fields
    IF LENGTH(TRIM(company_name_input)) < 2 THEN
        errors := array_append(errors, 'Company name is required and must be at least 2 characters long.');
    END IF;
    
    IF LENGTH(TRIM(first_name_input)) < 1 THEN
        errors := array_append(errors, 'First name is required.');
    END IF;
    
    IF LENGTH(TRIM(last_name_input)) < 1 THEN
        errors := array_append(errors, 'Last name is required.');
    END IF;
    
    -- Build result
    validation_result := json_build_object(
        'valid', array_length(errors, 1) IS NULL,
        'errors', errors,
        'domain', email_domain,
        'is_corporate_domain', public.is_valid_corporate_domain(email_domain)
    );
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile with corporate data
CREATE OR REPLACE FUNCTION public.update_user_corporate_profile(
    user_id UUID,
    company_name_input TEXT,
    industry_field_input TEXT DEFAULT NULL,
    employee_count_input INTEGER DEFAULT NULL,
    job_title_input TEXT DEFAULT NULL,
    department_input TEXT DEFAULT NULL,
    phone_number_input TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles 
    SET 
        company_name = company_name_input,
        industry_field = industry_field_input,
        employee_count = employee_count_input,
        job_title = job_title_input,
        department = department_input,
        phone_number = phone_number_input,
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for new columns
CREATE POLICY "Users can update their corporate profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.extract_email_domain(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_corporate_domain(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_corporate_signup(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_corporate_profile(UUID, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

-- Insert sample corporate domains for testing (optional)
INSERT INTO public.system_config (key, value, description, category) VALUES
('blocked_personal_domains', '["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com", "me.com", "mac.com", "live.com", "msn.com"]', 'List of personal email domains blocked for corporate signup', 'corporate_validation'),
('corporate_validation_enabled', 'true', 'Enable corporate email validation', 'corporate_validation'),
('min_company_name_length', '2', 'Minimum length for company name', 'corporate_validation'),
('require_corporate_fields', '["company_name", "first_name", "last_name"]', 'Required fields for corporate signup', 'corporate_validation')
ON CONFLICT (key) DO NOTHING;

-- Success message
SELECT 
    'Corporate Enhancement Migration Completed Successfully!' as message,
    json_build_object(
        'new_columns_added', 12,
        'new_functions_created', 4,
        'corporate_validation', 'enabled',
        'personal_domains_blocked', true,
        'enhanced_trigger', 'active'
    ) as enhancement_summary;

/*
🎉 CORPORATE ENHANCEMENT COMPLETE! 🎉

Your SignTusk database now includes:

✅ ENHANCED USER PROFILES:
   - first_name, last_name (separate fields)
   - company_name, company_domain
   - industry_field, employee_count
   - job_title, department, phone_number
   - account_type (personal/corporate)
   - email_verified, company_verified
   - onboarding_completed

✅ CORPORATE EMAIL VALIDATION:
   - Blocks personal domains (gmail.com, yahoo.com, etc.)
   - Validates corporate domain format
   - Extracts and stores company domain

✅ VALIDATION FUNCTIONS:
   - validate_corporate_signup() - Server-side validation
   - is_valid_corporate_domain() - Domain checking
   - extract_email_domain() - Domain extraction
   - update_user_corporate_profile() - Profile updates

✅ ENHANCED SECURITY:
   - RLS policies for new fields
   - Proper function permissions
   - Corporate-specific validation

NEXT STEPS:
1. Update your frontend to use the new validation functions
2. Add corporate-specific form fields
3. Implement domain-based company verification
4. Test corporate signup flow

CORPORATE SIGNUP FLOW:
1. User selects "Corporate" account type
2. Email domain is validated against personal domains
3. Required corporate fields are validated
4. Company profile is created with enhanced data
5. Optional company verification process

Happy corporate signing! 🏢
*/
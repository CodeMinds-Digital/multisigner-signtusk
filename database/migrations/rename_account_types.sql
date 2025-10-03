-- Migration: Rename account types from Personal/Corporate to Individual/Enterprise
-- Date: 2025-01-15
-- Description: Updates all references from 'personal' to 'individual' and 'corporate' to 'enterprise'

-- Step 1: Update user_profiles table - change account_type values
UPDATE user_profiles
SET account_type = 'individual'
WHERE account_type = 'personal';

UPDATE user_profiles
SET account_type = 'enterprise'
WHERE account_type = 'corporate';

-- Step 2: Verify the changes
SELECT 
  account_type,
  COUNT(*) as count
FROM user_profiles
GROUP BY account_type;

-- Expected output:
-- account_type | count
-- individual   | X
-- enterprise   | Y

-- Step 3: Add check constraint to ensure only valid values (optional but recommended)
-- First, drop existing constraint if it exists
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_account_type_check;

-- Add new constraint with updated values
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_account_type_check
CHECK (account_type IN ('individual', 'enterprise'));

-- Step 4: Update any comments or documentation in the database
COMMENT ON COLUMN user_profiles.account_type IS 'Type of account: individual or enterprise';

-- Step 5: Verification queries
-- Check for any remaining old values
SELECT COUNT(*) as old_personal_count
FROM user_profiles
WHERE account_type = 'personal';
-- Should return 0

SELECT COUNT(*) as old_corporate_count
FROM user_profiles
WHERE account_type = 'corporate';
-- Should return 0

-- Check new values
SELECT 
  account_type,
  corporate_role,
  COUNT(*) as count
FROM user_profiles
GROUP BY account_type, corporate_role
ORDER BY account_type, corporate_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'All "personal" accounts renamed to "individual"';
  RAISE NOTICE 'All "corporate" accounts renamed to "enterprise"';
END $$;


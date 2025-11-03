-- Check actual column names in signing_requests table
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'signing_requests'
ORDER BY ordinal_position;


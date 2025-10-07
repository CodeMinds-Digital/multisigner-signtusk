-- Add settings column to send_data_rooms table
-- This migration adds support for data room settings like password protection, access controls, etc.

-- Add settings column to store data room configuration
ALTER TABLE public.send_data_rooms 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add comment to document the settings structure
COMMENT ON COLUMN public.send_data_rooms.settings IS 'JSON object containing data room settings like password protection, access controls, expiration, etc.';

-- Example settings structure:
-- {
--   "requirePassword": false,
--   "password": null,
--   "allowDownload": true,
--   "requireEmail": false,
--   "allowedEmails": [],
--   "hasExpiration": false,
--   "expirationDate": null,
--   "allowedCountries": [],
--   "blockedCountries": [],
--   "allowedIps": [],
--   "blockedIps": []
-- }

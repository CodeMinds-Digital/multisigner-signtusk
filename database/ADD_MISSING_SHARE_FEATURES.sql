-- Add missing columns to send_document_links table for advanced sharing features
-- This migration adds support for geographic restrictions, IP restrictions, 
-- custom watermark text, account name, and custom button text

-- Add new columns to send_document_links table
ALTER TABLE public.send_document_links 
ADD COLUMN IF NOT EXISTS allowed_countries TEXT[],
ADD COLUMN IF NOT EXISTS blocked_countries TEXT[],
ADD COLUMN IF NOT EXISTS allowed_ips TEXT[],
ADD COLUMN IF NOT EXISTS blocked_ips TEXT[],
ADD COLUMN IF NOT EXISTS watermark_text TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS custom_button_text TEXT DEFAULT 'View Document';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_document_links_allowed_countries ON public.send_document_links USING GIN (allowed_countries);
CREATE INDEX IF NOT EXISTS idx_send_document_links_blocked_countries ON public.send_document_links USING GIN (blocked_countries);
CREATE INDEX IF NOT EXISTS idx_send_document_links_allowed_ips ON public.send_document_links USING GIN (allowed_ips);
CREATE INDEX IF NOT EXISTS idx_send_document_links_blocked_ips ON public.send_document_links USING GIN (blocked_ips);

-- Update RLS policies to include new columns (if needed)
-- The existing RLS policies should automatically cover the new columns

-- Add comments for documentation
COMMENT ON COLUMN public.send_document_links.allowed_countries IS 'Array of country names that are allowed to access the document';
COMMENT ON COLUMN public.send_document_links.blocked_countries IS 'Array of country names that are blocked from accessing the document';
COMMENT ON COLUMN public.send_document_links.allowed_ips IS 'Array of IP addresses that are allowed to access the document';
COMMENT ON COLUMN public.send_document_links.blocked_ips IS 'Array of IP addresses that are blocked from accessing the document';
COMMENT ON COLUMN public.send_document_links.watermark_text IS 'Custom text to display as watermark on document pages';
COMMENT ON COLUMN public.send_document_links.account_name IS 'Custom account/sender name to display to viewers';
COMMENT ON COLUMN public.send_document_links.custom_button_text IS 'Custom text for the main action button (default: View Document)';

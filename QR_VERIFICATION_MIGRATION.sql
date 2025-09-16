-- QR Code Verification System Migration
-- Run this in Supabase SQL Editor to add QR verification functionality

-- 1. Create QR verifications table
CREATE TABLE IF NOT EXISTS public.qr_verifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    signature_request_id UUID NOT NULL REFERENCES public.signing_requests(id) ON DELETE CASCADE,
    verification_url TEXT NOT NULL,
    qr_code_data TEXT NOT NULL, -- Base64 encoded QR code image
    document_hash TEXT NOT NULL, -- SHA-256 hash of the PDF for integrity verification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one QR verification per signing request
    UNIQUE(signature_request_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_verifications_signature_request_id 
ON public.qr_verifications(signature_request_id);

CREATE INDEX IF NOT EXISTS idx_qr_verifications_document_hash 
ON public.qr_verifications(document_hash);

CREATE INDEX IF NOT EXISTS idx_qr_verifications_created_at 
ON public.qr_verifications(created_at);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.qr_verifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies

-- Policy: Users can view QR verifications for their own signing requests
CREATE POLICY "Users can view their QR verifications" ON public.qr_verifications
    FOR SELECT USING (
        signature_request_id IN (
            SELECT id FROM public.signing_requests 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT signing_request_id FROM public.signing_request_signers 
                WHERE signer_email = (
                    SELECT email FROM auth.users WHERE id = auth.uid()
                )
            )
        )
    );

-- Policy: System can insert QR verifications (for PDF generation)
CREATE POLICY "System can insert QR verifications" ON public.qr_verifications
    FOR INSERT WITH CHECK (true);

-- Policy: Users can update their QR verifications
CREATE POLICY "Users can update their QR verifications" ON public.qr_verifications
    FOR UPDATE USING (
        signature_request_id IN (
            SELECT id FROM public.signing_requests 
            WHERE created_by = auth.uid()
        )
    );

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qr_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for updated_at
CREATE TRIGGER update_qr_verifications_updated_at_trigger
    BEFORE UPDATE ON public.qr_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_qr_verifications_updated_at();

-- 7. Add environment variable support (optional)
-- You can add this to your Supabase project settings or .env file:
-- ENABLE_QR_CODES=true

-- 8. Grant necessary permissions
GRANT ALL ON public.qr_verifications TO authenticated;
GRANT ALL ON public.qr_verifications TO service_role;

-- 9. Create view for QR verification with signing request details
CREATE OR REPLACE VIEW public.qr_verification_details AS
SELECT 
    qv.id,
    qv.signature_request_id,
    qv.verification_url,
    qv.document_hash,
    qv.created_at as qr_created_at,
    sr.status as request_status,
    sr.document_status,
    sr.final_pdf_url,
    d.title as document_title,
    d.file_name as document_file_name,
    sr.created_by as request_creator,
    COUNT(srs.id) as total_signers,
    COUNT(CASE WHEN srs.status = 'signed' THEN 1 END) as completed_signers
FROM public.qr_verifications qv
JOIN public.signing_requests sr ON qv.signature_request_id = sr.id
JOIN public.documents d ON sr.document_template_id = d.id
LEFT JOIN public.signing_request_signers srs ON sr.id = srs.signing_request_id
GROUP BY 
    qv.id, qv.signature_request_id, qv.verification_url, qv.document_hash, 
    qv.created_at, sr.status, sr.document_status, sr.final_pdf_url,
    d.title, d.file_name, sr.created_by;

-- 10. Grant permissions on the view
GRANT SELECT ON public.qr_verification_details TO authenticated;
GRANT SELECT ON public.qr_verification_details TO service_role;

-- 11. Create RLS policy for the view
CREATE POLICY "Users can view QR verification details" ON public.qr_verification_details
    FOR SELECT USING (
        signature_request_id IN (
            SELECT id FROM public.signing_requests 
            WHERE created_by = auth.uid()
            OR id IN (
                SELECT signing_request_id FROM public.signing_request_signers 
                WHERE signer_email = (
                    SELECT email FROM auth.users WHERE id = auth.uid()
                )
            )
        )
    );

-- 12. Verification complete message
SELECT 'QR Verification system migration completed successfully!' as status;

-- 13. Test the setup
SELECT 
    'Tables created: ' || COUNT(*) as tables_status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('qr_verifications');

SELECT 
    'Policies created: ' || COUNT(*) as policies_status
FROM pg_policies 
WHERE tablename = 'qr_verifications';

-- 14. Sample query to verify structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'qr_verifications'
ORDER BY ordinal_position;

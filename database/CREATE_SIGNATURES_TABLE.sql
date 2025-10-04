-- Create signatures table for user signature templates
-- This table stores reusable signature templates that users can create and manage

CREATE TABLE IF NOT EXISTS public.signatures (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    signature_data TEXT NOT NULL, -- Base64 encoded signature image
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON public.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_is_default ON public.signatures(user_id, is_default);

-- Enable Row Level Security (RLS)
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own signatures" ON public.signatures
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signatures" ON public.signatures
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signatures" ON public.signatures
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own signatures" ON public.signatures
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_signatures_updated_at
    BEFORE UPDATE ON public.signatures
    FOR EACH ROW EXECUTE FUNCTION public.update_signatures_updated_at();

-- Grant permissions
GRANT ALL ON public.signatures TO authenticated;
GRANT USAGE ON SEQUENCE signatures_id_seq TO authenticated;

-- Insert some sample signatures for testing (optional)
-- You can remove this section if you don't want sample data
/*
INSERT INTO public.signatures (user_id, name, signature_data, is_default) VALUES
(
    (SELECT id FROM auth.users LIMIT 1),
    'My Default Signature',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    true
);
*/

-- Verify table creation
SELECT 'Signatures table created successfully!' as status;

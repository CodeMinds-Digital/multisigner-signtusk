-- Add Document Versioning System
-- Migration: 20250107_add_document_versioning.sql
-- Description: Adds version control capabilities to the Send module

-- Add versioning columns to existing documents table
ALTER TABLE public.send_shared_documents 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS parent_document_id TEXT REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS version_notes TEXT,
ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMP WITH TIME ZONE;

-- Create index for version queries
CREATE INDEX IF NOT EXISTS idx_send_documents_versioning 
ON public.send_shared_documents(parent_document_id, version_number);

CREATE INDEX IF NOT EXISTS idx_send_documents_primary 
ON public.send_shared_documents(parent_document_id, is_primary) 
WHERE is_primary = true;

-- Create document version history table for detailed tracking
CREATE TABLE IF NOT EXISTS public.send_document_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT NOT NULL REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    version_notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(document_id, version_number)
);

-- Create indexes for version history
CREATE INDEX IF NOT EXISTS idx_send_document_versions_document 
ON public.send_document_versions(document_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_send_document_versions_active 
ON public.send_document_versions(document_id, is_active) 
WHERE is_active = true;

-- Create function to automatically manage version numbers
CREATE OR REPLACE FUNCTION public.manage_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new version of an existing document
    IF NEW.parent_document_id IS NOT NULL THEN
        -- Get the next version number
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO NEW.version_number
        FROM public.send_shared_documents 
        WHERE parent_document_id = NEW.parent_document_id 
           OR id = NEW.parent_document_id;
        
        -- Mark previous versions as non-primary
        UPDATE public.send_shared_documents 
        SET is_primary = false 
        WHERE (parent_document_id = NEW.parent_document_id OR id = NEW.parent_document_id)
          AND id != NEW.id;
        
        -- Ensure new version is primary
        NEW.is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for version management
DROP TRIGGER IF EXISTS trigger_manage_document_version ON public.send_shared_documents;
CREATE TRIGGER trigger_manage_document_version
    BEFORE INSERT ON public.send_shared_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_document_version();

-- Create function to get document version tree
CREATE OR REPLACE FUNCTION public.get_document_version_tree(doc_id TEXT)
RETURNS TABLE (
    id TEXT,
    title TEXT,
    version_number INTEGER,
    is_primary BOOLEAN,
    file_size BIGINT,
    file_type TEXT,
    version_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    created_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE version_tree AS (
        -- Base case: find the root document
        SELECT d.id, d.title, d.version_number, d.is_primary, d.file_size, d.file_type, 
               d.version_notes, d.created_at, d.created_by
        FROM public.send_shared_documents d
        WHERE d.id = doc_id OR d.parent_document_id = doc_id
        
        UNION ALL
        
        -- Recursive case: find all versions
        SELECT d.id, d.title, d.version_number, d.is_primary, d.file_size, d.file_type,
               d.version_notes, d.created_at, d.created_by
        FROM public.send_shared_documents d
        INNER JOIN version_tree vt ON d.parent_document_id = vt.id
    )
    SELECT vt.id, vt.title, vt.version_number, vt.is_primary, vt.file_size, vt.file_type,
           vt.version_notes, vt.created_at, vt.created_by
    FROM version_tree vt
    ORDER BY vt.version_number DESC;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for document versioning
ALTER TABLE public.send_document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see versions of their own documents
CREATE POLICY "Users can view their document versions" ON public.send_document_versions
    FOR SELECT USING (
        created_by = auth.uid()::text OR 
        document_id IN (
            SELECT id FROM public.send_shared_documents 
            WHERE created_by = auth.uid()::text
        )
    );

-- Policy: Users can only create versions for their own documents
CREATE POLICY "Users can create versions for their documents" ON public.send_document_versions
    FOR INSERT WITH CHECK (
        created_by = auth.uid()::text AND
        document_id IN (
            SELECT id FROM public.send_shared_documents 
            WHERE created_by = auth.uid()::text
        )
    );

-- Policy: Users can update their own document versions
CREATE POLICY "Users can update their document versions" ON public.send_document_versions
    FOR UPDATE USING (
        created_by = auth.uid()::text
    );

-- Update existing documents to have proper version info
UPDATE public.send_shared_documents 
SET version_number = 1, is_primary = true 
WHERE version_number IS NULL;

-- Insert version history for existing documents
INSERT INTO public.send_document_versions (
    document_id, version_number, file_url, file_name, file_size, file_type, 
    version_notes, created_by, created_at
)
SELECT 
    id, version_number, file_url, file_name, file_size, file_type,
    'Initial version', created_by, created_at
FROM public.send_shared_documents
WHERE id NOT IN (SELECT document_id FROM public.send_document_versions);

-- Add comment for documentation
COMMENT ON TABLE public.send_document_versions IS 'Tracks version history for documents with detailed metadata';
COMMENT ON FUNCTION public.get_document_version_tree(TEXT) IS 'Returns complete version tree for a document including all versions';
COMMENT ON FUNCTION public.manage_document_version() IS 'Automatically manages version numbers and primary version flags';

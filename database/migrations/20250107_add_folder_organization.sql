-- Add Folder Organization System
-- Migration: 20250107_add_folder_organization.sql
-- Description: Adds hierarchical folder structure for document organization

-- Create folders table
CREATE TABLE IF NOT EXISTS public.send_folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.send_folders(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    path TEXT NOT NULL, -- Materialized path like "/folder1/subfolder2"
    color TEXT DEFAULT '#3B82F6', -- Folder color for UI
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique folder names within the same parent
    UNIQUE(parent_id, name, user_id)
);

-- Create indexes for folder queries
CREATE INDEX IF NOT EXISTS idx_send_folders_user 
ON public.send_folders(user_id);

CREATE INDEX IF NOT EXISTS idx_send_folders_parent 
ON public.send_folders(parent_id);

CREATE INDEX IF NOT EXISTS idx_send_folders_path 
ON public.send_folders(path);

CREATE INDEX IF NOT EXISTS idx_send_folders_user_parent 
ON public.send_folders(user_id, parent_id);

-- Add folder_id to documents table
ALTER TABLE public.send_shared_documents 
ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES public.send_folders(id) ON DELETE SET NULL;

-- Create index for document folder queries
CREATE INDEX IF NOT EXISTS idx_send_documents_folder 
ON public.send_shared_documents(folder_id);

CREATE INDEX IF NOT EXISTS idx_send_documents_user_folder 
ON public.send_shared_documents(user_id, folder_id);

-- Create function to automatically update folder paths
CREATE OR REPLACE FUNCTION public.update_folder_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path TEXT;
BEGIN
    -- If this is a root folder (no parent)
    IF NEW.parent_id IS NULL THEN
        NEW.path = '/' || NEW.name;
    ELSE
        -- Get parent's path
        SELECT path INTO parent_path 
        FROM public.send_folders 
        WHERE id = NEW.parent_id;
        
        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent folder not found';
        END IF;
        
        -- Build new path
        NEW.path = parent_path || '/' || NEW.name;
    END IF;
    
    -- Update timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for path management
DROP TRIGGER IF EXISTS trigger_update_folder_path ON public.send_folders;
CREATE TRIGGER trigger_update_folder_path
    BEFORE INSERT OR UPDATE ON public.send_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_folder_path();

-- Create function to update child folder paths when parent changes
CREATE OR REPLACE FUNCTION public.update_child_folder_paths()
RETURNS TRIGGER AS $$
BEGIN
    -- If path changed, update all child folders
    IF OLD.path != NEW.path THEN
        UPDATE public.send_folders 
        SET path = REPLACE(path, OLD.path, NEW.path)
        WHERE path LIKE OLD.path || '/%';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for child path updates
DROP TRIGGER IF EXISTS trigger_update_child_folder_paths ON public.send_folders;
CREATE TRIGGER trigger_update_child_folder_paths
    AFTER UPDATE ON public.send_folders
    FOR EACH ROW
    WHEN (OLD.path IS DISTINCT FROM NEW.path)
    EXECUTE FUNCTION public.update_child_folder_paths();

-- Create function to get folder tree
CREATE OR REPLACE FUNCTION public.get_folder_tree(user_id_param TEXT)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    parent_id TEXT,
    path TEXT,
    color TEXT,
    description TEXT,
    order_index INTEGER,
    document_count BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE folder_tree AS (
        -- Base case: root folders
        SELECT f.id, f.name, f.parent_id, f.path, f.color, f.description, f.order_index,
               COUNT(d.id) as document_count, f.created_at
        FROM public.send_folders f
        LEFT JOIN public.send_shared_documents d ON f.id = d.folder_id AND d.is_primary = true
        WHERE f.user_id = user_id_param AND f.parent_id IS NULL
        GROUP BY f.id, f.name, f.parent_id, f.path, f.color, f.description, f.order_index, f.created_at
        
        UNION ALL
        
        -- Recursive case: child folders
        SELECT f.id, f.name, f.parent_id, f.path, f.color, f.description, f.order_index,
               COUNT(d.id) as document_count, f.created_at
        FROM public.send_folders f
        LEFT JOIN public.send_shared_documents d ON f.id = d.folder_id AND d.is_primary = true
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.user_id = user_id_param
        GROUP BY f.id, f.name, f.parent_id, f.path, f.color, f.description, f.order_index, f.created_at
    )
    SELECT ft.id, ft.name, ft.parent_id, ft.path, ft.color, ft.description, 
           ft.order_index, ft.document_count, ft.created_at
    FROM folder_tree ft
    ORDER BY ft.path, ft.order_index;
END;
$$ LANGUAGE plpgsql;

-- Create function to move documents between folders
CREATE OR REPLACE FUNCTION public.move_documents_to_folder(
    document_ids TEXT[],
    target_folder_id TEXT,
    user_id_param TEXT
)
RETURNS INTEGER AS $$
DECLARE
    moved_count INTEGER := 0;
BEGIN
    -- Verify user owns the target folder (if not null)
    IF target_folder_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.send_folders 
            WHERE id = target_folder_id AND user_id = user_id_param
        ) THEN
            RAISE EXCEPTION 'Target folder not found or access denied';
        END IF;
    END IF;
    
    -- Move documents
    UPDATE public.send_shared_documents 
    SET folder_id = target_folder_id,
        updated_at = NOW()
    WHERE id = ANY(document_ids) 
      AND user_id = user_id_param;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    RETURN moved_count;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for folders
ALTER TABLE public.send_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own folders
CREATE POLICY "Users can view their folders" ON public.send_folders
    FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Users can only create folders for themselves
CREATE POLICY "Users can create their folders" ON public.send_folders
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only update their own folders
CREATE POLICY "Users can update their folders" ON public.send_folders
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy: Users can only delete their own folders
CREATE POLICY "Users can delete their folders" ON public.send_folders
    FOR DELETE USING (user_id = auth.uid()::text);

-- Add comments for documentation
COMMENT ON TABLE public.send_folders IS 'Hierarchical folder structure for organizing documents';
COMMENT ON FUNCTION public.get_folder_tree(TEXT) IS 'Returns complete folder tree with document counts for a user';
COMMENT ON FUNCTION public.move_documents_to_folder(TEXT[], TEXT, TEXT) IS 'Moves multiple documents to a target folder with permission checks';

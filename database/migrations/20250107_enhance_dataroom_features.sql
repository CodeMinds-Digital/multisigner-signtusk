-- Enhance Dataroom Features
-- Migration: 20250107_enhance_dataroom_features.sql
-- Description: Adds viewer groups, granular permissions, and hierarchical folders to datarooms

-- Create viewer groups table
CREATE TABLE IF NOT EXISTS public.send_dataroom_viewer_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    data_room_id TEXT NOT NULL REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique group names within the same dataroom
    UNIQUE(data_room_id, name)
);

-- Create viewer group members table
CREATE TABLE IF NOT EXISTS public.send_dataroom_viewer_group_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    group_id TEXT NOT NULL REFERENCES public.send_dataroom_viewer_groups(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    company TEXT,
    role TEXT DEFAULT 'viewer',
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique email per group
    UNIQUE(group_id, email)
);

-- Create granular permissions table
CREATE TABLE IF NOT EXISTS public.send_dataroom_permissions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    data_room_id TEXT NOT NULL REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    viewer_group_id TEXT REFERENCES public.send_dataroom_viewer_groups(id) ON DELETE CASCADE,
    viewer_email TEXT, -- For individual permissions
    resource_type TEXT NOT NULL, -- 'document', 'folder', 'dataroom'
    resource_id TEXT NOT NULL, -- Document ID, folder ID, or dataroom ID
    
    -- Permission flags
    can_view BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_print BOOLEAN DEFAULT false,
    can_share BOOLEAN DEFAULT false,
    can_comment BOOLEAN DEFAULT false,
    
    -- Time-based permissions
    access_starts_at TIMESTAMP WITH TIME ZONE,
    access_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    granted_by TEXT, -- User ID who granted permission
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either group or individual permission, not both
    CHECK ((viewer_group_id IS NOT NULL AND viewer_email IS NULL) OR 
           (viewer_group_id IS NULL AND viewer_email IS NOT NULL))
);

-- Enhance data rooms table with new features
ALTER TABLE public.send_data_rooms 
ADD COLUMN IF NOT EXISTS default_permissions JSONB DEFAULT '{
    "can_view": true,
    "can_download": false,
    "can_print": false,
    "can_share": false,
    "can_comment": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS require_nda BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS nda_text TEXT,
ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS watermark_text TEXT,
ADD COLUMN IF NOT EXISTS access_request_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_approve_domains TEXT[],
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "new_viewer": true,
    "document_viewed": false,
    "download_activity": true,
    "access_requests": true
}'::jsonb;

-- Create hierarchical folders table for datarooms
CREATE TABLE IF NOT EXISTS public.send_dataroom_folders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    data_room_id TEXT NOT NULL REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES public.send_dataroom_folders(id) ON DELETE CASCADE,
    path TEXT NOT NULL, -- Materialized path like "/folder1/subfolder2"
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique folder names within the same parent
    UNIQUE(data_room_id, parent_id, name)
);

-- Add folder_id to data room documents
ALTER TABLE public.send_data_room_documents 
ADD COLUMN IF NOT EXISTS folder_id TEXT REFERENCES public.send_dataroom_folders(id) ON DELETE SET NULL;

-- Create access requests table
CREATE TABLE IF NOT EXISTS public.send_dataroom_access_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    data_room_id TEXT NOT NULL REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    requester_email TEXT NOT NULL,
    requester_name TEXT,
    requester_company TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by TEXT, -- User ID who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_groups_data_room 
ON public.send_dataroom_viewer_groups(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_group_members_group 
ON public.send_dataroom_viewer_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_group_members_email 
ON public.send_dataroom_viewer_group_members(email);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_permissions_data_room 
ON public.send_dataroom_permissions(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_permissions_resource 
ON public.send_dataroom_permissions(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_permissions_viewer_group 
ON public.send_dataroom_permissions(viewer_group_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_permissions_viewer_email 
ON public.send_dataroom_permissions(viewer_email);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_folders_data_room 
ON public.send_dataroom_folders(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_folders_parent 
ON public.send_dataroom_folders(parent_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_folders_path 
ON public.send_dataroom_folders(path);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_access_requests_data_room 
ON public.send_dataroom_access_requests(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_access_requests_email 
ON public.send_dataroom_access_requests(requester_email);

-- Create function to automatically update folder paths
CREATE OR REPLACE FUNCTION public.update_dataroom_folder_path()
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
        FROM public.send_dataroom_folders 
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

-- Create trigger for folder path management
DROP TRIGGER IF EXISTS trigger_update_dataroom_folder_path ON public.send_dataroom_folders;
CREATE TRIGGER trigger_update_dataroom_folder_path
    BEFORE INSERT OR UPDATE ON public.send_dataroom_folders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_dataroom_folder_path();

-- Create function to get dataroom permissions for a viewer
CREATE OR REPLACE FUNCTION public.get_dataroom_viewer_permissions(
    data_room_id_param TEXT,
    viewer_email_param TEXT
)
RETURNS TABLE (
    resource_type TEXT,
    resource_id TEXT,
    can_view BOOLEAN,
    can_download BOOLEAN,
    can_print BOOLEAN,
    can_share BOOLEAN,
    can_comment BOOLEAN,
    access_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    -- Direct individual permissions
    SELECT 
        p.resource_type,
        p.resource_id,
        p.can_view,
        p.can_download,
        p.can_print,
        p.can_share,
        p.can_comment,
        p.access_expires_at
    FROM public.send_dataroom_permissions p
    WHERE p.data_room_id = data_room_id_param
      AND p.viewer_email = viewer_email_param
      AND (p.access_expires_at IS NULL OR p.access_expires_at > NOW())
    
    UNION ALL
    
    -- Group-based permissions
    SELECT 
        p.resource_type,
        p.resource_id,
        p.can_view,
        p.can_download,
        p.can_print,
        p.can_share,
        p.can_comment,
        p.access_expires_at
    FROM public.send_dataroom_permissions p
    INNER JOIN public.send_dataroom_viewer_groups vg ON p.viewer_group_id = vg.id
    INNER JOIN public.send_dataroom_viewer_group_members vgm ON vg.id = vgm.group_id
    WHERE p.data_room_id = data_room_id_param
      AND vgm.email = viewer_email_param
      AND (p.access_expires_at IS NULL OR p.access_expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- Create function to check if viewer has access to resource
CREATE OR REPLACE FUNCTION public.check_dataroom_access(
    data_room_id_param TEXT,
    viewer_email_param TEXT,
    resource_type_param TEXT,
    resource_id_param TEXT,
    permission_type_param TEXT -- 'view', 'download', 'print', 'share', 'comment'
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
    permission_column TEXT;
BEGIN
    -- Map permission type to column name
    permission_column := 'can_' || permission_type_param;
    
    -- Check if viewer has the specific permission
    EXECUTE format('
        SELECT COALESCE(MAX(CASE WHEN %I THEN 1 ELSE 0 END), 0) > 0
        FROM public.get_dataroom_viewer_permissions($1, $2)
        WHERE resource_type = $3 AND resource_id = $4
    ', permission_column)
    INTO has_access
    USING data_room_id_param, viewer_email_param, resource_type_param, resource_id_param;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for new tables
ALTER TABLE public.send_dataroom_viewer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_dataroom_viewer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_dataroom_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_dataroom_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_dataroom_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viewer groups
CREATE POLICY "Users can manage viewer groups for their datarooms" ON public.send_dataroom_viewer_groups
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for viewer group members
CREATE POLICY "Users can manage viewer group members for their datarooms" ON public.send_dataroom_viewer_group_members
    FOR ALL USING (
        group_id IN (
            SELECT vg.id FROM public.send_dataroom_viewer_groups vg
            INNER JOIN public.send_data_rooms dr ON vg.data_room_id = dr.id
            WHERE dr.user_id = auth.uid()::text
        )
    );

-- RLS Policies for permissions
CREATE POLICY "Users can manage permissions for their datarooms" ON public.send_dataroom_permissions
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for folders
CREATE POLICY "Users can manage folders for their datarooms" ON public.send_dataroom_folders
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for access requests
CREATE POLICY "Users can view access requests for their datarooms" ON public.send_dataroom_access_requests
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()::text
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.send_dataroom_viewer_groups IS 'Viewer groups for organizing dataroom access';
COMMENT ON TABLE public.send_dataroom_viewer_group_members IS 'Members of viewer groups with their access details';
COMMENT ON TABLE public.send_dataroom_permissions IS 'Granular permissions for dataroom resources';
COMMENT ON TABLE public.send_dataroom_folders IS 'Hierarchical folder structure within datarooms';
COMMENT ON TABLE public.send_dataroom_access_requests IS 'Access requests for datarooms';
COMMENT ON FUNCTION public.get_dataroom_viewer_permissions(TEXT, TEXT) IS 'Returns all permissions for a viewer in a dataroom';
COMMENT ON FUNCTION public.check_dataroom_access(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Checks if a viewer has specific permission for a resource';

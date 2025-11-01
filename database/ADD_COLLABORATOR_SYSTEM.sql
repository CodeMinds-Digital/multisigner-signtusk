-- Add comprehensive collaborator management system
-- This migration adds external collaborator invitations and role-based access

-- Create table for data room collaborators
CREATE TABLE IF NOT EXISTS public.send_dataroom_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    
    -- Collaborator Info
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'collaborator', 'admin')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    -- Permissions
    permissions JSONB DEFAULT '{
        "can_view": true,
        "can_download": false,
        "can_upload": false,
        "can_share": false,
        "can_comment": false,
        "can_manage_users": false
    }'::jsonb,
    
    -- Invitation Details
    invitation_token TEXT UNIQUE NOT NULL,
    invitation_message TEXT,
    expires_at TIMESTAMPTZ,
    
    -- Activity Tracking
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    last_activity TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(data_room_id, email)
);

-- Create table for collaborator activity logs
CREATE TABLE IF NOT EXISTS public.send_collaborator_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collaborator_id UUID REFERENCES public.send_dataroom_collaborators(id) ON DELETE CASCADE NOT NULL,
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    
    -- Activity Details
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'invitation_sent', 'invitation_accepted', 'invitation_declined',
        'document_viewed', 'document_downloaded', 'document_uploaded',
        'comment_added', 'link_shared', 'user_invited'
    )),
    activity_data JSONB DEFAULT '{}'::jsonb,
    
    -- Context
    document_id UUID,
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for collaborator upload permissions
CREATE TABLE IF NOT EXISTS public.send_collaborator_upload_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collaborator_id UUID REFERENCES public.send_dataroom_collaborators(id) ON DELETE CASCADE NOT NULL,
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    
    -- Upload Restrictions
    allowed_file_types TEXT[], -- e.g., ['pdf', 'docx', 'xlsx']
    max_file_size_mb INTEGER DEFAULT 100,
    max_files_per_day INTEGER,
    allowed_folders TEXT[], -- folder paths where uploads are allowed
    
    -- Approval Settings
    requires_approval BOOLEAN DEFAULT false,
    auto_approve_types TEXT[], -- file types that don't need approval
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for pending file uploads (requiring approval)
CREATE TABLE IF NOT EXISTS public.send_pending_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collaborator_id UUID REFERENCES public.send_dataroom_collaborators(id) ON DELETE CASCADE NOT NULL,
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    
    -- File Details
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL, -- temporary storage path
    folder_path TEXT DEFAULT '/',
    
    -- Upload Info
    upload_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    
    -- Review Details
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    -- Metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_data_room_id ON public.send_dataroom_collaborators(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_email ON public.send_dataroom_collaborators(email);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_status ON public.send_dataroom_collaborators(status);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_role ON public.send_dataroom_collaborators(role);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_invitation_token ON public.send_dataroom_collaborators(invitation_token);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_collaborators_invited_by ON public.send_dataroom_collaborators(invited_by);

CREATE INDEX IF NOT EXISTS idx_send_collaborator_activities_collaborator_id ON public.send_collaborator_activities(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_send_collaborator_activities_data_room_id ON public.send_collaborator_activities(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_collaborator_activities_activity_type ON public.send_collaborator_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_send_collaborator_activities_created_at ON public.send_collaborator_activities(created_at);

CREATE INDEX IF NOT EXISTS idx_send_collaborator_upload_permissions_collaborator_id ON public.send_collaborator_upload_permissions(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_send_collaborator_upload_permissions_data_room_id ON public.send_collaborator_upload_permissions(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_pending_uploads_collaborator_id ON public.send_pending_uploads(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_send_pending_uploads_data_room_id ON public.send_pending_uploads(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_pending_uploads_status ON public.send_pending_uploads(status);
CREATE INDEX IF NOT EXISTS idx_send_pending_uploads_expires_at ON public.send_pending_uploads(expires_at);

-- Add RLS policies for the new tables
ALTER TABLE public.send_dataroom_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_collaborator_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_collaborator_upload_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_pending_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policy for collaborators - users can only access collaborators for their own data rooms
CREATE POLICY "Users can manage collaborators for their own data rooms" ON public.send_dataroom_collaborators
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policy for collaborator activities - users can only access activities for their own data rooms
CREATE POLICY "Users can view collaborator activities for their own data rooms" ON public.send_collaborator_activities
    FOR SELECT USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policy for upload permissions - users can only manage upload permissions for their own data rooms
CREATE POLICY "Users can manage upload permissions for their own data rooms" ON public.send_collaborator_upload_permissions
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policy for pending uploads - users can only access pending uploads for their own data rooms
CREATE POLICY "Users can manage pending uploads for their own data rooms" ON public.send_pending_uploads
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update collaborator last activity
CREATE OR REPLACE FUNCTION update_collaborator_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.send_dataroom_collaborators 
    SET last_activity = NOW()
    WHERE id = NEW.collaborator_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last activity
DROP TRIGGER IF EXISTS trigger_update_collaborator_last_activity ON public.send_collaborator_activities;
CREATE TRIGGER trigger_update_collaborator_last_activity
    AFTER INSERT ON public.send_collaborator_activities
    FOR EACH ROW EXECUTE FUNCTION update_collaborator_last_activity();

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE public.send_dataroom_collaborators 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    DELETE FROM public.send_pending_uploads 
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.send_dataroom_collaborators IS 'External collaborators invited to data rooms';
COMMENT ON TABLE public.send_collaborator_activities IS 'Activity log for collaborator actions';
COMMENT ON TABLE public.send_collaborator_upload_permissions IS 'Upload permissions and restrictions for collaborators';
COMMENT ON TABLE public.send_pending_uploads IS 'Files uploaded by collaborators pending approval';

COMMENT ON COLUMN public.send_dataroom_collaborators.permissions IS 'JSON object defining what actions the collaborator can perform';
COMMENT ON COLUMN public.send_dataroom_collaborators.invitation_token IS 'Unique token for accepting invitations';
COMMENT ON COLUMN public.send_dataroom_collaborators.status IS 'Invitation status: pending, accepted, declined, expired';

COMMENT ON COLUMN public.send_collaborator_upload_permissions.allowed_file_types IS 'Array of allowed file extensions';
COMMENT ON COLUMN public.send_collaborator_upload_permissions.allowed_folders IS 'Array of folder paths where uploads are permitted';
COMMENT ON COLUMN public.send_collaborator_upload_permissions.requires_approval IS 'Whether uploads need admin approval';

COMMENT ON COLUMN public.send_pending_uploads.file_path IS 'Temporary storage path until approval';
COMMENT ON COLUMN public.send_pending_uploads.expires_at IS 'When the pending upload expires and gets deleted';

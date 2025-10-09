-- Add granular permissions system for data rooms
-- This migration adds support for user groups, group members, and group-specific share links

-- First create the viewer groups table
CREATE TABLE IF NOT EXISTS public.send_dataroom_viewer_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(data_room_id, name)
);

-- Create table for data room share links (group-specific and general)
CREATE TABLE IF NOT EXISTS public.send_dataroom_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    viewer_group_id UUID REFERENCES public.send_dataroom_viewer_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    view_limit INTEGER,
    total_views INTEGER DEFAULT 0,
    download_enabled BOOLEAN DEFAULT true,
    watermark_enabled BOOLEAN DEFAULT false,
    screenshot_protection BOOLEAN DEFAULT false,
    welcome_message TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for data room viewer group members
CREATE TABLE IF NOT EXISTS public.send_dataroom_viewer_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewer_group_id UUID REFERENCES public.send_dataroom_viewer_groups(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'collaborator', 'admin')),
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(viewer_group_id, email)
);

-- Add member_count column to viewer groups (computed)
ALTER TABLE public.send_dataroom_viewer_groups 
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0;

-- Create function to update member count
CREATE OR REPLACE FUNCTION update_viewer_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.send_dataroom_viewer_groups 
        SET member_count = (
            SELECT COUNT(*) 
            FROM public.send_dataroom_viewer_group_members 
            WHERE viewer_group_id = NEW.viewer_group_id
        )
        WHERE id = NEW.viewer_group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.send_dataroom_viewer_groups 
        SET member_count = (
            SELECT COUNT(*) 
            FROM public.send_dataroom_viewer_group_members 
            WHERE viewer_group_id = OLD.viewer_group_id
        )
        WHERE id = OLD.viewer_group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update member count
DROP TRIGGER IF EXISTS trigger_update_viewer_group_member_count ON public.send_dataroom_viewer_group_members;
CREATE TRIGGER trigger_update_viewer_group_member_count
    AFTER INSERT OR DELETE ON public.send_dataroom_viewer_group_members
    FOR EACH ROW EXECUTE FUNCTION update_viewer_group_member_count();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_dataroom_links_data_room_id ON public.send_dataroom_links(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_links_viewer_group_id ON public.send_dataroom_links(viewer_group_id);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_links_slug ON public.send_dataroom_links(slug);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_links_created_by ON public.send_dataroom_links(created_by);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_links_is_active ON public.send_dataroom_links(is_active);

CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_group_members_viewer_group_id ON public.send_dataroom_viewer_group_members(viewer_group_id);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_group_members_email ON public.send_dataroom_viewer_group_members(email);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_viewer_group_members_role ON public.send_dataroom_viewer_group_members(role);

-- Update existing viewer groups to have correct member counts
UPDATE public.send_dataroom_viewer_groups 
SET member_count = (
    SELECT COUNT(*) 
    FROM public.send_dataroom_viewer_group_members 
    WHERE viewer_group_id = send_dataroom_viewer_groups.id
);

-- Add RLS policies for the new tables
ALTER TABLE public.send_dataroom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_dataroom_viewer_group_members ENABLE ROW LEVEL SECURITY;

-- RLS policy for dataroom links - users can only access links for their own data rooms
CREATE POLICY "Users can manage dataroom links for their own data rooms" ON public.send_dataroom_links
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policy for viewer group members - users can only manage members for their own data room groups
CREATE POLICY "Users can manage viewer group members for their own data rooms" ON public.send_dataroom_viewer_group_members
    FOR ALL USING (
        viewer_group_id IN (
            SELECT vg.id 
            FROM public.send_dataroom_viewer_groups vg
            JOIN public.send_data_rooms dr ON vg.data_room_id = dr.id
            WHERE dr.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE public.send_dataroom_links IS 'Share links for data rooms, can be group-specific or general';
COMMENT ON TABLE public.send_dataroom_viewer_group_members IS 'Members of data room viewer groups';

COMMENT ON COLUMN public.send_dataroom_links.viewer_group_id IS 'If set, this link is specific to a user group';
COMMENT ON COLUMN public.send_dataroom_links.slug IS 'Unique URL slug for the share link';
COMMENT ON COLUMN public.send_dataroom_links.total_views IS 'Total number of times this link has been accessed';

COMMENT ON COLUMN public.send_dataroom_viewer_group_members.role IS 'Role of the member: viewer, collaborator, or admin';
COMMENT ON COLUMN public.send_dataroom_viewer_group_members.email IS 'Email address of the group member';

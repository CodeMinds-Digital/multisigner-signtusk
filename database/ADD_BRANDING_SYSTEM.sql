-- Add enhanced data room branding system
-- This migration adds comprehensive branding capabilities for data rooms

-- Create table for data room branding settings
CREATE TABLE IF NOT EXISTS public.send_dataroom_branding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Logo and Images
    logo_url TEXT,
    banner_url TEXT,
    favicon_url TEXT,
    
    -- Color Scheme
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',
    background_color TEXT DEFAULT '#FFFFFF',
    text_color TEXT DEFAULT '#1F2937',
    
    -- Custom Styling
    custom_css TEXT,
    
    -- Social Media Cards
    social_title TEXT,
    social_description TEXT,
    social_image_url TEXT,
    
    -- Domain and Settings
    custom_domain TEXT,
    show_branding BOOLEAN DEFAULT true,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for branding templates (professional templates)
CREATE TABLE IF NOT EXISTS public.send_branding_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'business' CHECK (category IN ('business', 'tech', 'finance', 'legal', 'creative', 'minimal')),
    
    -- Template Assets
    preview_image_url TEXT,
    logo_placeholder_url TEXT,
    banner_placeholder_url TEXT,
    
    -- Template Colors
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    background_color TEXT NOT NULL,
    text_color TEXT NOT NULL,
    
    -- Template CSS
    template_css TEXT,
    
    -- Template Settings
    is_premium BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for tracking branding asset usage
CREATE TABLE IF NOT EXISTS public.send_branding_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data_room_id UUID REFERENCES public.send_data_rooms(id) ON DELETE CASCADE NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('logo', 'banner', 'favicon', 'social_image')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default branding templates
INSERT INTO public.send_branding_templates (name, description, category, primary_color, secondary_color, background_color, text_color, template_css, sort_order) VALUES
('Modern Blue', 'Clean and professional blue theme', 'business', '#3B82F6', '#1E40AF', '#FFFFFF', '#1F2937', '.data-room-header { border-bottom: 2px solid #3B82F6; }', 1),
('Corporate Gray', 'Sophisticated gray and blue combination', 'business', '#6B7280', '#374151', '#F9FAFB', '#111827', '.data-room-container { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }', 2),
('Tech Green', 'Modern green theme for tech companies', 'tech', '#10B981', '#059669', '#FFFFFF', '#1F2937', '.data-room-button { border-radius: 8px; }', 3),
('Finance Gold', 'Premium gold theme for financial services', 'finance', '#F59E0B', '#D97706', '#FFFBEB', '#92400E', '.data-room-header { background: linear-gradient(135deg, #F59E0B, #D97706); }', 4),
('Legal Navy', 'Professional navy theme for legal firms', 'legal', '#1E3A8A', '#1E40AF', '#F8FAFC', '#1E293B', '.data-room-container { border: 1px solid #E2E8F0; }', 5),
('Creative Purple', 'Vibrant purple theme for creative agencies', 'creative', '#8B5CF6', '#7C3AED', '#FFFFFF', '#1F2937', '.data-room-header { background: linear-gradient(135deg, #8B5CF6, #7C3AED); }', 6),
('Minimal Black', 'Clean minimal black and white theme', 'minimal', '#000000', '#374151', '#FFFFFF', '#1F2937', '.data-room-container { border: none; box-shadow: none; }', 7);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_dataroom_branding_data_room_id ON public.send_dataroom_branding(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_branding_created_by ON public.send_dataroom_branding(created_by);
CREATE INDEX IF NOT EXISTS idx_send_dataroom_branding_show_branding ON public.send_dataroom_branding(show_branding);

CREATE INDEX IF NOT EXISTS idx_send_branding_templates_category ON public.send_branding_templates(category);
CREATE INDEX IF NOT EXISTS idx_send_branding_templates_is_active ON public.send_branding_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_send_branding_templates_sort_order ON public.send_branding_templates(sort_order);

CREATE INDEX IF NOT EXISTS idx_send_branding_assets_data_room_id ON public.send_branding_assets(data_room_id);
CREATE INDEX IF NOT EXISTS idx_send_branding_assets_asset_type ON public.send_branding_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_send_branding_assets_is_active ON public.send_branding_assets(is_active);

-- Add RLS policies for the new tables
ALTER TABLE public.send_dataroom_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_branding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_branding_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy for dataroom branding - users can only access branding for their own data rooms
CREATE POLICY "Users can manage branding for their own data rooms" ON public.send_dataroom_branding
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- RLS policy for branding templates - all users can read templates
CREATE POLICY "Users can read branding templates" ON public.send_branding_templates
    FOR SELECT USING (is_active = true);

-- RLS policy for branding assets - users can only access assets for their own data rooms
CREATE POLICY "Users can manage branding assets for their own data rooms" ON public.send_branding_assets
    FOR ALL USING (
        data_room_id IN (
            SELECT id FROM public.send_data_rooms 
            WHERE user_id = auth.uid()
        )
    );

-- Create function to update branding updated_at timestamp
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_branding_updated_at ON public.send_dataroom_branding;
CREATE TRIGGER trigger_update_branding_updated_at
    BEFORE UPDATE ON public.send_dataroom_branding
    FOR EACH ROW EXECUTE FUNCTION update_branding_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.send_dataroom_branding IS 'Branding settings for data rooms including logos, colors, and custom styling';
COMMENT ON TABLE public.send_branding_templates IS 'Pre-built branding templates for quick data room customization';
COMMENT ON TABLE public.send_branding_assets IS 'Tracking table for uploaded branding assets';

COMMENT ON COLUMN public.send_dataroom_branding.custom_css IS 'Custom CSS for advanced styling customization';
COMMENT ON COLUMN public.send_dataroom_branding.social_title IS 'Title for social media cards when data room is shared';
COMMENT ON COLUMN public.send_dataroom_branding.social_description IS 'Description for social media cards';
COMMENT ON COLUMN public.send_dataroom_branding.custom_domain IS 'Custom domain for white-label data room hosting';

COMMENT ON COLUMN public.send_branding_templates.category IS 'Template category: business, tech, finance, legal, creative, minimal';
COMMENT ON COLUMN public.send_branding_templates.is_premium IS 'Whether this template requires a premium subscription';
COMMENT ON COLUMN public.send_branding_templates.template_css IS 'CSS styles specific to this template';

COMMENT ON COLUMN public.send_branding_assets.asset_type IS 'Type of asset: logo, banner, favicon, social_image';
COMMENT ON COLUMN public.send_branding_assets.file_url IS 'Public URL of the uploaded asset';

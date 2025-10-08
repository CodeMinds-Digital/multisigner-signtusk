-- Add Custom Fields System
-- Migration: 20250107_add_custom_fields_system.sql
-- Description: Adds flexible custom field system for data collection from document viewers

-- Create custom field definitions table
CREATE TABLE IF NOT EXISTS public.send_custom_fields (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'number', 'select', 'multiselect', 'textarea', 'checkbox', 'date', 'url')),
    description TEXT,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Field configuration (JSON)
    field_config JSONB DEFAULT '{}'::jsonb, -- For select options, validation rules, etc.
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    group_name TEXT, -- For grouping fields together
    
    -- Validation settings
    validation_rules JSONB DEFAULT '{}'::jsonb, -- Min/max length, regex patterns, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique field names per user
    UNIQUE(user_id, name)
);

-- Create custom field responses table
CREATE TABLE IF NOT EXISTS public.send_custom_field_responses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    field_id TEXT NOT NULL REFERENCES public.send_custom_fields(id) ON DELETE CASCADE,
    link_id TEXT NOT NULL REFERENCES public.send_document_links(id) ON DELETE CASCADE,
    view_id TEXT REFERENCES public.send_document_views(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    viewer_email TEXT,
    
    -- Response data
    field_value TEXT, -- Single value for most field types
    field_values TEXT[], -- Array for multiselect fields
    
    -- Metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one response per field per session
    UNIQUE(field_id, session_id)
);

-- Create link custom field assignments table
CREATE TABLE IF NOT EXISTS public.send_link_custom_fields (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    link_id TEXT NOT NULL REFERENCES public.send_document_links(id) ON DELETE CASCADE,
    field_id TEXT NOT NULL REFERENCES public.send_custom_fields(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique field assignment per link
    UNIQUE(link_id, field_id)
);

-- Create custom field templates table for reusability
CREATE TABLE IF NOT EXISTS public.send_custom_field_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of field definitions
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique template names per user
    UNIQUE(user_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_custom_fields_user 
ON public.send_custom_fields(user_id);

CREATE INDEX IF NOT EXISTS idx_send_custom_fields_active 
ON public.send_custom_fields(user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_send_custom_field_responses_field 
ON public.send_custom_field_responses(field_id);

CREATE INDEX IF NOT EXISTS idx_send_custom_field_responses_link 
ON public.send_custom_field_responses(link_id);

CREATE INDEX IF NOT EXISTS idx_send_custom_field_responses_session 
ON public.send_custom_field_responses(session_id);

CREATE INDEX IF NOT EXISTS idx_send_custom_field_responses_viewer 
ON public.send_custom_field_responses(viewer_email);

CREATE INDEX IF NOT EXISTS idx_send_link_custom_fields_link 
ON public.send_link_custom_fields(link_id);

CREATE INDEX IF NOT EXISTS idx_send_link_custom_fields_field 
ON public.send_link_custom_fields(field_id);

CREATE INDEX IF NOT EXISTS idx_send_custom_field_templates_user 
ON public.send_custom_field_templates(user_id);

-- Create function to validate field responses
CREATE OR REPLACE FUNCTION public.validate_custom_field_response(
    field_id_param TEXT,
    field_value_param TEXT,
    field_values_param TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    field_record RECORD;
    validation_rules JSONB;
    field_config JSONB;
BEGIN
    -- Get field definition
    SELECT field_type, validation_rules, field_config, is_required
    INTO field_record
    FROM public.send_custom_fields
    WHERE id = field_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    validation_rules := field_record.validation_rules;
    field_config := field_record.field_config;
    
    -- Check if required field has value
    IF field_record.is_required AND (field_value_param IS NULL OR field_value_param = '') THEN
        RETURN false;
    END IF;
    
    -- Skip validation if field is empty and not required
    IF field_value_param IS NULL OR field_value_param = '' THEN
        RETURN true;
    END IF;
    
    -- Validate based on field type
    CASE field_record.field_type
        WHEN 'email' THEN
            IF field_value_param !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
                RETURN false;
            END IF;
            
        WHEN 'phone' THEN
            IF field_value_param !~ '^\+?[1-9]\d{1,14}$' THEN
                RETURN false;
            END IF;
            
        WHEN 'number' THEN
            IF field_value_param !~ '^-?\d+(\.\d+)?$' THEN
                RETURN false;
            END IF;
            
        WHEN 'url' THEN
            IF field_value_param !~ '^https?://[^\s/$.?#].[^\s]*$' THEN
                RETURN false;
            END IF;
            
        WHEN 'date' THEN
            BEGIN
                PERFORM field_value_param::date;
            EXCEPTION WHEN OTHERS THEN
                RETURN false;
            END;
            
        WHEN 'select' THEN
            IF NOT (field_config ? 'options' AND 
                    field_value_param = ANY(ARRAY(SELECT jsonb_array_elements_text(field_config->'options')))) THEN
                RETURN false;
            END IF;
            
        WHEN 'multiselect' THEN
            IF field_values_param IS NULL THEN
                RETURN false;
            END IF;
            -- Check if all values are in allowed options
            IF NOT (field_config ? 'options' AND 
                    field_values_param <@ ARRAY(SELECT jsonb_array_elements_text(field_config->'options'))) THEN
                RETURN false;
            END IF;
    END CASE;
    
    -- Additional validation rules
    IF validation_rules ? 'min_length' THEN
        IF length(field_value_param) < (validation_rules->>'min_length')::integer THEN
            RETURN false;
        END IF;
    END IF;
    
    IF validation_rules ? 'max_length' THEN
        IF length(field_value_param) > (validation_rules->>'max_length')::integer THEN
            RETURN false;
        END IF;
    END IF;
    
    IF validation_rules ? 'pattern' THEN
        IF field_value_param !~ (validation_rules->>'pattern') THEN
            RETURN false;
        END IF;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to get custom fields for a link
CREATE OR REPLACE FUNCTION public.get_link_custom_fields(link_id_param TEXT)
RETURNS TABLE (
    field_id TEXT,
    name TEXT,
    label TEXT,
    field_type TEXT,
    description TEXT,
    placeholder TEXT,
    is_required BOOLEAN,
    field_config JSONB,
    validation_rules JSONB,
    display_order INTEGER,
    group_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        cf.name,
        cf.label,
        cf.field_type,
        cf.description,
        cf.placeholder,
        COALESCE(lcf.is_required, cf.is_required) as is_required,
        cf.field_config,
        cf.validation_rules,
        COALESCE(lcf.display_order, cf.display_order) as display_order,
        cf.group_name
    FROM public.send_custom_fields cf
    INNER JOIN public.send_link_custom_fields lcf ON cf.id = lcf.field_id
    WHERE lcf.link_id = link_id_param
      AND cf.is_active = true
    ORDER BY COALESCE(lcf.display_order, cf.display_order), cf.created_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to get field responses for a session
CREATE OR REPLACE FUNCTION public.get_session_field_responses(
    link_id_param TEXT,
    session_id_param TEXT
)
RETURNS TABLE (
    field_id TEXT,
    field_name TEXT,
    field_label TEXT,
    field_type TEXT,
    field_value TEXT,
    field_values TEXT[],
    submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cfr.field_id,
        cf.name,
        cf.label,
        cf.field_type,
        cfr.field_value,
        cfr.field_values,
        cfr.submitted_at
    FROM public.send_custom_field_responses cfr
    INNER JOIN public.send_custom_fields cf ON cfr.field_id = cf.id
    WHERE cfr.link_id = link_id_param
      AND cfr.session_id = session_id_param
    ORDER BY cf.display_order, cf.created_at;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for custom fields tables
ALTER TABLE public.send_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_custom_field_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_link_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_custom_field_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom fields
CREATE POLICY "Users can manage their custom fields" ON public.send_custom_fields
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for field responses
CREATE POLICY "Users can view responses for their links" ON public.send_custom_field_responses
    FOR SELECT USING (
        link_id IN (
            SELECT dl.id FROM public.send_document_links dl
            INNER JOIN public.send_shared_documents sd ON dl.document_id = sd.id
            WHERE sd.user_id = auth.uid()::text
        )
    );

CREATE POLICY "System can insert field responses" ON public.send_custom_field_responses
    FOR INSERT WITH CHECK (true);

-- RLS Policies for link field assignments
CREATE POLICY "Users can manage field assignments for their links" ON public.send_link_custom_fields
    FOR ALL USING (
        link_id IN (
            SELECT dl.id FROM public.send_document_links dl
            INNER JOIN public.send_shared_documents sd ON dl.document_id = sd.id
            WHERE sd.user_id = auth.uid()::text
        )
    );

-- RLS Policies for field templates
CREATE POLICY "Users can manage their field templates" ON public.send_custom_field_templates
    FOR ALL USING (user_id = auth.uid()::text OR is_public = true);

-- Add comments for documentation
COMMENT ON TABLE public.send_custom_fields IS 'Custom field definitions for data collection from viewers';
COMMENT ON TABLE public.send_custom_field_responses IS 'Responses submitted by viewers for custom fields';
COMMENT ON TABLE public.send_link_custom_fields IS 'Assignment of custom fields to specific document links';
COMMENT ON TABLE public.send_custom_field_templates IS 'Reusable templates for common field combinations';
COMMENT ON FUNCTION public.validate_custom_field_response(TEXT, TEXT, TEXT[]) IS 'Validates field responses against field type and validation rules';
COMMENT ON FUNCTION public.get_link_custom_fields(TEXT) IS 'Returns all custom fields assigned to a specific link';
COMMENT ON FUNCTION public.get_session_field_responses(TEXT, TEXT) IS 'Returns all field responses for a viewer session';

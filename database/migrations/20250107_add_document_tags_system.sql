-- Add Document Tags System
-- Migration: 20250107_add_document_tags_system.sql
-- Description: Create document tagging system for better organization and filtering capabilities

-- Create tags table
CREATE TABLE IF NOT EXISTS public.send_tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6', -- Hex color for tag
    icon TEXT, -- Icon name or emoji
    
    -- Tag metadata
    is_system BOOLEAN DEFAULT false, -- System tags vs user-created tags
    usage_count INTEGER DEFAULT 0, -- Number of documents using this tag
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tag names per user
    UNIQUE(user_id, name)
);

-- Create document tags relationship table
CREATE TABLE IF NOT EXISTS public.send_document_tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_id TEXT NOT NULL REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES public.send_tags(id) ON DELETE CASCADE,
    
    -- Tag assignment metadata
    assigned_by TEXT NOT NULL, -- User who assigned the tag
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique tag assignment per document
    UNIQUE(document_id, tag_id)
);

-- Create tag groups table for organizing tags
CREATE TABLE IF NOT EXISTS public.send_tag_groups (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique group names per user
    UNIQUE(user_id, name)
);

-- Add group_id to tags table
ALTER TABLE public.send_tags 
ADD COLUMN IF NOT EXISTS group_id TEXT REFERENCES public.send_tag_groups(id) ON DELETE SET NULL;

-- Create tag templates table for quick tagging
CREATE TABLE IF NOT EXISTS public.send_tag_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    tag_ids TEXT[] NOT NULL, -- Array of tag IDs
    
    -- Template metadata
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique template names per user
    UNIQUE(user_id, name)
);

-- Create tag analytics table for tracking tag performance
CREATE TABLE IF NOT EXISTS public.send_tag_analytics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tag_id TEXT NOT NULL REFERENCES public.send_tags(id) ON DELETE CASCADE,
    
    -- Analytics data
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    documents_tagged INTEGER DEFAULT 0,
    documents_untagged INTEGER DEFAULT 0,
    search_count INTEGER DEFAULT 0, -- How many times this tag was used in search
    filter_count INTEGER DEFAULT 0, -- How many times this tag was used as filter
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique analytics per tag per date
    UNIQUE(tag_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_tags_user 
ON public.send_tags(user_id);

CREATE INDEX IF NOT EXISTS idx_send_tags_name 
ON public.send_tags(user_id, name);

CREATE INDEX IF NOT EXISTS idx_send_tags_group 
ON public.send_tags(group_id);

CREATE INDEX IF NOT EXISTS idx_send_tags_usage 
ON public.send_tags(user_id, usage_count DESC);

CREATE INDEX IF NOT EXISTS idx_send_document_tags_document 
ON public.send_document_tags(document_id);

CREATE INDEX IF NOT EXISTS idx_send_document_tags_tag 
ON public.send_document_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_send_document_tags_assigned_by 
ON public.send_document_tags(assigned_by);

CREATE INDEX IF NOT EXISTS idx_send_tag_groups_user 
ON public.send_tag_groups(user_id);

CREATE INDEX IF NOT EXISTS idx_send_tag_templates_user 
ON public.send_tag_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_send_tag_analytics_tag 
ON public.send_tag_analytics(tag_id);

CREATE INDEX IF NOT EXISTS idx_send_tag_analytics_date 
ON public.send_tag_analytics(date DESC);

-- Create function to get documents by tags
CREATE OR REPLACE FUNCTION public.get_documents_by_tags(
    user_id_param TEXT,
    tag_ids_param TEXT[],
    match_all_tags BOOLEAN DEFAULT false
)
RETURNS TABLE (
    document_id TEXT,
    title TEXT,
    file_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE,
    tag_count BIGINT,
    matching_tags TEXT[]
) AS $$
BEGIN
    IF match_all_tags THEN
        -- Return documents that have ALL specified tags
        RETURN QUERY
        SELECT 
            sd.id,
            sd.title,
            sd.file_type,
            sd.file_size,
            sd.created_at,
            COUNT(dt.tag_id) as tag_count,
            ARRAY_AGG(st.name) as matching_tags
        FROM public.send_shared_documents sd
        INNER JOIN public.send_document_tags dt ON sd.id = dt.document_id
        INNER JOIN public.send_tags st ON dt.tag_id = st.id
        WHERE sd.user_id = user_id_param
          AND dt.tag_id = ANY(tag_ids_param)
        GROUP BY sd.id, sd.title, sd.file_type, sd.file_size, sd.created_at
        HAVING COUNT(DISTINCT dt.tag_id) = array_length(tag_ids_param, 1)
        ORDER BY sd.created_at DESC;
    ELSE
        -- Return documents that have ANY of the specified tags
        RETURN QUERY
        SELECT 
            sd.id,
            sd.title,
            sd.file_type,
            sd.file_size,
            sd.created_at,
            COUNT(dt.tag_id) as tag_count,
            ARRAY_AGG(st.name) as matching_tags
        FROM public.send_shared_documents sd
        INNER JOIN public.send_document_tags dt ON sd.id = dt.document_id
        INNER JOIN public.send_tags st ON dt.tag_id = st.id
        WHERE sd.user_id = user_id_param
          AND dt.tag_id = ANY(tag_ids_param)
        GROUP BY sd.id, sd.title, sd.file_type, sd.file_size, sd.created_at
        ORDER BY COUNT(dt.tag_id) DESC, sd.created_at DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create function to get tag statistics
CREATE OR REPLACE FUNCTION public.get_tag_statistics(user_id_param TEXT)
RETURNS TABLE (
    total_tags BIGINT,
    total_groups BIGINT,
    total_templates BIGINT,
    most_used_tag_name TEXT,
    most_used_tag_count INTEGER,
    avg_tags_per_document NUMERIC,
    documents_with_tags BIGINT,
    documents_without_tags BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.send_tags WHERE user_id = user_id_param) as total_tags,
        (SELECT COUNT(*) FROM public.send_tag_groups WHERE user_id = user_id_param AND is_active = true) as total_groups,
        (SELECT COUNT(*) FROM public.send_tag_templates WHERE user_id = user_id_param AND is_active = true) as total_templates,
        (SELECT name FROM public.send_tags WHERE user_id = user_id_param ORDER BY usage_count DESC LIMIT 1) as most_used_tag_name,
        (SELECT usage_count FROM public.send_tags WHERE user_id = user_id_param ORDER BY usage_count DESC LIMIT 1) as most_used_tag_count,
        (
            SELECT ROUND(AVG(tag_count), 2)
            FROM (
                SELECT COUNT(dt.tag_id) as tag_count
                FROM public.send_shared_documents sd
                LEFT JOIN public.send_document_tags dt ON sd.id = dt.document_id
                WHERE sd.user_id = user_id_param
                GROUP BY sd.id
            ) tag_counts
            WHERE tag_count > 0
        ) as avg_tags_per_document,
        (
            SELECT COUNT(DISTINCT sd.id)
            FROM public.send_shared_documents sd
            INNER JOIN public.send_document_tags dt ON sd.id = dt.document_id
            WHERE sd.user_id = user_id_param
        ) as documents_with_tags,
        (
            SELECT COUNT(sd.id)
            FROM public.send_shared_documents sd
            LEFT JOIN public.send_document_tags dt ON sd.id = dt.document_id
            WHERE sd.user_id = user_id_param
              AND dt.document_id IS NULL
        ) as documents_without_tags;
END;
$$ LANGUAGE plpgsql;

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment usage count
        UPDATE public.send_tags
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.tag_id;
        
        -- Update analytics
        INSERT INTO public.send_tag_analytics (tag_id, date, documents_tagged)
        VALUES (NEW.tag_id, CURRENT_DATE, 1)
        ON CONFLICT (tag_id, date)
        DO UPDATE SET documents_tagged = send_tag_analytics.documents_tagged + 1;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement usage count
        UPDATE public.send_tags
        SET usage_count = GREATEST(usage_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.tag_id;
        
        -- Update analytics
        INSERT INTO public.send_tag_analytics (tag_id, date, documents_untagged)
        VALUES (OLD.tag_id, CURRENT_DATE, 1)
        ON CONFLICT (tag_id, date)
        DO UPDATE SET documents_untagged = send_tag_analytics.documents_untagged + 1;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update tag usage counts
CREATE TRIGGER trigger_update_tag_usage_counts
    AFTER INSERT OR DELETE ON public.send_document_tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_tag_usage_counts();

-- Create function to suggest tags based on document content
CREATE OR REPLACE FUNCTION public.suggest_tags_for_document(
    user_id_param TEXT,
    document_title_param TEXT,
    limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
    tag_id TEXT,
    tag_name TEXT,
    tag_color TEXT,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        st.id,
        st.name,
        st.color,
        (
            CASE 
                WHEN st.name ILIKE '%' || document_title_param || '%' THEN 1.0
                WHEN document_title_param ILIKE '%' || st.name || '%' THEN 0.8
                ELSE 0.5
            END * (st.usage_count + 1)::REAL / 
            (SELECT MAX(usage_count) + 1 FROM public.send_tags WHERE user_id = user_id_param)::REAL
        ) as relevance_score
    FROM public.send_tags st
    WHERE st.user_id = user_id_param
      AND (
          st.name ILIKE '%' || document_title_param || '%' OR
          document_title_param ILIKE '%' || st.name || '%' OR
          st.usage_count > 0
      )
    ORDER BY relevance_score DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get popular tag combinations
CREATE OR REPLACE FUNCTION public.get_popular_tag_combinations(
    user_id_param TEXT,
    limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
    tag_combination TEXT[],
    document_count BIGINT,
    combination_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ARRAY_AGG(st.name ORDER BY st.name) as tag_combination,
        COUNT(DISTINCT dt1.document_id) as document_count,
        COUNT(DISTINCT dt1.document_id)::REAL / 
        (SELECT COUNT(*) FROM public.send_shared_documents WHERE user_id = user_id_param)::REAL as combination_score
    FROM public.send_document_tags dt1
    INNER JOIN public.send_document_tags dt2 ON dt1.document_id = dt2.document_id AND dt1.tag_id < dt2.tag_id
    INNER JOIN public.send_tags st ON dt1.tag_id = st.id OR dt2.tag_id = st.id
    INNER JOIN public.send_shared_documents sd ON dt1.document_id = sd.id
    WHERE sd.user_id = user_id_param
    GROUP BY dt1.document_id
    HAVING COUNT(DISTINCT CASE WHEN st.id = dt1.tag_id OR st.id = dt2.tag_id THEN st.id END) >= 2
    ORDER BY document_count DESC, combination_score DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for tag tables
ALTER TABLE public.send_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_tag_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_tag_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_tag_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can manage their tags" ON public.send_tags
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for document tags
CREATE POLICY "Users can manage tags for their documents" ON public.send_document_tags
    FOR ALL USING (
        document_id IN (
            SELECT id FROM public.send_shared_documents 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for tag groups
CREATE POLICY "Users can manage their tag groups" ON public.send_tag_groups
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for tag templates
CREATE POLICY "Users can manage their tag templates" ON public.send_tag_templates
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for tag analytics
CREATE POLICY "Users can view analytics for their tags" ON public.send_tag_analytics
    FOR SELECT USING (
        tag_id IN (
            SELECT id FROM public.send_tags 
            WHERE user_id = auth.uid()::text
        )
    );

-- Insert some default system tags
INSERT INTO public.send_tags (user_id, name, description, color, icon, is_system) VALUES
('system', 'Important', 'High priority documents', '#EF4444', '⚠️', true),
('system', 'Draft', 'Work in progress documents', '#F59E0B', '📝', true),
('system', 'Final', 'Completed documents', '#10B981', '✅', true),
('system', 'Confidential', 'Sensitive documents', '#8B5CF6', '🔒', true),
('system', 'Public', 'Publicly shareable documents', '#3B82F6', '🌐', true),
('system', 'Archive', 'Archived documents', '#6B7280', '📦', true)
ON CONFLICT (user_id, name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE public.send_tags IS 'Tags for categorizing and organizing documents';
COMMENT ON TABLE public.send_document_tags IS 'Many-to-many relationship between documents and tags';
COMMENT ON TABLE public.send_tag_groups IS 'Groups for organizing related tags';
COMMENT ON TABLE public.send_tag_templates IS 'Predefined tag combinations for quick tagging';
COMMENT ON TABLE public.send_tag_analytics IS 'Analytics data for tag usage and performance';
COMMENT ON FUNCTION public.get_documents_by_tags(TEXT, TEXT[], BOOLEAN) IS 'Returns documents filtered by specified tags';
COMMENT ON FUNCTION public.get_tag_statistics(TEXT) IS 'Returns comprehensive tag usage statistics';
COMMENT ON FUNCTION public.suggest_tags_for_document(TEXT, TEXT, INTEGER) IS 'Suggests relevant tags for a document based on title and usage patterns';
COMMENT ON FUNCTION public.get_popular_tag_combinations(TEXT, INTEGER) IS 'Returns most commonly used tag combinations';

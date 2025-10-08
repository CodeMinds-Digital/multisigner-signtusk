-- Add FAQ Management System
-- Migration: 20250107_add_faq_system.sql
-- Description: Adds FAQ system for datarooms with category organization and search functionality

-- Create FAQ categories table
CREATE TABLE IF NOT EXISTS public.send_faq_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name or emoji
    color TEXT DEFAULT '#3B82F6', -- Hex color for category
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique category names per user
    UNIQUE(user_id, name)
);

-- Create FAQ items table
CREATE TABLE IF NOT EXISTS public.send_faq_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    category_id TEXT REFERENCES public.send_faq_categories(id) ON DELETE SET NULL,
    
    -- FAQ content
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    answer_format TEXT DEFAULT 'text' CHECK (answer_format IN ('text', 'markdown', 'html')),
    
    -- SEO and search
    keywords TEXT[], -- Array of keywords for better search
    tags TEXT[], -- Array of tags for categorization
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false, -- Featured FAQs appear at top
    
    -- Usage statistics
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0, -- "Was this helpful?" positive votes
    not_helpful_count INTEGER DEFAULT 0, -- "Was this helpful?" negative votes
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    last_viewed_at TIMESTAMP WITH TIME ZONE
);

-- Create FAQ assignments table (link FAQs to specific documents/datarooms)
CREATE TABLE IF NOT EXISTS public.send_faq_assignments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    faq_item_id TEXT NOT NULL REFERENCES public.send_faq_items(id) ON DELETE CASCADE,
    
    -- Assignment targets
    document_id TEXT REFERENCES public.send_shared_documents(id) ON DELETE CASCADE,
    data_room_id TEXT REFERENCES public.send_data_rooms(id) ON DELETE CASCADE,
    link_id TEXT REFERENCES public.send_document_links(id) ON DELETE CASCADE,
    
    -- Assignment settings
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure at least one target is specified
    CHECK (
        (document_id IS NOT NULL AND data_room_id IS NULL AND link_id IS NULL) OR
        (document_id IS NULL AND data_room_id IS NOT NULL AND link_id IS NULL) OR
        (document_id IS NULL AND data_room_id IS NULL AND link_id IS NOT NULL)
    ),
    
    -- Ensure unique assignment per FAQ per target
    UNIQUE(faq_item_id, document_id),
    UNIQUE(faq_item_id, data_room_id),
    UNIQUE(faq_item_id, link_id)
);

-- Create FAQ feedback table
CREATE TABLE IF NOT EXISTS public.send_faq_feedback (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    faq_item_id TEXT NOT NULL REFERENCES public.send_faq_items(id) ON DELETE CASCADE,
    
    -- Feedback details
    is_helpful BOOLEAN NOT NULL, -- true = helpful, false = not helpful
    feedback_text TEXT, -- Optional additional feedback
    
    -- User identification
    viewer_email TEXT,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate feedback from same session
    UNIQUE(faq_item_id, session_id)
);

-- Create FAQ search history table for analytics
CREATE TABLE IF NOT EXISTS public.send_faq_search_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    
    -- Search details
    search_query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    clicked_faq_id TEXT REFERENCES public.send_faq_items(id) ON DELETE SET NULL,
    
    -- Context
    document_id TEXT REFERENCES public.send_shared_documents(id) ON DELETE SET NULL,
    data_room_id TEXT REFERENCES public.send_data_rooms(id) ON DELETE SET NULL,
    
    -- User identification
    viewer_email TEXT,
    session_id TEXT,
    ip_address INET,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_send_faq_categories_user 
ON public.send_faq_categories(user_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_categories_active 
ON public.send_faq_categories(user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_send_faq_items_user 
ON public.send_faq_items(user_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_items_category 
ON public.send_faq_items(category_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_items_published 
ON public.send_faq_items(user_id, is_published) 
WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_send_faq_items_featured 
ON public.send_faq_items(user_id, is_featured) 
WHERE is_featured = true;

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_send_faq_items_search 
ON public.send_faq_items USING gin(to_tsvector('english', question || ' ' || answer));

CREATE INDEX IF NOT EXISTS idx_send_faq_items_keywords 
ON public.send_faq_items USING gin(keywords);

CREATE INDEX IF NOT EXISTS idx_send_faq_items_tags 
ON public.send_faq_items USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_send_faq_assignments_faq 
ON public.send_faq_assignments(faq_item_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_assignments_document 
ON public.send_faq_assignments(document_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_assignments_dataroom 
ON public.send_faq_assignments(data_room_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_assignments_link 
ON public.send_faq_assignments(link_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_feedback_item 
ON public.send_faq_feedback(faq_item_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_search_history_user 
ON public.send_faq_search_history(user_id);

CREATE INDEX IF NOT EXISTS idx_send_faq_search_history_query 
ON public.send_faq_search_history(search_query);

-- Create function to search FAQs with full-text search
CREATE OR REPLACE FUNCTION public.search_faq_items(
    user_id_param TEXT,
    search_query_param TEXT,
    category_id_param TEXT DEFAULT NULL,
    document_id_param TEXT DEFAULT NULL,
    data_room_id_param TEXT DEFAULT NULL,
    limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
    faq_id TEXT,
    question TEXT,
    answer TEXT,
    answer_format TEXT,
    category_name TEXT,
    category_color TEXT,
    keywords TEXT[],
    tags TEXT[],
    is_featured BOOLEAN,
    view_count INTEGER,
    helpful_count INTEGER,
    not_helpful_count INTEGER,
    relevance_score REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.question,
        fi.answer,
        fi.answer_format,
        fc.name,
        fc.color,
        fi.keywords,
        fi.tags,
        fi.is_featured,
        fi.view_count,
        fi.helpful_count,
        fi.not_helpful_count,
        ts_rank(to_tsvector('english', fi.question || ' ' || fi.answer), plainto_tsquery('english', search_query_param)) as relevance_score
    FROM public.send_faq_items fi
    LEFT JOIN public.send_faq_categories fc ON fi.category_id = fc.id
    LEFT JOIN public.send_faq_assignments fa ON fi.id = fa.faq_item_id
    WHERE fi.user_id = user_id_param
      AND fi.is_published = true
      AND (category_id_param IS NULL OR fi.category_id = category_id_param)
      AND (document_id_param IS NULL OR fa.document_id = document_id_param OR fa.document_id IS NULL)
      AND (data_room_id_param IS NULL OR fa.data_room_id = data_room_id_param OR fa.data_room_id IS NULL)
      AND (
          to_tsvector('english', fi.question || ' ' || fi.answer) @@ plainto_tsquery('english', search_query_param)
          OR fi.keywords && ARRAY[search_query_param]
          OR fi.tags && ARRAY[search_query_param]
          OR fi.question ILIKE '%' || search_query_param || '%'
          OR fi.answer ILIKE '%' || search_query_param || '%'
      )
    ORDER BY 
        fi.is_featured DESC,
        ts_rank(to_tsvector('english', fi.question || ' ' || fi.answer), plainto_tsquery('english', search_query_param)) DESC,
        fi.helpful_count DESC,
        fi.view_count DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get FAQ statistics
CREATE OR REPLACE FUNCTION public.get_faq_statistics(user_id_param TEXT)
RETURNS TABLE (
    total_faqs BIGINT,
    published_faqs BIGINT,
    featured_faqs BIGINT,
    total_views BIGINT,
    total_helpful_votes BIGINT,
    total_categories BIGINT,
    avg_helpfulness_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_faqs,
        COUNT(*) FILTER (WHERE is_published = true) as published_faqs,
        COUNT(*) FILTER (WHERE is_featured = true) as featured_faqs,
        COALESCE(SUM(view_count), 0) as total_views,
        COALESCE(SUM(helpful_count), 0) as total_helpful_votes,
        (SELECT COUNT(*) FROM public.send_faq_categories WHERE user_id = user_id_param AND is_active = true) as total_categories,
        CASE 
            WHEN SUM(helpful_count + not_helpful_count) > 0 
            THEN ROUND(SUM(helpful_count)::NUMERIC / SUM(helpful_count + not_helpful_count) * 100, 2)
            ELSE 0
        END as avg_helpfulness_ratio
    FROM public.send_faq_items
    WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to update FAQ view count
CREATE OR REPLACE FUNCTION public.increment_faq_view_count(faq_id_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.send_faq_items
    SET 
        view_count = view_count + 1,
        last_viewed_at = NOW()
    WHERE id = faq_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get popular FAQs
CREATE OR REPLACE FUNCTION public.get_popular_faqs(
    user_id_param TEXT,
    limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
    faq_id TEXT,
    question TEXT,
    answer TEXT,
    category_name TEXT,
    view_count INTEGER,
    helpful_count INTEGER,
    helpfulness_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.question,
        fi.answer,
        fc.name,
        fi.view_count,
        fi.helpful_count,
        CASE 
            WHEN (fi.helpful_count + fi.not_helpful_count) > 0 
            THEN ROUND(fi.helpful_count::NUMERIC / (fi.helpful_count + fi.not_helpful_count) * 100, 2)
            ELSE 0
        END as helpfulness_ratio
    FROM public.send_faq_items fi
    LEFT JOIN public.send_faq_categories fc ON fi.category_id = fc.id
    WHERE fi.user_id = user_id_param
      AND fi.is_published = true
    ORDER BY 
        fi.view_count DESC,
        fi.helpful_count DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS for FAQ tables
ALTER TABLE public.send_faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_faq_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_faq_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.send_faq_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for FAQ categories
CREATE POLICY "Users can manage their FAQ categories" ON public.send_faq_categories
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for FAQ items
CREATE POLICY "Users can manage their FAQ items" ON public.send_faq_items
    FOR ALL USING (user_id = auth.uid()::text);

-- RLS Policies for FAQ assignments
CREATE POLICY "Users can manage FAQ assignments for their content" ON public.send_faq_assignments
    FOR ALL USING (
        faq_item_id IN (
            SELECT id FROM public.send_faq_items 
            WHERE user_id = auth.uid()::text
        )
    );

-- RLS Policies for FAQ feedback
CREATE POLICY "Users can view feedback for their FAQs" ON public.send_faq_feedback
    FOR SELECT USING (
        faq_item_id IN (
            SELECT id FROM public.send_faq_items 
            WHERE user_id = auth.uid()::text
        )
    );

CREATE POLICY "System can insert FAQ feedback" ON public.send_faq_feedback
    FOR INSERT WITH CHECK (true);

-- RLS Policies for search history
CREATE POLICY "Users can view their FAQ search history" ON public.send_faq_search_history
    FOR ALL USING (user_id = auth.uid()::text);

-- Add comments for documentation
COMMENT ON TABLE public.send_faq_categories IS 'Categories for organizing FAQ items';
COMMENT ON TABLE public.send_faq_items IS 'FAQ questions and answers with search and analytics';
COMMENT ON TABLE public.send_faq_assignments IS 'Assignment of FAQs to specific documents or datarooms';
COMMENT ON TABLE public.send_faq_feedback IS 'User feedback on FAQ helpfulness';
COMMENT ON TABLE public.send_faq_search_history IS 'Search history for FAQ analytics';
COMMENT ON FUNCTION public.search_faq_items(TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER) IS 'Full-text search for FAQ items with relevance scoring';
COMMENT ON FUNCTION public.get_faq_statistics(TEXT) IS 'Returns comprehensive FAQ statistics for a user';
COMMENT ON FUNCTION public.increment_faq_view_count(TEXT) IS 'Increments view count for an FAQ item';
COMMENT ON FUNCTION public.get_popular_faqs(TEXT, INTEGER) IS 'Returns most popular FAQ items based on views and helpfulness';

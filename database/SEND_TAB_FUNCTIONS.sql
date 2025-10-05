-- =====================================================
-- SEND TAB DATABASE FUNCTIONS & TRIGGERS
-- Automated functions for Send Tab feature
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Shared Documents
DROP TRIGGER IF EXISTS update_shared_documents_updated_at ON public.shared_documents;
CREATE TRIGGER update_shared_documents_updated_at
    BEFORE UPDATE ON public.shared_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Document Links
DROP TRIGGER IF EXISTS update_document_links_updated_at ON public.document_links;
CREATE TRIGGER update_document_links_updated_at
    BEFORE UPDATE ON public.document_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Link Access Controls
DROP TRIGGER IF EXISTS update_link_access_controls_updated_at ON public.link_access_controls;
CREATE TRIGGER update_link_access_controls_updated_at
    BEFORE UPDATE ON public.link_access_controls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Visitor Sessions
DROP TRIGGER IF EXISTS update_visitor_sessions_updated_at ON public.visitor_sessions;
CREATE TRIGGER update_visitor_sessions_updated_at
    BEFORE UPDATE ON public.visitor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Custom Domains
DROP TRIGGER IF EXISTS update_custom_domains_updated_at ON public.custom_domains;
CREATE TRIGGER update_custom_domains_updated_at
    BEFORE UPDATE ON public.custom_domains
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Branding Settings
DROP TRIGGER IF EXISTS update_branding_settings_updated_at ON public.branding_settings;
CREATE TRIGGER update_branding_settings_updated_at
    BEFORE UPDATE ON public.branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Data Rooms
DROP TRIGGER IF EXISTS update_data_rooms_updated_at ON public.data_rooms;
CREATE TRIGGER update_data_rooms_updated_at
    BEFORE UPDATE ON public.data_rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- LINK ID GENERATION FUNCTION
-- =====================================================

-- Function to generate unique short link IDs
CREATE OR REPLACE FUNCTION public.generate_link_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := '';
    i INTEGER;
    link_exists BOOLEAN;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..8 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        END LOOP;
        
        -- Check if link_id already exists
        SELECT EXISTS(SELECT 1 FROM public.document_links WHERE link_id = result) INTO link_exists;
        
        EXIT WHEN NOT link_exists;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW COUNT INCREMENT FUNCTION
-- =====================================================

-- Function to increment view count on document links
CREATE OR REPLACE FUNCTION public.increment_link_view_count(link_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.document_links
    SET current_views = current_views + 1,
        updated_at = NOW()
    WHERE id = link_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENGAGEMENT SCORE CALCULATION
-- =====================================================

-- Function to calculate engagement score for a view
CREATE OR REPLACE FUNCTION public.calculate_engagement_score(
    p_duration_seconds INTEGER,
    p_pages_viewed INTEGER,
    p_total_pages INTEGER,
    p_completion_percentage INTEGER,
    p_downloaded BOOLEAN,
    p_nda_accepted BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
    expected_duration INTEGER;
BEGIN
    -- Base score from completion percentage (0-40 points)
    score := score + (p_completion_percentage * 0.4)::INTEGER;
    
    -- Time spent score (0-30 points)
    -- Assume 30 seconds per page as ideal
    expected_duration := p_total_pages * 30;
    IF p_duration_seconds >= expected_duration THEN
        score := score + 30;
    ELSE
        score := score + ((p_duration_seconds::FLOAT / expected_duration) * 30)::INTEGER;
    END IF;
    
    -- Pages viewed score (0-20 points)
    IF p_total_pages > 0 THEN
        score := score + ((p_pages_viewed::FLOAT / p_total_pages) * 20)::INTEGER;
    END IF;
    
    -- Download bonus (5 points)
    IF p_downloaded THEN
        score := score + 5;
    END IF;
    
    -- NDA acceptance bonus (5 points)
    IF p_nda_accepted THEN
        score := score + 5;
    END IF;
    
    -- Cap at 100
    IF score > 100 THEN
        score := 100;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISITOR SESSION UPDATE FUNCTION
-- =====================================================

-- Function to update or create visitor session
CREATE OR REPLACE FUNCTION public.upsert_visitor_session(
    p_link_id UUID,
    p_session_id TEXT,
    p_viewer_email TEXT,
    p_duration_seconds INTEGER,
    p_pages_viewed INTEGER,
    p_device_fingerprint TEXT
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_is_returning BOOLEAN;
BEGIN
    -- Check if session exists
    SELECT id, is_returning INTO v_session_id, v_is_returning
    FROM public.visitor_sessions
    WHERE session_id = p_session_id;
    
    IF v_session_id IS NOT NULL THEN
        -- Update existing session
        UPDATE public.visitor_sessions
        SET 
            last_visit = NOW(),
            total_visits = total_visits + 1,
            total_duration_seconds = total_duration_seconds + p_duration_seconds,
            total_pages_viewed = total_pages_viewed + p_pages_viewed,
            is_returning = true,
            updated_at = NOW()
        WHERE id = v_session_id;
    ELSE
        -- Create new session
        INSERT INTO public.visitor_sessions (
            link_id,
            session_id,
            viewer_email,
            total_duration_seconds,
            total_pages_viewed,
            device_fingerprint,
            is_returning
        ) VALUES (
            p_link_id,
            p_session_id,
            p_viewer_email,
            p_duration_seconds,
            p_pages_viewed,
            p_device_fingerprint,
            false
        )
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- LINK EXPIRATION CHECK FUNCTION
-- =====================================================

-- Function to check if a link is expired or maxed out
CREATE OR REPLACE FUNCTION public.is_link_accessible(p_link_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_link RECORD;
BEGIN
    SELECT 
        is_active,
        expires_at,
        max_views,
        current_views
    INTO v_link
    FROM public.document_links
    WHERE id = p_link_id;
    
    -- Link doesn't exist
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Link is not active
    IF NOT v_link.is_active THEN
        RETURN false;
    END IF;
    
    -- Link is expired
    IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
        RETURN false;
    END IF;
    
    -- Link has reached max views
    IF v_link.max_views IS NOT NULL AND v_link.current_views >= v_link.max_views THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ANALYTICS AGGREGATION FUNCTIONS
-- =====================================================

-- Function to get link analytics summary
CREATE OR REPLACE FUNCTION public.get_link_analytics(p_link_id UUID)
RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    avg_duration_seconds NUMERIC,
    avg_completion_percentage NUMERIC,
    total_downloads BIGINT,
    avg_engagement_score NUMERIC,
    returning_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_views,
        COUNT(DISTINCT session_id)::BIGINT as unique_visitors,
        AVG(duration_seconds)::NUMERIC as avg_duration_seconds,
        AVG(completion_percentage)::NUMERIC as avg_completion_percentage,
        COUNT(*) FILTER (WHERE downloaded = true)::BIGINT as total_downloads,
        AVG(engagement_score)::NUMERIC as avg_engagement_score,
        COUNT(DISTINCT session_id) FILTER (
            WHERE session_id IN (
                SELECT session_id FROM public.visitor_sessions 
                WHERE link_id = p_link_id AND is_returning = true
            )
        )::BIGINT as returning_visitors
    FROM public.document_views
    WHERE link_id = p_link_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get document analytics summary
CREATE OR REPLACE FUNCTION public.get_document_analytics(p_document_id UUID)
RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    total_links BIGINT,
    active_links BIGINT,
    avg_engagement_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(dv.*)::BIGINT as total_views,
        COUNT(DISTINCT dv.session_id)::BIGINT as unique_visitors,
        COUNT(DISTINCT dl.id)::BIGINT as total_links,
        COUNT(DISTINCT dl.id) FILTER (WHERE dl.is_active = true)::BIGINT as active_links,
        AVG(dv.engagement_score)::NUMERIC as avg_engagement_score
    FROM public.document_links dl
    LEFT JOIN public.document_views dv ON dv.link_id = dl.id
    WHERE dl.document_id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired email verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.link_email_verifications
    WHERE expires_at < NOW() AND verified = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate expired links
CREATE OR REPLACE FUNCTION public.deactivate_expired_links()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.document_links
    SET is_active = false,
        updated_at = NOW()
    WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Send Tab functions and triggers created successfully!';
    RAISE NOTICE '⚙️  Created utility functions:';
    RAISE NOTICE '   - generate_link_id()';
    RAISE NOTICE '   - increment_link_view_count()';
    RAISE NOTICE '   - calculate_engagement_score()';
    RAISE NOTICE '   - upsert_visitor_session()';
    RAISE NOTICE '   - is_link_accessible()';
    RAISE NOTICE '   - get_link_analytics()';
    RAISE NOTICE '   - get_document_analytics()';
    RAISE NOTICE '   - cleanup_expired_verifications()';
    RAISE NOTICE '   - deactivate_expired_links()';
    RAISE NOTICE '🔄 Triggers configured for automatic timestamp updates';
END $$;


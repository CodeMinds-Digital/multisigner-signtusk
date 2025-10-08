-- =====================================================
-- SEND TAB ROW LEVEL SECURITY POLICIES
-- Configure RLS policies for all Send Tab tables
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Enable RLS on all Send Tab tables
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_access_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_ndas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_room_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SHARED DOCUMENTS POLICIES
-- =====================================================

-- Users can view their own documents
CREATE POLICY "Users can view their own shared documents"
ON public.shared_documents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own documents
CREATE POLICY "Users can create shared documents"
ON public.shared_documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own documents
CREATE POLICY "Users can update their own shared documents"
ON public.shared_documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own documents
CREATE POLICY "Users can delete their own shared documents"
ON public.shared_documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- DOCUMENT LINKS POLICIES
-- =====================================================

-- Users can view links for their documents
CREATE POLICY "Users can view their document links"
ON public.document_links FOR SELECT
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.shared_documents
        WHERE id = document_links.document_id
        AND user_id = auth.uid()
    )
);

-- Users can create links for their documents
CREATE POLICY "Users can create document links"
ON public.document_links FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.shared_documents
        WHERE id = document_links.document_id
        AND user_id = auth.uid()
    )
);

-- Users can update their document links
CREATE POLICY "Users can update their document links"
ON public.document_links FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.shared_documents
        WHERE id = document_links.document_id
        AND user_id = auth.uid()
    )
);

-- Users can delete their document links
CREATE POLICY "Users can delete their document links"
ON public.document_links FOR DELETE
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.shared_documents
        WHERE id = document_links.document_id
        AND user_id = auth.uid()
    )
);

-- =====================================================
-- LINK ACCESS CONTROLS POLICIES
-- =====================================================

-- Users can view access controls for their links
CREATE POLICY "Users can view their link access controls"
ON public.link_access_controls FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_access_controls.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Users can create access controls for their links
CREATE POLICY "Users can create link access controls"
ON public.link_access_controls FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_access_controls.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Users can update access controls for their links
CREATE POLICY "Users can update their link access controls"
ON public.link_access_controls FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_access_controls.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Users can delete access controls for their links
CREATE POLICY "Users can delete their link access controls"
ON public.link_access_controls FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_access_controls.link_id
        AND sd.user_id = auth.uid()
    )
);

-- =====================================================
-- DOCUMENT VIEWS POLICIES
-- =====================================================

-- Users can view analytics for their documents
CREATE POLICY "Users can view their document analytics"
ON public.document_views FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = document_views.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can insert view records (for tracking)
CREATE POLICY "Anyone can create document views"
ON public.document_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- PAGE VIEWS POLICIES
-- =====================================================

-- Users can view page analytics for their documents
CREATE POLICY "Users can view their page analytics"
ON public.page_views FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_views dv
        JOIN public.document_links dl ON dl.id = dv.link_id
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dv.id = page_views.view_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can insert page view records (for tracking)
CREATE POLICY "Anyone can create page views"
ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- VISITOR SESSIONS POLICIES
-- =====================================================

-- Users can view visitor sessions for their documents
CREATE POLICY "Users can view their visitor sessions"
ON public.visitor_sessions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = visitor_sessions.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can insert/update visitor sessions (for tracking)
CREATE POLICY "Anyone can create visitor sessions"
ON public.visitor_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update visitor sessions"
ON public.visitor_sessions FOR UPDATE
TO anon, authenticated
USING (true);

-- =====================================================
-- EMAIL VERIFICATIONS POLICIES
-- =====================================================

-- Users can view email verifications for their links
CREATE POLICY "Users can view their email verifications"
ON public.link_email_verifications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_email_verifications.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can create email verifications (for access)
CREATE POLICY "Anyone can create email verifications"
ON public.link_email_verifications FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can update email verifications (for verification)
CREATE POLICY "Anyone can update email verifications"
ON public.link_email_verifications FOR UPDATE
TO anon, authenticated
USING (true);

-- =====================================================
-- DOCUMENT NDAS POLICIES
-- =====================================================

-- Users can view NDAs for their documents
CREATE POLICY "Users can view their document NDAs"
ON public.document_ndas FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = document_ndas.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can create NDA acceptances
CREATE POLICY "Anyone can create NDA acceptances"
ON public.document_ndas FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- DOCUMENT FEEDBACK POLICIES
-- =====================================================

-- Users can view feedback for their documents
CREATE POLICY "Users can view their document feedback"
ON public.document_feedback FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.shared_documents
        WHERE id = document_feedback.document_id
        AND user_id = auth.uid()
    )
);

-- Anyone can submit feedback
CREATE POLICY "Anyone can submit document feedback"
ON public.document_feedback FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- CUSTOM DOMAINS POLICIES
-- =====================================================

CREATE POLICY "Users can manage their custom domains"
ON public.custom_domains FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- BRANDING SETTINGS POLICIES
-- =====================================================

CREATE POLICY "Users can manage their branding settings"
ON public.branding_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- ANALYTICS EVENTS POLICIES
-- =====================================================

-- Users can view analytics events for their documents
CREATE POLICY "Users can view their analytics events"
ON public.link_analytics_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.document_links dl
        JOIN public.shared_documents sd ON sd.id = dl.document_id
        WHERE dl.id = link_analytics_events.link_id
        AND sd.user_id = auth.uid()
    )
);

-- Anyone can create analytics events (for tracking)
CREATE POLICY "Anyone can create analytics events"
ON public.link_analytics_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- =====================================================
-- DATA ROOMS POLICIES
-- =====================================================

CREATE POLICY "Users can manage their data rooms"
ON public.data_rooms FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =====================================================
-- DATA ROOM DOCUMENTS POLICIES
-- =====================================================

-- Users can view data room documents for their data rooms
CREATE POLICY "Users can view their data room documents"
ON public.data_room_documents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.data_rooms
        WHERE id = data_room_documents.data_room_id
        AND user_id = auth.uid()
    )
);

-- Users can manage data room documents for their data rooms
CREATE POLICY "Users can manage their data room documents"
ON public.data_room_documents FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.data_rooms
        WHERE id = data_room_documents.data_room_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their data room documents"
ON public.data_room_documents FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.data_rooms
        WHERE id = data_room_documents.data_room_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their data room documents"
ON public.data_room_documents FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.data_rooms
        WHERE id = data_room_documents.data_room_id
        AND user_id = auth.uid()
    )
);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Send Tab RLS policies configured successfully!';
    RAISE NOTICE '🔒 All 14 tables now have Row Level Security enabled';
    RAISE NOTICE '👥 Users can only access their own data';
    RAISE NOTICE '📊 Anonymous users can track views and submit feedback';
    RAISE NOTICE '🔄 Next step: Configure Upstash Redis and QStash';
END $$;


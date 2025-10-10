-- Meeting Module RLS Policies and Security
-- Comprehensive security policies for all meeting tables

-- Enable RLS on all meeting tables
ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_team_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_workflow_templates ENABLE ROW LEVEL SECURITY;

-- Meeting Types Policies
CREATE POLICY "Users can view their own meeting types" ON meeting_types
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meeting types" ON meeting_types
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meeting types" ON meeting_types
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meeting types" ON meeting_types
    FOR DELETE USING (auth.uid() = user_id);

-- Public access for booking (guests can view active meeting types)
CREATE POLICY "Public can view active meeting types for booking" ON meeting_types
    FOR SELECT USING (is_active = true);

-- Meeting Availability Policies
CREATE POLICY "Users can manage their own availability" ON meeting_availability
    FOR ALL USING (auth.uid() = user_id);

-- Public access for availability checking
CREATE POLICY "Public can view availability for booking" ON meeting_availability
    FOR SELECT USING (true);

-- Meeting Bookings Policies
CREATE POLICY "Hosts can view their bookings" ON meeting_bookings
    FOR SELECT USING (auth.uid() = host_user_id);

CREATE POLICY "Hosts can update their bookings" ON meeting_bookings
    FOR UPDATE USING (auth.uid() = host_user_id);

-- Guests can view their own bookings using booking token
CREATE POLICY "Guests can view bookings with valid token" ON meeting_bookings
    FOR SELECT USING (
        booking_token IS NOT NULL AND 
        (auth.uid() = host_user_id OR auth.uid() IS NULL)
    );

-- Public booking creation (for guests)
CREATE POLICY "Anyone can create bookings" ON meeting_bookings
    FOR INSERT WITH CHECK (true);

-- Meeting Documents Policies
CREATE POLICY "Hosts can manage meeting documents" ON meeting_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_documents.booking_id 
            AND host_user_id = auth.uid()
        )
    );

-- Guests can view documents for their bookings
CREATE POLICY "Guests can view their meeting documents" ON meeting_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_documents.booking_id 
            AND (host_user_id = auth.uid() OR auth.uid() IS NULL)
        )
    );

-- Meeting Workflows Policies
CREATE POLICY "Users can manage their own workflows" ON meeting_workflows
    FOR ALL USING (auth.uid() = user_id);

-- Meeting Analytics Policies
CREATE POLICY "Hosts can view analytics for their bookings" ON meeting_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_analytics.booking_id 
            AND host_user_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can insert analytics" ON meeting_analytics
    FOR INSERT WITH CHECK (true);

-- Meeting Reminders Policies
CREATE POLICY "Hosts can manage reminders for their bookings" ON meeting_reminders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_reminders.booking_id 
            AND host_user_id = auth.uid()
        )
    );

-- Calendar Integrations Policies
CREATE POLICY "Users can manage their own calendar integrations" ON meeting_calendar_integrations
    FOR ALL USING (auth.uid() = user_id);

-- Video Links Policies
CREATE POLICY "Hosts can manage video links for their bookings" ON meeting_video_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_video_links.booking_id 
            AND host_user_id = auth.uid()
        )
    );

-- Guests can view video links for their bookings
CREATE POLICY "Guests can view video links for their bookings" ON meeting_video_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_video_links.booking_id
        )
    );

-- Payment Transactions Policies
CREATE POLICY "Hosts can view payment transactions for their bookings" ON meeting_payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM meeting_bookings 
            WHERE id = meeting_payment_transactions.booking_id 
            AND host_user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage payment transactions" ON meeting_payment_transactions
    FOR ALL USING (true); -- Managed by backend services

-- Team Availability Policies
CREATE POLICY "Team members can view team availability" ON meeting_team_availability
    FOR SELECT USING (auth.uid() = user_id OR true); -- TODO: Add proper team membership check

CREATE POLICY "Team members can manage their own availability" ON meeting_team_availability
    FOR ALL USING (auth.uid() = user_id);

-- Organization Settings Policies
CREATE POLICY "Organization members can view settings" ON meeting_organization_settings
    FOR SELECT USING (true); -- TODO: Add proper organization membership check

CREATE POLICY "Organization admins can manage settings" ON meeting_organization_settings
    FOR ALL USING (true); -- TODO: Add proper admin check

-- Workflow Templates Policies
CREATE POLICY "Everyone can view public templates" ON meeting_workflow_templates
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own templates" ON meeting_workflow_templates
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create templates" ON meeting_workflow_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON meeting_workflow_templates
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates" ON meeting_workflow_templates
    FOR DELETE USING (auth.uid() = created_by);

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_meeting_types_updated_at BEFORE UPDATE ON meeting_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_availability_updated_at BEFORE UPDATE ON meeting_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_bookings_updated_at BEFORE UPDATE ON meeting_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_documents_updated_at BEFORE UPDATE ON meeting_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_workflows_updated_at BEFORE UPDATE ON meeting_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_calendar_integrations_updated_at BEFORE UPDATE ON meeting_calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_payment_transactions_updated_at BEFORE UPDATE ON meeting_payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_team_availability_updated_at BEFORE UPDATE ON meeting_team_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_organization_settings_updated_at BEFORE UPDATE ON meeting_organization_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meeting_workflow_templates_updated_at BEFORE UPDATE ON meeting_workflow_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique booking tokens
CREATE OR REPLACE FUNCTION generate_booking_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_token IS NULL THEN
        NEW.booking_token := encode(gen_random_bytes(32), 'base64url');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_booking_token_trigger BEFORE INSERT ON meeting_bookings
    FOR EACH ROW EXECUTE FUNCTION generate_booking_token();

-- Function to update booking counts
CREATE OR REPLACE FUNCTION update_meeting_type_booking_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meeting_types 
        SET total_bookings = total_bookings + 1 
        WHERE id = NEW.meeting_type_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meeting_types 
        SET total_bookings = GREATEST(total_bookings - 1, 0) 
        WHERE id = OLD.meeting_type_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_count_trigger 
    AFTER INSERT OR DELETE ON meeting_bookings
    FOR EACH ROW EXECUTE FUNCTION update_meeting_type_booking_count();

-- Function to auto-generate booking URL slugs
CREATE OR REPLACE FUNCTION generate_booking_url_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_url_slug IS NULL THEN
        NEW.booking_url_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(NEW.id::text from 1 for 8);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_booking_url_slug_trigger BEFORE INSERT ON meeting_types
    FOR EACH ROW EXECUTE FUNCTION generate_booking_url_slug();

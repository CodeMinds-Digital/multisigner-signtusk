-- Meeting Module Database Schema
-- All tables prefixed with "meeting_" for clear organization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Meeting Types Configuration
CREATE TABLE meeting_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('quick-meeting', 'business-meeting')),
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    meeting_format VARCHAR(50) NOT NULL CHECK (meeting_format IN ('video', 'phone', 'in-person', 'any')),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    booking_url_slug VARCHAR(255) UNIQUE,
    
    -- Pricing configuration
    is_paid BOOLEAN DEFAULT false,
    price_amount INTEGER DEFAULT 0, -- in cents
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Business meeting specific
    workflow_type VARCHAR(100),
    requires_documents BOOLEAN DEFAULT false,
    requires_signatures BOOLEAN DEFAULT false,
    auto_send_documents BOOLEAN DEFAULT false,
    
    -- Security settings
    requires_mfa BOOLEAN DEFAULT false,
    requires_watermarks BOOLEAN DEFAULT false,
    access_restrictions JSONB DEFAULT '{}',
    
    -- Metadata
    total_bookings INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Availability Configuration
CREATE TABLE meeting_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timezone and general settings
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    buffer_minutes INTEGER DEFAULT 15,
    max_advance_days INTEGER DEFAULT 30,
    min_notice_hours INTEGER DEFAULT 2,
    
    -- Weekly schedule (JSON format for flexibility)
    weekly_schedule JSONB NOT NULL DEFAULT '{
        "monday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
        "tuesday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
        "wednesday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
        "thursday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
        "friday": {"enabled": true, "slots": [{"start": "09:00", "end": "17:00"}]},
        "saturday": {"enabled": false, "slots": []},
        "sunday": {"enabled": false, "slots": []}
    }',
    
    -- Override dates (holidays, vacations, etc.)
    date_overrides JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Meeting Bookings
CREATE TABLE meeting_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_type_id UUID NOT NULL REFERENCES meeting_types(id) ON DELETE CASCADE,
    host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Booking details
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')),
    
    -- Meeting information
    title VARCHAR(500),
    description TEXT,
    meeting_format VARCHAR(50) NOT NULL,
    location TEXT, -- Physical address or video link
    
    -- Guest information
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    guest_phone VARCHAR(50),
    guest_company VARCHAR(255),
    guest_title VARCHAR(255),
    guest_notes TEXT,
    guest_custom_data JSONB DEFAULT '{}',
    
    -- Business meeting specific
    project_details TEXT,
    budget_range VARCHAR(100),
    timeline VARCHAR(100),
    security_preferences JSONB DEFAULT '{}',
    
    -- Booking management
    booking_token VARCHAR(255) UNIQUE NOT NULL,
    reschedule_count INTEGER DEFAULT 0,
    max_reschedules INTEGER DEFAULT 3,
    cancellation_reason TEXT,
    
    -- Payment information
    payment_status VARCHAR(50) DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'completed', 'failed', 'refunded')),
    payment_intent_id VARCHAR(255),
    amount_paid INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_meeting_bookings_host_user_id (host_user_id),
    INDEX idx_meeting_bookings_scheduled_at (scheduled_at),
    INDEX idx_meeting_bookings_status (status),
    INDEX idx_meeting_bookings_guest_email (guest_email),
    INDEX idx_meeting_bookings_booking_token (booking_token)
);

-- Meeting Documents (Integration with Send module)
CREATE TABLE meeting_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES meeting_bookings(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL, -- Reference to existing documents table
    
    -- Document workflow
    workflow_stage VARCHAR(100) NOT NULL CHECK (workflow_stage IN ('pre-meeting', 'during-meeting', 'post-meeting')),
    send_timing VARCHAR(100) NOT NULL CHECK (send_timing IN ('immediate', 'scheduled', 'manual')),
    scheduled_send_at TIMESTAMP WITH TIME ZONE,
    
    -- Document status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'downloaded', 'signed', 'expired')),
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Security and access
    requires_signature BOOLEAN DEFAULT false,
    access_password VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Workflows (Automation rules)
CREATE TABLE meeting_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE CASCADE,
    
    -- Workflow configuration
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(100) NOT NULL, -- 'legal-consultation', 'sales-meeting', 'real-estate', etc.
    is_active BOOLEAN DEFAULT true,
    
    -- Trigger conditions
    trigger_events JSONB NOT NULL DEFAULT '[]', -- ['booking_confirmed', 'meeting_completed', etc.]
    
    -- Actions to perform
    actions JSONB NOT NULL DEFAULT '[]', -- Array of action objects
    
    -- Template documents
    document_templates JSONB DEFAULT '[]',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meeting Analytics (Real-time tracking)
CREATE TABLE meeting_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES meeting_bookings(id) ON DELETE CASCADE,
    
    -- Event tracking
    event_type VARCHAR(100) NOT NULL, -- 'booking_created', 'document_viewed', 'meeting_completed', etc.
    event_data JSONB DEFAULT '{}',
    
    -- User agent and session info
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    
    -- Geographic data
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Timing data
    page_load_time INTEGER, -- milliseconds
    interaction_time INTEGER, -- seconds spent
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_meeting_analytics_booking_id (booking_id),
    INDEX idx_meeting_analytics_event_type (event_type),
    INDEX idx_meeting_analytics_created_at (created_at)
);

-- Meeting Reminders (Email automation)
CREATE TABLE meeting_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES meeting_bookings(id) ON DELETE CASCADE,
    
    -- Reminder configuration
    reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('confirmation', '24h', '1h', 'follow-up')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Email details
    recipient_email VARCHAR(255) NOT NULL,
    email_subject VARCHAR(500),
    email_template VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_meeting_reminders_scheduled_at (scheduled_at),
    INDEX idx_meeting_reminders_status (status)
);

-- Calendar Integrations
CREATE TABLE meeting_calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Integration details
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'outlook', 'apple', 'caldav')),
    provider_account_id VARCHAR(255) NOT NULL,
    
    -- Authentication
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Configuration
    calendar_id VARCHAR(255),
    calendar_name VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    sync_enabled BOOLEAN DEFAULT true,
    
    -- Sync status
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'active' CHECK (sync_status IN ('active', 'error', 'disabled')),
    sync_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, provider, provider_account_id)
);

-- Video Meeting Links
CREATE TABLE meeting_video_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES meeting_bookings(id) ON DELETE CASCADE,

    -- Video platform details
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('zoom', 'google-meet', 'teams', 'custom')),
    meeting_id VARCHAR(255),
    join_url TEXT NOT NULL,
    host_url TEXT,

    -- Meeting configuration
    password VARCHAR(100),
    waiting_room_enabled BOOLEAN DEFAULT true,
    recording_enabled BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(booking_id)
);

-- Payment Transactions
CREATE TABLE meeting_payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES meeting_bookings(id) ON DELETE CASCADE,

    -- Payment details
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount INTEGER NOT NULL, -- in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',

    -- Transaction status
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled', 'refunded')),

    -- Metadata
    payment_method_type VARCHAR(50),
    failure_reason TEXT,
    refund_amount INTEGER DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Availability (Enterprise feature)
CREATE TABLE meeting_team_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL, -- Reference to teams table if exists
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Team scheduling configuration
    role VARCHAR(100) NOT NULL, -- 'member', 'lead', 'admin'
    priority INTEGER DEFAULT 1, -- For round-robin scheduling

    -- Availability overrides
    is_available BOOLEAN DEFAULT true,
    unavailable_until TIMESTAMP WITH TIME ZONE,
    unavailable_reason TEXT,

    -- Load balancing
    current_bookings INTEGER DEFAULT 0,
    max_concurrent_bookings INTEGER DEFAULT 10,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(team_id, user_id)
);

-- Organization Settings (Enterprise)
CREATE TABLE meeting_organization_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL, -- Reference to organizations table

    -- Branding
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    custom_domain VARCHAR(255),

    -- Default settings
    default_timezone VARCHAR(100) DEFAULT 'UTC',
    default_buffer_minutes INTEGER DEFAULT 15,
    default_meeting_duration INTEGER DEFAULT 30,

    -- Security policies
    require_mfa_for_business_meetings BOOLEAN DEFAULT false,
    allowed_domains JSONB DEFAULT '[]',
    blocked_domains JSONB DEFAULT '[]',

    -- Workflow settings
    auto_assign_team_members BOOLEAN DEFAULT false,
    enable_round_robin BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(organization_id)
);

-- Workflow Templates (Pre-built workflows)
CREATE TABLE meeting_workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'legal', 'sales', 'real-estate', 'healthcare', etc.
    industry VARCHAR(100),

    -- Template configuration
    template_data JSONB NOT NULL,
    document_templates JSONB DEFAULT '[]',

    -- Metadata
    is_public BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,

    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

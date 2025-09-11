-- Enhanced Reminder Analytics and History Tracking
-- This table provides comprehensive tracking of all reminder activities

CREATE TABLE IF NOT EXISTS public.reminder_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    signing_request_id UUID REFERENCES public.signing_requests(id) ON DELETE CASCADE NOT NULL,
    initiated_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reminder_type TEXT DEFAULT 'manual' CHECK (reminder_type IN ('manual', 'automatic', 'scheduled')),
    channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'in_app', 'push')),
    
    -- Target information
    target_signers JSONB NOT NULL, -- Array of signer emails/info that were targeted
    total_targets INTEGER NOT NULL DEFAULT 0,
    
    -- Results tracking
    successful_sends INTEGER DEFAULT 0,
    failed_sends INTEGER DEFAULT 0,
    delivery_results JSONB DEFAULT '[]'::jsonb, -- Detailed results per recipient
    
    -- Timing information
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    next_allowed_at TIMESTAMPTZ, -- When next reminder can be sent (24h restriction)
    
    -- Metadata
    sender_ip INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Audit trail
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminder_history_signing_request ON public.reminder_history(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_reminder_history_initiated_by ON public.reminder_history(initiated_by);
CREATE INDEX IF NOT EXISTS idx_reminder_history_sent_at ON public.reminder_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_reminder_history_next_allowed ON public.reminder_history(next_allowed_at);

-- Function to check if reminder is allowed (24-hour restriction)
CREATE OR REPLACE FUNCTION public.can_send_reminder(
    p_signing_request_id UUID,
    p_initiated_by UUID
) RETURNS JSONB AS $$
DECLARE
    last_reminder_time TIMESTAMPTZ;
    next_allowed_time TIMESTAMPTZ;
    hours_remaining DECIMAL;
    request_expires_at TIMESTAMPTZ;
    request_status TEXT;
    result JSONB;
BEGIN
    -- Get signing request info
    SELECT expires_at, status INTO request_expires_at, request_status
    FROM public.signing_requests 
    WHERE id = p_signing_request_id AND initiated_by = p_initiated_by;
    
    -- Check if request exists and user has access
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'request_not_found',
            'message', 'Signature request not found or access denied'
        );
    END IF;
    
    -- Check if request has expired
    IF request_expires_at IS NOT NULL AND request_expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'expired',
            'message', 'Cannot send reminders for expired documents',
            'expired_at', request_expires_at
        );
    END IF;
    
    -- Check if request is completed
    IF request_status IN ('completed', 'cancelled') THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'completed',
            'message', 'Cannot send reminders for completed or cancelled documents',
            'status', request_status
        );
    END IF;
    
    -- Get the most recent reminder time
    SELECT MAX(sent_at) INTO last_reminder_time
    FROM public.reminder_history 
    WHERE signing_request_id = p_signing_request_id;
    
    -- If no previous reminder, check against document creation time
    IF last_reminder_time IS NULL THEN
        SELECT created_at INTO last_reminder_time
        FROM public.signing_requests 
        WHERE id = p_signing_request_id;
    END IF;
    
    -- Calculate next allowed time (24 hours after last reminder/creation)
    next_allowed_time := last_reminder_time + INTERVAL '24 hours';
    
    -- Check if 24 hours have passed
    IF NOW() < next_allowed_time THEN
        hours_remaining := EXTRACT(EPOCH FROM (next_allowed_time - NOW())) / 3600;
        
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'too_soon',
            'message', 'Must wait 24 hours between reminders',
            'last_reminder_at', last_reminder_time,
            'next_allowed_at', next_allowed_time,
            'hours_remaining', ROUND(hours_remaining, 1)
        );
    END IF;
    
    -- All checks passed - reminder is allowed
    RETURN jsonb_build_object(
        'allowed', true,
        'message', 'Reminder can be sent',
        'last_reminder_at', last_reminder_time,
        'next_allowed_at', next_allowed_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log reminder activity
CREATE OR REPLACE FUNCTION public.log_reminder_activity(
    p_signing_request_id UUID,
    p_initiated_by UUID,
    p_reminder_type TEXT DEFAULT 'manual',
    p_channel TEXT DEFAULT 'email',
    p_target_signers JSONB DEFAULT '[]'::jsonb,
    p_successful_sends INTEGER DEFAULT 0,
    p_failed_sends INTEGER DEFAULT 0,
    p_delivery_results JSONB DEFAULT '[]'::jsonb,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    reminder_id UUID;
    next_allowed TIMESTAMPTZ;
BEGIN
    -- Calculate next allowed reminder time
    next_allowed := NOW() + INTERVAL '24 hours';
    
    -- Insert reminder history record
    INSERT INTO public.reminder_history (
        signing_request_id,
        initiated_by,
        reminder_type,
        channel,
        target_signers,
        total_targets,
        successful_sends,
        failed_sends,
        delivery_results,
        next_allowed_at,
        metadata
    ) VALUES (
        p_signing_request_id,
        p_initiated_by,
        p_reminder_type,
        p_channel,
        p_target_signers,
        jsonb_array_length(p_target_signers),
        p_successful_sends,
        p_failed_sends,
        p_delivery_results,
        next_allowed,
        p_metadata
    ) RETURNING id INTO reminder_id;
    
    -- Update signing_requests table with last reminder timestamp
    UPDATE public.signing_requests 
    SET 
        last_reminder_sent = NOW(),
        updated_at = NOW()
    WHERE id = p_signing_request_id;
    
    RETURN reminder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reminder analytics for a signing request
CREATE OR REPLACE FUNCTION public.get_reminder_analytics(
    p_signing_request_id UUID,
    p_initiated_by UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_reminders INTEGER;
    last_reminder TIMESTAMPTZ;
    next_allowed TIMESTAMPTZ;
    analytics_data JSONB;
BEGIN
    -- Verify access
    IF NOT EXISTS (
        SELECT 1 FROM public.signing_requests 
        WHERE id = p_signing_request_id AND initiated_by = p_initiated_by
    ) THEN
        RETURN jsonb_build_object('error', 'Access denied or request not found');
    END IF;
    
    -- Get reminder statistics
    SELECT 
        COUNT(*),
        MAX(sent_at),
        MAX(next_allowed_at)
    INTO total_reminders, last_reminder, next_allowed
    FROM public.reminder_history 
    WHERE signing_request_id = p_signing_request_id;
    
    -- Get detailed analytics
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'sent_at', sent_at,
            'channel', channel,
            'reminder_type', reminder_type,
            'total_targets', total_targets,
            'successful_sends', successful_sends,
            'failed_sends', failed_sends,
            'delivery_results', delivery_results
        ) ORDER BY sent_at DESC
    ) INTO analytics_data
    FROM public.reminder_history 
    WHERE signing_request_id = p_signing_request_id;
    
    RETURN jsonb_build_object(
        'total_reminders', COALESCE(total_reminders, 0),
        'last_reminder_at', last_reminder,
        'next_allowed_at', next_allowed,
        'can_send_now', (next_allowed IS NULL OR NOW() >= next_allowed),
        'reminder_history', COALESCE(analytics_data, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE public.reminder_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own reminder history
CREATE POLICY "Users can view own reminder history" ON public.reminder_history
    FOR SELECT USING (initiated_by = auth.uid());

-- Policy: Users can only insert their own reminder history
CREATE POLICY "Users can insert own reminder history" ON public.reminder_history
    FOR INSERT WITH CHECK (initiated_by = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT ON public.reminder_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_reminder(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_reminder_activity(UUID, UUID, TEXT, TEXT, JSONB, INTEGER, INTEGER, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reminder_analytics(UUID, UUID) TO authenticated;

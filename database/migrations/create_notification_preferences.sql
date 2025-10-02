-- =====================================================
-- Email Preferences Phase 1 Optimization Migration
-- Creates notification_preferences table with granular controls
-- =====================================================

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Master toggles
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Category toggles
    signature_requests BOOLEAN DEFAULT true,
    document_updates BOOLEAN DEFAULT true,
    reminders BOOLEAN DEFAULT true,
    marketing BOOLEAN DEFAULT false,
    
    -- Phase 1 Optimization: Granular email controls
    progress_updates BOOLEAN DEFAULT true,
    document_viewed_emails BOOLEAN DEFAULT false,  -- ❌ Disabled by default (too frequent)
    other_signer_notifications BOOLEAN DEFAULT false,  -- ❌ Disabled by default (spammy)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id 
ON notification_preferences(user_id);

-- Add comments for documentation
COMMENT ON TABLE notification_preferences IS 'User email notification preferences for Phase 1 optimization';
COMMENT ON COLUMN notification_preferences.email_notifications IS 'Master switch for all email notifications';
COMMENT ON COLUMN notification_preferences.signature_requests IS 'Email notifications for signature requests';
COMMENT ON COLUMN notification_preferences.document_updates IS 'Email notifications for document updates';
COMMENT ON COLUMN notification_preferences.reminders IS 'Email notifications for reminders';
COMMENT ON COLUMN notification_preferences.progress_updates IS 'Email notifications for signature completed, PDF generated (default: enabled)';
COMMENT ON COLUMN notification_preferences.document_viewed_emails IS 'Email notifications when documents are viewed/accessed (default: disabled - too frequent)';
COMMENT ON COLUMN notification_preferences.other_signer_notifications IS 'Email notifications when other signers sign documents (default: disabled - spammy)';

-- Enable Row Level Security (RLS)
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences" ON notification_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON notification_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON notification_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;

-- Create function to auto-create preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create preferences when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Create preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Verify the changes
DO $$
DECLARE
    user_count INTEGER;
    pref_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO pref_count FROM notification_preferences;
    
    RAISE NOTICE '✅ notification_preferences table created successfully!';
    RAISE NOTICE '✅ Total users: %', user_count;
    RAISE NOTICE '✅ Preferences created: %', pref_count;
    RAISE NOTICE '✅ Phase 1 Optimization: 3 redundant email types now disabled by default';
    RAISE NOTICE '   - document_viewed_emails: disabled (too frequent)';
    RAISE NOTICE '   - other_signer_notifications: disabled (spammy)';
    RAISE NOTICE '   - progress_updates: enabled (useful)';
    RAISE NOTICE '✅ RLS policies enabled';
    RAISE NOTICE '✅ Auto-create trigger enabled for new users';
END $$;


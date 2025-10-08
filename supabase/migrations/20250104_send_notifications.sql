-- =====================================================
-- Send Tab: Notifications System
-- =====================================================
-- Description: Real-time notifications for document events
-- Tables: send_notifications, send_notification_preferences
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS send_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES send_shared_documents(id) ON DELETE CASCADE,
  link_id UUID REFERENCES send_share_links(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_send_notifications_user_id ON send_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_send_notifications_document_id ON send_notifications(document_id);
CREATE INDEX IF NOT EXISTS idx_send_notifications_created_at ON send_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_send_notifications_read ON send_notifications(read) WHERE read = FALSE;

-- =====================================================
-- 2. NOTIFICATION PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS send_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification channels
  email_notifications BOOLEAN DEFAULT TRUE,
  realtime_notifications BOOLEAN DEFAULT TRUE,
  slack_notifications BOOLEAN DEFAULT FALSE,
  webhook_notifications BOOLEAN DEFAULT FALSE,
  
  -- Event types
  notify_on_view BOOLEAN DEFAULT TRUE,
  notify_on_download BOOLEAN DEFAULT TRUE,
  notify_on_print BOOLEAN DEFAULT TRUE,
  notify_on_nda BOOLEAN DEFAULT TRUE,
  notify_on_high_engagement BOOLEAN DEFAULT TRUE,
  notify_on_returning_visitor BOOLEAN DEFAULT TRUE,
  
  -- Webhook/Slack URLs
  slack_webhook_url TEXT,
  webhook_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for preferences
CREATE INDEX IF NOT EXISTS idx_send_notification_preferences_user_id ON send_notification_preferences(user_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE send_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON send_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON send_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON send_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON send_notifications
  FOR INSERT
  WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
  ON send_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON send_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON send_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Update updated_at timestamp for notifications
CREATE TRIGGER update_send_notifications_updated_at
  BEFORE UPDATE ON send_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update updated_at timestamp for preferences
CREATE TRIGGER update_send_notification_preferences_updated_at
  BEFORE UPDATE ON send_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE send_notifications;

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to clean up old notifications (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM send_notifications
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND read = TRUE;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM send_notifications
  WHERE user_id = p_user_id
  AND read = FALSE;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- 7. COMMENTS
-- =====================================================

COMMENT ON TABLE send_notifications IS 'Real-time notifications for document events';
COMMENT ON TABLE send_notification_preferences IS 'User notification preferences and settings';

COMMENT ON COLUMN send_notifications.type IS 'Notification type: document_viewed, document_downloaded, etc.';
COMMENT ON COLUMN send_notifications.metadata IS 'Additional notification data (visitor info, location, etc.)';
COMMENT ON COLUMN send_notifications.read IS 'Whether the notification has been read';

COMMENT ON COLUMN send_notification_preferences.email_notifications IS 'Enable email notifications';
COMMENT ON COLUMN send_notification_preferences.realtime_notifications IS 'Enable real-time in-app notifications';
COMMENT ON COLUMN send_notification_preferences.slack_notifications IS 'Enable Slack notifications';
COMMENT ON COLUMN send_notification_preferences.webhook_notifications IS 'Enable webhook notifications';

-- =====================================================
-- END OF MIGRATION
-- =====================================================


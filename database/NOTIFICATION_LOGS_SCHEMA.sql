-- Create notification_logs table for tracking email notifications
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signing_request_id UUID REFERENCES signing_requests(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'sequential_next', 'reminder', 'completion', etc.
  message_id TEXT, -- Email service message ID for tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_request_id ON notification_logs(signing_request_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Enable RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification logs" ON notification_logs
  FOR SELECT USING (
    recipient_email = auth.email() OR
    EXISTS (
      SELECT 1 FROM signing_requests sr 
      WHERE sr.id = notification_logs.signing_request_id 
      AND sr.initiated_by = auth.email()
    )
  );

CREATE POLICY "Service role can manage all notification logs" ON notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments
COMMENT ON TABLE notification_logs IS 'Tracks email notifications sent for signing requests';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification: sequential_next, reminder, completion, etc.';
COMMENT ON COLUMN notification_logs.message_id IS 'Email service provider message ID for tracking delivery';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status: sent, delivered, failed, bounced';

-- Mail Module Database Functions
-- These functions support the MAIL module operations

-- Function to update email usage statistics
CREATE OR REPLACE FUNCTION update_email_usage(
  account_id UUID,
  period_start DATE,
  period_end DATE,
  field_name TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.email_usage_records (
    email_account_id,
    period_start,
    period_end,
    emails_sent,
    emails_delivered,
    emails_bounced,
    emails_opened,
    emails_clicked
  )
  VALUES (
    account_id,
    period_start,
    period_end,
    CASE WHEN field_name = 'emails_sent' THEN increment_by ELSE 0 END,
    CASE WHEN field_name = 'emails_delivered' THEN increment_by ELSE 0 END,
    CASE WHEN field_name = 'emails_bounced' THEN increment_by ELSE 0 END,
    CASE WHEN field_name = 'emails_opened' THEN increment_by ELSE 0 END,
    CASE WHEN field_name = 'emails_clicked' THEN increment_by ELSE 0 END
  )
  ON CONFLICT (email_account_id, period_start)
  DO UPDATE SET
    emails_sent = CASE WHEN field_name = 'emails_sent' THEN email_usage_records.emails_sent + increment_by ELSE email_usage_records.emails_sent END,
    emails_delivered = CASE WHEN field_name = 'emails_delivered' THEN email_usage_records.emails_delivered + increment_by ELSE email_usage_records.emails_delivered END,
    emails_bounced = CASE WHEN field_name = 'emails_bounced' THEN email_usage_records.emails_bounced + increment_by ELSE email_usage_records.emails_bounced END,
    emails_opened = CASE WHEN field_name = 'emails_opened' THEN email_usage_records.emails_opened + increment_by ELSE email_usage_records.emails_opened END,
    emails_clicked = CASE WHEN field_name = 'emails_clicked' THEN email_usage_records.emails_clicked + increment_by ELSE email_usage_records.emails_clicked END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment email count (called by trigger)
CREATE OR REPLACE FUNCTION increment_email_count(account_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.email_accounts 
  SET emails_sent_this_month = emails_sent_this_month + 1
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly email counts (called by cron job)
CREATE OR REPLACE FUNCTION reset_monthly_email_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE public.email_accounts 
  SET emails_sent_this_month = 0
  WHERE DATE_TRUNC('month', CURRENT_DATE) > DATE_TRUNC('month', updated_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get email analytics for an account
CREATE OR REPLACE FUNCTION get_email_analytics(
  account_id UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_sent BIGINT,
  total_delivered BIGINT,
  total_bounced BIGINT,
  total_opened BIGINT,
  total_clicked BIGINT,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  click_rate NUMERIC,
  bounce_rate NUMERIC
) AS $$
DECLARE
  _start_date DATE;
  _end_date DATE;
BEGIN
  -- Default to current month if no dates provided
  _start_date := COALESCE(start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  _end_date := COALESCE(end_date, CURRENT_DATE);

  RETURN QUERY
  WITH stats AS (
    SELECT 
      COALESCE(SUM(ur.emails_sent), 0) as sent,
      COALESCE(SUM(ur.emails_delivered), 0) as delivered,
      COALESCE(SUM(ur.emails_bounced), 0) as bounced,
      COALESCE(SUM(ur.emails_opened), 0) as opened,
      COALESCE(SUM(ur.emails_clicked), 0) as clicked
    FROM public.email_usage_records ur
    WHERE ur.email_account_id = account_id
      AND ur.period_start >= _start_date
      AND ur.period_start <= _end_date
  )
  SELECT 
    s.sent,
    s.delivered,
    s.bounced,
    s.opened,
    s.clicked,
    CASE WHEN s.sent > 0 THEN ROUND((s.delivered::NUMERIC / s.sent::NUMERIC) * 100, 2) ELSE 0 END,
    CASE WHEN s.delivered > 0 THEN ROUND((s.opened::NUMERIC / s.delivered::NUMERIC) * 100, 2) ELSE 0 END,
    CASE WHEN s.delivered > 0 THEN ROUND((s.clicked::NUMERIC / s.delivered::NUMERIC) * 100, 2) ELSE 0 END,
    CASE WHEN s.sent > 0 THEN ROUND((s.bounced::NUMERIC / s.sent::NUMERIC) * 100, 2) ELSE 0 END
  FROM stats s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get domain verification status
CREATE OR REPLACE FUNCTION get_domain_verification_summary(account_id UUID)
RETURNS TABLE (
  total_domains BIGINT,
  verified_domains BIGINT,
  pending_domains BIGINT,
  failed_domains BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_domains,
    COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_domains,
    COUNT(*) FILTER (WHERE verification_status IN ('pending', 'verifying')) as pending_domains,
    COUNT(*) FILTER (WHERE verification_status = 'failed') as failed_domains
  FROM public.email_domains
  WHERE email_account_id = account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old email events (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_email_events(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.email_events 
  WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get suppression list summary
CREATE OR REPLACE FUNCTION get_suppression_summary(account_id UUID)
RETURNS TABLE (
  total_suppressed BIGINT,
  hard_bounces BIGINT,
  soft_bounces BIGINT,
  complaints BIGINT,
  unsubscribes BIGINT,
  manual_suppressions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_suppressed,
    COUNT(*) FILTER (WHERE reason = 'hard_bounce') as hard_bounces,
    COUNT(*) FILTER (WHERE reason = 'soft_bounce') as soft_bounces,
    COUNT(*) FILTER (WHERE reason = 'complaint') as complaints,
    COUNT(*) FILTER (WHERE reason = 'unsubscribe') as unsubscribes,
    COUNT(*) FILTER (WHERE reason = 'manual') as manual_suppressions
  FROM public.email_suppression_list
  WHERE email_account_id = account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is suppressed
CREATE OR REPLACE FUNCTION is_email_suppressed(account_id UUID, email_address TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  suppressed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO suppressed_count
  FROM public.email_suppression_list
  WHERE email_account_id = account_id 
    AND email = email_address;
  
  RETURN suppressed_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_email_usage(UUID, DATE, DATE, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_email_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_email_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_analytics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_domain_verification_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_email_events(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_suppression_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_suppressed(UUID, TEXT) TO authenticated;

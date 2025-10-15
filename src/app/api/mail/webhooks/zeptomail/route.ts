import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

interface ZeptoMailWebhookEvent {
  event: string;
  email: string;
  timestamp: string;
  message_id: string;
  client_reference?: string;
  bounce_type?: string;
  bounce_reason?: string;
  click_url?: string;
  user_agent?: string;
  ip_address?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface WebhookPayload {
  events: ZeptoMailWebhookEvent[];
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-zeptomail-signature');
    const timestamp = request.headers.get('x-zeptomail-timestamp');
    
    if (!signature || !timestamp) {
      console.error('Missing webhook signature or timestamp');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.text();
    
    // Verify HMAC signature
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload: WebhookPayload = JSON.parse(body);
    
    // Process each event
    const results = await Promise.allSettled(
      payload.events.map(event => processWebhookEvent(event))
    );

    // Log any failures
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some webhook events failed to process:', failures);
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      failures: failures.length 
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Webhook processing failed' 
    }, { status: 500 });
  }
}

/**
 * Verify webhook signature using HMAC
 */
function verifyWebhookSignature(body: string, signature: string, timestamp: string): boolean {
  try {
    const webhookSecret = process.env.ZEPTOMAIL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('ZEPTOMAIL_WEBHOOK_SECRET not configured');
      return false;
    }

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const eventTime = parseInt(timestamp) * 1000;
    const currentTime = Date.now();
    const timeDiff = Math.abs(currentTime - eventTime);
    
    if (timeDiff > 300000) { // 5 minutes
      console.error('Webhook timestamp too old');
      return false;
    }

    // Create expected signature
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Compare signatures
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Process individual webhook event
 */
async function processWebhookEvent(event: ZeptoMailWebhookEvent): Promise<void> {
  try {
    // Find message by external ID or client reference
    const { data: message, error: messageError } = await supabaseAdmin
      .from('email_messages')
      .select('id, email_account_id, status')
      .or(`external_id.eq.${event.message_id},id.eq.${event.client_reference}`)
      .single();

    if (messageError || !message) {
      console.warn(`Message not found for event: ${event.message_id}`);
      return;
    }

    // Record the event
    await supabaseAdmin
      .from('email_events')
      .insert({
        message_id: message.id,
        event_type: mapEventType(event.event),
        timestamp: new Date(event.timestamp).toISOString(),
        data: {
          email: event.email,
          message_id: event.message_id,
          bounce_type: event.bounce_type,
          bounce_reason: event.bounce_reason,
          click_url: event.click_url,
          user_agent: event.user_agent,
          ip_address: event.ip_address,
          location: event.location,
          raw_event: event
        }
      });

    // Update message status based on event
    await updateMessageStatus(message.id, event);

    // Handle bounces and complaints
    if (event.event === 'bounce' || event.event === 'complaint') {
      await handleSuppressionEvent(message.email_account_id, event);
    }

    // Update usage statistics
    await updateUsageStats(message.email_account_id, event);

  } catch (error) {
    console.error(`Error processing webhook event for message ${event.message_id}:`, error);
    throw error;
  }
}

/**
 * Map ZeptoMail event types to our internal event types
 */
function mapEventType(zeptoEvent: string): string {
  const eventMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'bounce': 'bounced',
    'complaint': 'complained',
    'open': 'opened',
    'click': 'clicked',
    'unsubscribe': 'unsubscribed',
    'reject': 'rejected'
  };

  return eventMap[zeptoEvent] || zeptoEvent;
}

/**
 * Update message status based on event
 */
async function updateMessageStatus(messageId: string, event: ZeptoMailWebhookEvent): Promise<void> {
  const statusUpdates: Record<string, string> = {
    'delivered': 'delivered',
    'bounce': 'bounced',
    'complaint': 'complained',
    'reject': 'failed'
  };

  const newStatus = statusUpdates[event.event];
  if (!newStatus) return;

  const updateData: any = { status: newStatus };

  if (event.event === 'delivered') {
    updateData.delivered_at = new Date(event.timestamp).toISOString();
  }

  await supabaseAdmin
    .from('email_messages')
    .update(updateData)
    .eq('id', messageId);
}

/**
 * Handle suppression events (bounces and complaints)
 */
async function handleSuppressionEvent(accountId: string, event: ZeptoMailWebhookEvent): Promise<void> {
  const reason = event.event === 'bounce' ? 
    (event.bounce_type === 'hard' ? 'hard_bounce' : 'soft_bounce') : 
    'complaint';

  // Add to suppression list
  await supabaseAdmin
    .from('email_suppression_list')
    .upsert({
      email_account_id: accountId,
      email: event.email,
      reason,
      source: 'webhook',
      bounce_reason: event.bounce_reason,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'email_account_id,email'
    });
}

/**
 * Update usage statistics
 */
async function updateUsageStats(accountId: string, event: ZeptoMailWebhookEvent): Promise<void> {
  const today = new Date();
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const updateField = getUsageField(event.event);
  if (!updateField) return;

  // Upsert usage record
  await supabaseAdmin.rpc('update_email_usage', {
    account_id: accountId,
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    field_name: updateField,
    increment_by: 1
  });
}

/**
 * Get usage field name for event type
 */
function getUsageField(eventType: string): string | null {
  const fieldMap: Record<string, string> = {
    'delivered': 'emails_delivered',
    'bounce': 'emails_bounced',
    'open': 'emails_opened',
    'click': 'emails_clicked'
  };

  return fieldMap[eventType] || null;
}

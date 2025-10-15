import { supabaseAdmin } from '@/lib/supabase-admin';
import { qstash } from '@/lib/upstash-config';

interface ZeptoMailConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
}

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
  contentType: string;
}

interface SendEmailRequest {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  tags?: string[];
  metadata?: Record<string, any>;
  template_id?: string;
  template_data?: Record<string, any>;
}

interface ZeptoMailResponse {
  message: string;
  request_id: string;
  data?: {
    message_id: string;
  };
}

export class EmailSendingService {
  private config: ZeptoMailConfig;

  constructor(config?: ZeptoMailConfig) {
    this.config = config || {
      apiKey: process.env.ZEPTOMAIL_API_KEY || '',
      domain: process.env.ZEPTOMAIL_DOMAIN || '',
      fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || ''
    };
  }

  /**
   * Queue email for immediate sending
   */
  async queueEmail(messageId: string): Promise<void> {
    try {
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/send-email`,
        body: {
          messageId,
          action: 'send_immediate'
        },
        delay: 0
      });
    } catch (error) {
      console.error('Error queuing email:', error);
      throw new Error('Failed to queue email for sending');
    }
  }

  /**
   * Schedule email for later sending
   */
  async scheduleEmail(messageId: string, sendAt: Date): Promise<void> {
    try {
      const delay = Math.max(0, sendAt.getTime() - Date.now());
      
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/send-email`,
        body: {
          messageId,
          action: 'send_scheduled',
          sendAt: sendAt.toISOString()
        },
        delay: Math.floor(delay / 1000) // QStash expects delay in seconds
      });

      // Update message status to scheduled
      await supabaseAdmin
        .from('email_messages')
        .update({ 
          status: 'scheduled',
          scheduled_at: sendAt.toISOString()
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error scheduling email:', error);
      throw new Error('Failed to schedule email');
    }
  }

  /**
   * Send email immediately via ZeptoMail API
   */
  async sendEmail(messageId: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      // Get message from database
      const { data: message, error: messageError } = await supabaseAdmin
        .from('email_messages')
        .select(`
          *,
          email_accounts!inner(user_id),
          email_templates(subject, html_content, text_content)
        `)
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        throw new Error('Message not found');
      }

      // Check if user is in suppression list
      const suppressedEmails = await this.checkSuppressionList(
        message.email_account_id,
        message.to_emails as string[]
      );

      if (suppressedEmails.length > 0) {
        await this.updateMessageStatus(messageId, 'suppressed', {
          suppressed_emails: suppressedEmails
        });
        return { success: false, error: 'Recipients in suppression list' };
      }

      // Update status to sending
      await this.updateMessageStatus(messageId, 'sending');

      // Prepare email data for ZeptoMail
      const emailData = this.prepareZeptoMailData(message);

      // Send via ZeptoMail API
      const response = await this.callZeptoMailAPI(emailData);

      if (response.data?.message_id) {
        // Update message with external ID and sent status
        await supabaseAdmin
          .from('email_messages')
          .update({
            status: 'sent',
            external_id: response.data.message_id,
            sent_at: new Date().toISOString()
          })
          .eq('id', messageId);

        // Record sent event
        await this.recordEmailEvent(messageId, 'sent', {
          external_id: response.data.message_id,
          provider_response: response
        });

        // Update account email count
        await this.incrementEmailCount(message.email_account_id);

        return { success: true, externalId: response.data.message_id };
      } else {
        await this.updateMessageStatus(messageId, 'failed', {
          error: 'No message ID returned from provider'
        });
        return { success: false, error: 'Failed to get message ID from provider' };
      }
    } catch (error) {
      console.error('Error sending email:', error);
      
      await this.updateMessageStatus(messageId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retry failed email
   */
  async retryEmail(messageId: string, retryCount: number = 1): Promise<void> {
    const maxRetries = 3;
    
    if (retryCount > maxRetries) {
      await this.updateMessageStatus(messageId, 'failed', {
        error: 'Maximum retry attempts exceeded'
      });
      return;
    }

    // Exponential backoff: 1min, 5min, 15min
    const delays = [60, 300, 900];
    const delay = delays[retryCount - 1] || 900;

    try {
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/send-email`,
        body: {
          messageId,
          action: 'retry',
          retryCount
        },
        delay
      });
    } catch (error) {
      console.error('Error queuing retry:', error);
      throw new Error('Failed to queue email retry');
    }
  }

  /**
   * Check suppression list for recipients
   */
  private async checkSuppressionList(accountId: string, emails: string[]): Promise<string[]> {
    const { data: suppressedList } = await supabaseAdmin
      .from('email_suppression_list')
      .select('email')
      .eq('email_account_id', accountId)
      .in('email', emails);

    return suppressedList?.map(item => item.email) || [];
  }

  /**
   * Prepare email data for ZeptoMail API
   */
  private prepareZeptoMailData(message: any): any {
    return {
      from: {
        address: message.from_email,
        name: message.from_name || ''
      },
      to: (message.to_emails as string[]).map(email => ({ address: email })),
      cc: message.cc_emails ? (message.cc_emails as string[]).map(email => ({ address: email })) : undefined,
      bcc: message.bcc_emails ? (message.bcc_emails as string[]).map(email => ({ address: email })) : undefined,
      subject: message.subject,
      htmlbody: message.html_content,
      textbody: message.text_content,
      attachments: message.attachments || [],
      track_clicks: true,
      track_opens: true,
      client_reference: message.id,
      tags: message.tags || []
    };
  }

  /**
   * Call ZeptoMail API
   */
  private async callZeptoMailAPI(emailData: any): Promise<ZeptoMailResponse> {
    const response = await fetch('https://api.zeptomail.in/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Zoho-enczapikey ${this.config.apiKey}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`ZeptoMail API error: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }

  /**
   * Update message status
   */
  private async updateMessageStatus(messageId: string, status: string, metadata?: any): Promise<void> {
    const updateData: any = { status };
    
    if (metadata) {
      updateData.metadata = metadata;
    }

    await supabaseAdmin
      .from('email_messages')
      .update(updateData)
      .eq('id', messageId);
  }

  /**
   * Record email event
   */
  private async recordEmailEvent(messageId: string, eventType: string, data: any): Promise<void> {
    await supabaseAdmin
      .from('email_events')
      .insert({
        message_id: messageId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        data
      });
  }

  /**
   * Increment email count for account
   */
  private async incrementEmailCount(accountId: string): Promise<void> {
    await supabaseAdmin.rpc('increment_email_count', {
      account_id: accountId
    });
  }
}

// Alternative implementation using official ZeptoMail package
// This is an OPTIONAL approach - the current direct API approach is recommended

import { SendMailClient } from 'zeptomail';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { qstash } from '@/lib/upstash-config';

interface ZeptoMailConfig {
  apiKey: string;
  domain: string;
  fromEmail: string;
}

export class EmailSendingServiceWithPackage {
  private client: SendMailClient;
  private config: ZeptoMailConfig;

  constructor(config?: ZeptoMailConfig) {
    this.config = config || {
      apiKey: process.env.ZEPTOMAIL_API_KEY || '',
      domain: process.env.ZEPTOMAIL_DOMAIN || '',
      fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || ''
    };

    // Initialize ZeptoMail client
    this.client = new SendMailClient({
      url: "api.zeptomail.in/",
      token: this.config.apiKey
    });
  }

  /**
   * Send email using ZeptoMail package
   */
  async sendEmailWithPackage(messageId: string): Promise<{ success: boolean; externalId?: string; error?: string }> {
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

      // Prepare email data for ZeptoMail package
      const emailData = {
        from: {
          address: message.from_email,
          name: message.from_name || ''
        },
        to: (message.to_emails as string[]).map(email => ({ address: email })),
        subject: message.subject,
        htmlbody: message.html_content,
        textbody: message.text_content,
        track_clicks: true,
        track_opens: true,
        client_reference: message.id
      };

      // Send via ZeptoMail package
      const response = await this.client.sendMail(emailData);

      if (response.data && response.data.length > 0) {
        const messageId = response.data[0].message_id;
        
        // Update message with external ID and sent status
        await supabaseAdmin
          .from('email_messages')
          .update({
            status: 'sent',
            external_id: messageId,
            sent_at: new Date().toISOString()
          })
          .eq('id', message.id);

        return { success: true, externalId: messageId };
      } else {
        throw new Error('No message ID returned from ZeptoMail');
      }

    } catch (error) {
      console.error('Error sending email with ZeptoMail package:', error);
      
      // Update message status to failed
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
   * Send batch emails using ZeptoMail package
   */
  async sendBatchEmails(messageIds: string[]): Promise<{ success: boolean; results: any[] }> {
    try {
      const batchData = [];

      // Prepare batch data
      for (const messageId of messageIds) {
        const { data: message } = await supabaseAdmin
          .from('email_messages')
          .select('*')
          .eq('id', messageId)
          .single();

        if (message) {
          batchData.push({
            from: {
              address: message.from_email,
              name: message.from_name || ''
            },
            to: (message.to_emails as string[]).map(email => ({ address: email })),
            subject: message.subject,
            htmlbody: message.html_content,
            textbody: message.text_content,
            client_reference: message.id
          });
        }
      }

      // Send batch emails
      const response = await this.client.sendBatchMail(batchData);

      return { success: true, results: response.data || [] };

    } catch (error) {
      console.error('Error sending batch emails:', error);
      return { 
        success: false, 
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send template email using ZeptoMail package
   */
  async sendTemplateEmail(templateKey: string, templateData: any, recipients: string[]): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const emailData = {
        from: {
          address: this.config.fromEmail,
          name: 'Your App'
        },
        to: recipients.map(email => ({ address: email })),
        template_key: templateKey,
        template_data: templateData,
        track_clicks: true,
        track_opens: true
      };

      const response = await this.client.sendMailWithTemplate(emailData);

      if (response.data && response.data.length > 0) {
        return { success: true, externalId: response.data[0].message_id };
      } else {
        throw new Error('No message ID returned from ZeptoMail');
      }

    } catch (error) {
      console.error('Error sending template email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
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
}

// Example usage:
/*
const emailService = new EmailSendingServiceWithPackage();

// Send single email
await emailService.sendEmailWithPackage('message-id');

// Send batch emails
await emailService.sendBatchEmails(['msg1', 'msg2', 'msg3']);

// Send template email
await emailService.sendTemplateEmail('welcome-template', {
  name: 'John Doe',
  company: 'Acme Corp'
}, ['user@example.com']);
*/

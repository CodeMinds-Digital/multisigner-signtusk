import { supabaseAdmin } from '@/lib/supabase-admin';
import { BillingService } from './billing-service';
import { EmailSendingService } from './email-sending-service';
import crypto from 'crypto';

interface SMTPCredentials {
  username: string;
  password: string;
  accountId: string;
  domain?: string;
}

interface SMTPMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

interface SMTPAuthResult {
  success: boolean;
  accountId?: string;
  error?: string;
}

export class SMTPRelayService {
  private billingService: BillingService;
  private emailService: EmailSendingService;

  constructor() {
    this.billingService = new BillingService();
    this.emailService = new EmailSendingService();
  }

  /**
   * Authenticate SMTP credentials
   */
  async authenticateUser(username: string, password: string): Promise<SMTPAuthResult> {
    try {
      // Username format: api_key_id or email_account_id
      // Password: API key
      
      // Hash the password to match stored API key hash
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      // Look up API key
      const { data: apiKey, error } = await supabaseAdmin
        .from('email_api_keys')
        .select(`
          id,
          email_account_id,
          permissions,
          is_active,
          expires_at,
          email_accounts!inner(
            id,
            status,
            user_id
          )
        `)
        .eq('key_hash', passwordHash)
        .eq('is_active', true)
        .single();

      if (error || !apiKey) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if API key has expired
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return { success: false, error: 'API key expired' };
      }

      // Check if account is active
      if (apiKey.email_accounts.status !== 'active') {
        return { success: false, error: 'Account not active' };
      }

      // Check if API key has send permission
      const permissions = apiKey.permissions as any;
      if (!permissions.send) {
        return { success: false, error: 'API key does not have send permission' };
      }

      // Update last used timestamp
      await supabaseAdmin
        .from('email_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id);

      return { 
        success: true, 
        accountId: apiKey.email_account_id 
      };
    } catch (error) {
      console.error('SMTP authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Process SMTP message
   */
  async processSMTPMessage(accountId: string, message: SMTPMessage): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Check quota and billing
      const canSend = await this.billingService.canSendEmail(accountId);
      if (!canSend.canSend) {
        return { success: false, error: canSend.reason };
      }

      // Validate from address
      const fromValidation = await this.validateFromAddress(accountId, message.from);
      if (!fromValidation.valid) {
        return { success: false, error: fromValidation.error };
      }

      // Create email message record
      const { data: emailMessage, error: messageError } = await supabaseAdmin
        .from('email_messages')
        .insert({
          email_account_id: accountId,
          from_email: message.from,
          to_emails: message.to,
          cc_emails: message.cc || null,
          bcc_emails: message.bcc || null,
          subject: message.subject,
          html_content: message.html || null,
          text_content: message.text || null,
          attachments: message.attachments ? this.serializeAttachments(message.attachments) : null,
          status: 'queued',
          metadata: {
            source: 'smtp',
            received_at: new Date().toISOString()
          }
        })
        .select('id')
        .single();

      if (messageError || !emailMessage) {
        return { success: false, error: 'Failed to create message record' };
      }

      // Queue for sending
      await this.emailService.queueEmail(emailMessage.id);

      return { 
        success: true, 
        messageId: emailMessage.id 
      };
    } catch (error) {
      console.error('SMTP message processing error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Message processing failed' 
      };
    }
  }

  /**
   * Validate from address against verified domains
   */
  private async validateFromAddress(accountId: string, fromAddress: string): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      const domain = fromAddress.split('@')[1];
      if (!domain) {
        return { valid: false, error: 'Invalid from address format' };
      }

      // Check if domain is verified for this account
      const { data: verifiedDomain, error } = await supabaseAdmin
        .from('email_domains')
        .select('id, verification_status')
        .eq('email_account_id', accountId)
        .eq('domain', domain)
        .eq('verification_status', 'verified')
        .single();

      if (error || !verifiedDomain) {
        return { 
          valid: false, 
          error: `Domain ${domain} is not verified for this account` 
        };
      }

      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: 'Domain validation failed' 
      };
    }
  }

  /**
   * Serialize attachments for database storage
   */
  private serializeAttachments(attachments: SMTPMessage['attachments']): any[] {
    if (!attachments) return [];

    return attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content.toString('base64'),
      contentType: attachment.contentType,
      size: attachment.content.length
    }));
  }

  /**
   * Get SMTP configuration for account
   */
  async getSMTPConfig(accountId: string): Promise<{
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  } | null> {
    try {
      // Get account details
      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('id, status')
        .eq('id', accountId)
        .single();

      if (error || !account || account.status !== 'active') {
        return null;
      }

      // Get active API key for SMTP
      const { data: apiKey, error: keyError } = await supabaseAdmin
        .from('email_api_keys')
        .select('key_prefix, key_hash')
        .eq('email_account_id', accountId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (keyError || !apiKey) {
        return null;
      }

      return {
        host: process.env.SMTP_HOST || 'smtp.signtusk.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // Use STARTTLS
        auth: {
          user: accountId, // Use account ID as username
          pass: `${apiKey.key_prefix}${apiKey.key_hash.substring(0, 32)}` // Truncated for display
        }
      };
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      return null;
    }
  }

  /**
   * Generate SMTP credentials for account
   */
  async generateSMTPCredentials(accountId: string): Promise<SMTPCredentials | null> {
    try {
      // Get or create API key for SMTP
      const { data: existingKey } = await supabaseAdmin
        .from('email_api_keys')
        .select('id, key_prefix')
        .eq('email_account_id', accountId)
        .eq('key_name', 'SMTP Access')
        .eq('is_active', true)
        .single();

      if (existingKey) {
        // Return existing credentials
        return {
          username: accountId,
          password: 'Use your existing API key',
          accountId,
          domain: process.env.SMTP_HOST || 'smtp.signtusk.com'
        };
      }

      // Create new API key for SMTP
      const { generateAPIKey } = await import('./api-key-service');
      const { apiKey, hash } = generateAPIKey('smtp_');

      const { error } = await supabaseAdmin
        .from('email_api_keys')
        .insert({
          email_account_id: accountId,
          key_name: 'SMTP Access',
          key_hash: hash,
          key_prefix: 'smtp_',
          permissions: {
            send: true,
            templates: false,
            domains: false
          }
        });

      if (error) {
        throw new Error('Failed to create SMTP API key');
      }

      return {
        username: accountId,
        password: apiKey,
        accountId,
        domain: process.env.SMTP_HOST || 'smtp.signtusk.com'
      };
    } catch (error) {
      console.error('Error generating SMTP credentials:', error);
      return null;
    }
  }

  /**
   * Validate SMTP message format
   */
  validateMessage(message: Partial<SMTPMessage>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.from) {
      errors.push('From address is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.from)) {
      errors.push('Invalid from address format');
    }

    if (!message.to || message.to.length === 0) {
      errors.push('At least one recipient is required');
    } else {
      const invalidRecipients = message.to.filter(email => 
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
      if (invalidRecipients.length > 0) {
        errors.push(`Invalid recipient addresses: ${invalidRecipients.join(', ')}`);
      }
    }

    if (!message.subject) {
      errors.push('Subject is required');
    }

    if (!message.html && !message.text) {
      errors.push('Either HTML or text content is required');
    }

    // Check recipient limits
    const totalRecipients = (message.to?.length || 0) + 
                           (message.cc?.length || 0) + 
                           (message.bcc?.length || 0);
    
    if (totalRecipients > 100) {
      errors.push('Maximum 100 recipients per message');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

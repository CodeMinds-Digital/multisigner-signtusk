import { z } from 'zod';
import validator from 'validator';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Initialize DOMPurify for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

// Email validation schema
export const emailSchema = z.string()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .refine((email) => validator.isEmail(email), 'Invalid email format')
  .refine((email) => !email.includes('..'), 'Email cannot contain consecutive dots')
  .refine((email) => !email.startsWith('.') && !email.endsWith('.'), 'Email cannot start or end with a dot');

// Domain validation schema
export const domainSchema = z.string()
  .min(1, 'Domain is required')
  .max(253, 'Domain is too long')
  .refine((domain) => validator.isFQDN(domain), 'Invalid domain format')
  .refine((domain) => !domain.includes('..'), 'Domain cannot contain consecutive dots')
  .refine((domain) => !/[A-Z]/.test(domain), 'Domain must be lowercase');

// Email sending validation schema
export const emailSendSchema = z.object({
  from: emailSchema,
  to: z.union([
    emailSchema,
    z.array(emailSchema).min(1, 'At least one recipient required').max(50, 'Too many recipients')
  ]),
  cc: z.array(emailSchema).max(20, 'Too many CC recipients').optional(),
  bcc: z.array(emailSchema).max(20, 'Too many BCC recipients').optional(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(998, 'Subject is too long')
    .refine((subject) => !subject.includes('\n') && !subject.includes('\r'), 'Subject cannot contain line breaks'),
  html: z.string().max(2 * 1024 * 1024, 'HTML content is too large (max 2MB)').optional(),
  text: z.string().max(1 * 1024 * 1024, 'Text content is too large (max 1MB)').optional(),
  template_id: z.string().uuid('Invalid template ID').optional(),
  template_data: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string().min(1, 'Filename is required').max(255, 'Filename is too long'),
    content: z.string().min(1, 'Attachment content is required'),
    contentType: z.string().min(1, 'Content type is required').max(100, 'Content type is too long'),
    size: z.number().max(25 * 1024 * 1024, 'Attachment is too large (max 25MB)')
  })).max(10, 'Too many attachments').optional(),
  tags: z.array(z.string().max(50, 'Tag is too long')).max(10, 'Too many tags').optional(),
  metadata: z.record(z.any()).optional(),
  send_at: z.string().datetime('Invalid datetime format').optional()
}).refine((data) => {
  // Must have either subject or template_id
  return data.subject || data.template_id;
}, 'Either subject or template_id is required').refine((data) => {
  // Must have either html, text, or template_id
  return data.html || data.text || data.template_id;
}, 'Either html, text, or template_id is required');

// Template validation schema
export const templateSchema = z.object({
  name: z.string()
    .min(1, 'Template name is required')
    .max(255, 'Template name is too long')
    .refine((name) => /^[a-zA-Z0-9\s\-_]+$/.test(name), 'Template name contains invalid characters'),
  subject: z.string()
    .max(500, 'Subject is too long')
    .optional(),
  html_content: z.string()
    .max(2 * 1024 * 1024, 'HTML content is too large (max 2MB)')
    .optional(),
  text_content: z.string()
    .max(1 * 1024 * 1024, 'Text content is too large (max 1MB)')
    .optional(),
  variables: z.record(z.any()).optional()
});

// Domain setup validation schema
export const domainSetupSchema = z.object({
  domain: domainSchema,
  verification_method: z.enum(['manual', 'subdomain'], 'Invalid verification method'),
  automation_enabled: z.boolean().optional().default(false)
});

// Account creation validation schema
export const accountCreationSchema = z.object({
  account_name: z.string()
    .min(1, 'Account name is required')
    .max(255, 'Account name is too long')
    .refine((name) => /^[a-zA-Z0-9\s\-_]+$/.test(name), 'Account name contains invalid characters'),
  plan: z.enum(['free', 'pro', 'enterprise'], 'Invalid plan').optional().default('free')
});

export class InputValidator {
  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    if (!html) return '';
    
    // Configure DOMPurify for email content
    const config = {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'div', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table',
        'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'pre', 'code'
      ],
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'style', 'class', 'id', 'target',
        'width', 'height', 'border', 'cellpadding', 'cellspacing'
      ],
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
    };
    
    return purify.sanitize(html, config);
  }

  /**
   * Validate and sanitize email addresses
   */
  static validateEmails(emails: string | string[]): string[] {
    const emailArray = Array.isArray(emails) ? emails : [emails];
    const validatedEmails: string[] = [];
    
    for (const email of emailArray) {
      try {
        const cleanEmail = email.trim().toLowerCase();
        emailSchema.parse(cleanEmail);
        validatedEmails.push(cleanEmail);
      } catch (error) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }
    
    return validatedEmails;
  }

  /**
   * Validate domain name
   */
  static validateDomain(domain: string): string {
    const cleanDomain = domain.trim().toLowerCase();
    domainSchema.parse(cleanDomain);
    return cleanDomain;
  }

  /**
   * Validate email sending request
   */
  static validateEmailSend(data: any) {
    return emailSendSchema.parse(data);
  }

  /**
   * Validate template data
   */
  static validateTemplate(data: any) {
    return templateSchema.parse(data);
  }

  /**
   * Validate domain setup data
   */
  static validateDomainSetup(data: any) {
    return domainSetupSchema.parse(data);
  }

  /**
   * Validate account creation data
   */
  static validateAccountCreation(data: any) {
    return accountCreationSchema.parse(data);
  }

  /**
   * Check for suspicious content patterns
   */
  static checkSuspiciousContent(content: string): { isSuspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const suspiciousPatterns = [
      { pattern: /\b(viagra|cialis|pharmacy)\b/i, reason: 'Contains pharmaceutical terms' },
      { pattern: /\b(lottery|winner|congratulations.*prize)\b/i, reason: 'Contains lottery/prize terms' },
      { pattern: /\b(urgent.*transfer|nigerian prince|inheritance)\b/i, reason: 'Contains scam-like terms' },
      { pattern: /\b(click here|act now|limited time)\b/i, reason: 'Contains spam-like phrases' },
      { pattern: /<script|javascript:|vbscript:|onload=|onerror=/i, reason: 'Contains potentially malicious code' },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, reason: 'Contains potential credit card numbers' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Contains potential SSN' }
    ];

    for (const { pattern, reason } of suspiciousPatterns) {
      if (pattern.test(content)) {
        reasons.push(reason);
      }
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Validate attachment
   */
  static validateAttachment(attachment: any): boolean {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const maxSize = 25 * 1024 * 1024; // 25MB
    const forbiddenExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.jar'];

    if (!attachment.contentType || !allowedTypes.includes(attachment.contentType)) {
      throw new Error(`File type ${attachment.contentType} is not allowed`);
    }

    if (attachment.size > maxSize) {
      throw new Error('File size exceeds 25MB limit');
    }

    const filename = attachment.filename.toLowerCase();
    for (const ext of forbiddenExtensions) {
      if (filename.endsWith(ext)) {
        throw new Error(`File extension ${ext} is not allowed`);
      }
    }

    return true;
  }

  /**
   * Sanitize metadata object
   */
  static sanitizeMetadata(metadata: any): any {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    const sanitized: any = {};
    const maxKeys = 20;
    const maxValueLength = 1000;
    
    let keyCount = 0;
    for (const [key, value] of Object.entries(metadata)) {
      if (keyCount >= maxKeys) break;
      
      // Sanitize key
      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 50);
      if (!cleanKey) continue;
      
      // Sanitize value
      if (typeof value === 'string') {
        sanitized[cleanKey] = value.substring(0, maxValueLength);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[cleanKey] = value;
      } else {
        sanitized[cleanKey] = String(value).substring(0, maxValueLength);
      }
      
      keyCount++;
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize template variables
   */
  static sanitizeTemplateVariables(variables: any): any {
    if (!variables || typeof variables !== 'object') {
      return {};
    }

    const sanitized: any = {};
    const maxKeys = 50;
    const maxValueLength = 5000;
    
    let keyCount = 0;
    for (const [key, value] of Object.entries(variables)) {
      if (keyCount >= maxKeys) break;
      
      // Sanitize key - allow alphanumeric, underscore, dash
      const cleanKey = key.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 100);
      if (!cleanKey) continue;
      
      // Sanitize value based on type
      if (typeof value === 'string') {
        // Don't sanitize HTML here as it might be intentional in templates
        sanitized[cleanKey] = value.substring(0, maxValueLength);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[cleanKey] = value;
      } else if (Array.isArray(value)) {
        sanitized[cleanKey] = value.slice(0, 100).map(item => 
          typeof item === 'string' ? item.substring(0, 1000) : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[cleanKey] = this.sanitizeTemplateVariables(value);
      } else {
        sanitized[cleanKey] = String(value).substring(0, maxValueLength);
      }
      
      keyCount++;
    }
    
    return sanitized;
  }
}

export { InputValidator as validator };

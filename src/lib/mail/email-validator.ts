interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

interface BulkValidationResult {
  valid: string[];
  invalid: { email: string; error: string }[];
  suggestions: { email: string; suggestion: string }[];
}

export class EmailValidator {
  private static readonly COMMON_DOMAINS = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'protonmail.com', 'zoho.com', 'mail.com'
  ];

  private static readonly DISPOSABLE_DOMAINS = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com',
    'throwaway.email', 'temp-mail.org', 'getnada.com', 'maildrop.cc'
  ];

  /**
   * Validate a single email address
   */
  static validateEmail(email: string): EmailValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    // Trim whitespace
    email = email.trim().toLowerCase();

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return { 
        isValid: false, 
        error: 'Invalid email format',
        suggestions: this.generateSuggestions(email)
      };
    }

    // Check length limits
    if (email.length > 254) {
      return { isValid: false, error: 'Email address too long (max 254 characters)' };
    }

    const [localPart, domain] = email.split('@');

    // Validate local part
    if (localPart.length > 64) {
      return { isValid: false, error: 'Local part too long (max 64 characters)' };
    }

    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { isValid: false, error: 'Local part cannot start or end with a dot' };
    }

    if (localPart.includes('..')) {
      return { isValid: false, error: 'Local part cannot contain consecutive dots' };
    }

    // Validate domain
    if (domain.length > 253) {
      return { isValid: false, error: 'Domain too long (max 253 characters)' };
    }

    if (domain.startsWith('-') || domain.endsWith('-')) {
      return { isValid: false, error: 'Domain cannot start or end with a hyphen' };
    }

    // Check for disposable email
    if (this.DISPOSABLE_DOMAINS.includes(domain)) {
      return { 
        isValid: false, 
        error: 'Disposable email addresses are not allowed',
        suggestions: this.COMMON_DOMAINS.slice(0, 3).map(d => `${localPart}@${d}`)
      };
    }

    // Check for common typos
    const suggestions = this.generateSuggestions(email);
    if (suggestions.length > 0) {
      return {
        isValid: true, // Still valid, but has suggestions
        suggestions
      };
    }

    return { isValid: true };
  }

  /**
   * Validate multiple email addresses
   */
  static validateBulk(emails: string[]): BulkValidationResult {
    const valid: string[] = [];
    const invalid: { email: string; error: string }[] = [];
    const suggestions: { email: string; suggestion: string }[] = [];

    for (const email of emails) {
      const result = this.validateEmail(email);
      
      if (result.isValid) {
        valid.push(email.trim().toLowerCase());
        
        // Add suggestions even for valid emails
        if (result.suggestions && result.suggestions.length > 0) {
          suggestions.push({
            email: email.trim().toLowerCase(),
            suggestion: result.suggestions[0]
          });
        }
      } else {
        invalid.push({
          email: email.trim().toLowerCase(),
          error: result.error || 'Invalid email'
        });
        
        // Add suggestions for invalid emails too
        if (result.suggestions && result.suggestions.length > 0) {
          suggestions.push({
            email: email.trim().toLowerCase(),
            suggestion: result.suggestions[0]
          });
        }
      }
    }

    return { valid, invalid, suggestions };
  }

  /**
   * Check if email domain exists (basic DNS check simulation)
   */
  static async checkDomainExists(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      if (!domain) return false;

      // In a real implementation, you would do a DNS MX record lookup
      // For now, we'll just check against known domains and common patterns
      
      // Check if it's a common domain
      if (this.COMMON_DOMAINS.includes(domain)) {
        return true;
      }

      // Check if it has a valid TLD pattern
      const tldRegex = /\.[a-z]{2,}$/i;
      return tldRegex.test(domain);
    } catch {
      return false;
    }
  }

  /**
   * Generate suggestions for common typos
   */
  private static generateSuggestions(email: string): string[] {
    const suggestions: string[] = [];
    
    if (!email.includes('@')) return suggestions;
    
    const [localPart, domain] = email.split('@');
    
    // Common domain typos
    const domainSuggestions: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com'
    };

    if (domainSuggestions[domain]) {
      suggestions.push(`${localPart}@${domainSuggestions[domain]}`);
    }

    // Check for missing TLD
    if (!domain.includes('.')) {
      suggestions.push(`${localPart}@${domain}.com`);
    }

    // Check for common TLD typos
    if (domain.endsWith('.co')) {
      suggestions.push(`${localPart}@${domain}m`);
    }

    return suggestions;
  }

  /**
   * Normalize email address
   */
  static normalizeEmail(email: string): string {
    if (!email) return email;
    
    email = email.trim().toLowerCase();
    const [localPart, domain] = email.split('@');
    
    if (!localPart || !domain) return email;
    
    // Gmail-specific normalization
    if (domain === 'gmail.com') {
      // Remove dots and everything after +
      const normalizedLocal = localPart.replace(/\./g, '').split('+')[0];
      return `${normalizedLocal}@${domain}`;
    }
    
    return email;
  }

  /**
   * Extract emails from text
   */
  static extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;
    const matches = text.match(emailRegex) || [];
    
    // Remove duplicates and validate
    const uniqueEmails = [...new Set(matches)];
    return uniqueEmails.filter(email => this.validateEmail(email).isValid);
  }

  /**
   * Check if email is from a business domain (not personal)
   */
  static isBusinessEmail(email: string): boolean {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Personal email providers
    const personalDomains = [
      ...this.COMMON_DOMAINS,
      'live.com', 'msn.com', 'ymail.com', 'rocketmail.com'
    ];
    
    return !personalDomains.includes(domain);
  }
}

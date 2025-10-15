import crypto from 'crypto';

export interface DNSRecord {
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface DNSInstructions {
  domain: string;
  method: string;
  records: DNSRecord[];
  steps: string[];
  commonProviders: {
    name: string;
    instructions: string;
    helpUrl?: string;
  }[];
  verificationSteps: string[];
  troubleshooting: {
    issue: string;
    solution: string;
  }[];
}

export class DNSInstructionsService {
  generateInstructions(domain: any): DNSInstructions {
    const domainName = domain.domain;
    const verificationToken = domain.verification_token || this.generateToken();

    const records: DNSRecord[] = [
      // Verification TXT record
      {
        type: 'TXT',
        name: `_emailverify.${domainName}`,
        value: `v=emailverify1; token=${verificationToken}`,
        ttl: 300
      },
      // SPF record
      {
        type: 'TXT',
        name: domainName,
        value: 'v=spf1 include:zeptomail.in ~all',
        ttl: 300
      },
      // DKIM record
      {
        type: 'TXT',
        name: `zeptomail._domainkey.${domainName}`,
        value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7vKqvkjhwsa9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9QIDAQAB',
        ttl: 300
      },
      // DMARC record
      {
        type: 'TXT',
        name: `_dmarc.${domainName}`,
        value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com',
        ttl: 300
      }
    ];

    const steps = [
      '1. Log in to your domain registrar or DNS hosting provider',
      `2. Navigate to the DNS management section for ${domainName}`,
      '3. Add each of the DNS records listed below',
      '4. Save your changes',
      '5. Wait 5-60 minutes for DNS propagation',
      '6. Return here and click "Verify Domain" to complete setup'
    ];

    const commonProviders = [
      {
        name: 'Cloudflare',
        instructions: 'Go to DNS tab → Add record → Select record type → Enter name and content',
        helpUrl: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/'
      },
      {
        name: 'GoDaddy',
        instructions: 'Go to DNS Management → Add → Select record type → Enter host and value',
        helpUrl: 'https://www.godaddy.com/help/add-a-txt-record-19232'
      },
      {
        name: 'Namecheap',
        instructions: 'Go to Advanced DNS → Add New Record → Select record type → Enter host and value',
        helpUrl: 'https://www.namecheap.com/support/knowledgebase/article.aspx/317/2237/how-do-i-add-txtspfdkimdmarc-records-for-my-domain/'
      },
      {
        name: 'Route53 (AWS)',
        instructions: 'Go to Hosted Zones → Select domain → Create Record → Select record type → Enter name and value',
        helpUrl: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html'
      },
      {
        name: 'Google Domains',
        instructions: 'Go to DNS → Custom records → Create new record → Select record type → Enter data',
        helpUrl: 'https://support.google.com/domains/answer/3290350'
      },
      {
        name: 'DigitalOcean',
        instructions: 'Go to Networking → Domains → Select domain → Add record → Select record type → Enter details',
        helpUrl: 'https://docs.digitalocean.com/products/networking/dns/how-to/manage-records/'
      }
    ];

    const verificationSteps = [
      'All DNS records have been added correctly',
      'DNS changes have propagated (usually 5-60 minutes)',
      'No conflicting records exist for the same names',
      'TTL values are set appropriately (300 seconds recommended)'
    ];

    const troubleshooting = [
      {
        issue: 'Verification fails after adding records',
        solution: 'Wait longer for DNS propagation (up to 24 hours) or check for typos in record values'
      },
      {
        issue: 'SPF record conflicts with existing record',
        solution: 'Merge the SPF records: combine "include:zeptomail.in" with your existing SPF record'
      },
      {
        issue: 'Cannot add TXT record with underscore',
        solution: 'Some providers require quotes around record names with underscores'
      },
      {
        issue: 'DKIM record too long',
        solution: 'Some providers require splitting long TXT records into multiple quoted strings'
      },
      {
        issue: 'Domain verification stuck in pending',
        solution: 'Check that all records are added correctly and try manual verification'
      }
    ];

    return {
      domain: domainName,
      method: domain.verification_method || 'manual',
      records,
      steps,
      commonProviders,
      verificationSteps,
      troubleshooting
    };
  }

  generateSubdomainInstructions(domain: any): DNSInstructions {
    const domainName = domain.domain;
    const subdomain = domain.subdomain || `mail.${domainName}`;

    const records: DNSRecord[] = [
      {
        type: 'CNAME',
        name: subdomain,
        value: 'mailservice.yourdomain.com',
        ttl: 300
      }
    ];

    const steps = [
      '1. Log in to your domain registrar or DNS hosting provider',
      `2. Navigate to the DNS management section for ${domainName}`,
      '3. Add the CNAME record listed below',
      '4. Save your changes',
      '5. Wait 5-10 minutes for DNS propagation',
      '6. Return here and click "Verify Domain" to complete setup'
    ];

    const commonProviders = [
      {
        name: 'Cloudflare',
        instructions: 'Go to DNS tab → Add record → Select CNAME → Enter name and target',
        helpUrl: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/'
      },
      {
        name: 'GoDaddy',
        instructions: 'Go to DNS Management → Add → CNAME → Enter host and points to',
        helpUrl: 'https://www.godaddy.com/help/add-a-cname-record-19236'
      },
      {
        name: 'Namecheap',
        instructions: 'Go to Advanced DNS → Add New Record → CNAME → Enter host and value',
        helpUrl: 'https://www.namecheap.com/support/knowledgebase/article.aspx/9646/2237/how-to-create-a-cname-record-for-your-domain/'
      }
    ];

    const verificationSteps = [
      'CNAME record has been added correctly',
      'DNS changes have propagated (usually 5-10 minutes)',
      'CNAME points to the correct target domain'
    ];

    const troubleshooting = [
      {
        issue: 'CNAME verification fails',
        solution: 'Ensure the CNAME record points exactly to "mailservice.yourdomain.com"'
      },
      {
        issue: 'Cannot add CNAME for subdomain',
        solution: 'Make sure you\'re adding the full subdomain name, not just "mail"'
      },
      {
        issue: 'Conflicting A record exists',
        solution: 'Remove any existing A records for the same subdomain before adding CNAME'
      }
    ];

    return {
      domain: domainName,
      method: 'subdomain',
      records,
      steps,
      commonProviders,
      verificationSteps,
      troubleshooting
    };
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  formatRecordForProvider(record: DNSRecord, provider: string): string {
    switch (provider.toLowerCase()) {
      case 'cloudflare':
        return `Type: ${record.type}, Name: ${record.name}, Content: ${record.value}, TTL: ${record.ttl}`;

      case 'godaddy':
        return `Type: ${record.type}, Host: ${record.name.replace(/\.[^.]+\.[^.]+$/, '')}, Value: ${record.value}, TTL: ${record.ttl}`;

      case 'namecheap':
        return `Type: ${record.type}, Host: ${record.name.replace(/\.[^.]+\.[^.]+$/, '')}, Value: ${record.value}, TTL: ${record.ttl}`;

      case 'route53':
        return `Type: ${record.type}, Name: ${record.name}, Value: ${record.value}, TTL: ${record.ttl}`;

      default:
        return `${record.type} ${record.name} ${record.value} (TTL: ${record.ttl})`;
    }
  }

  validateDNSRecord(record: DNSRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate record type
    const validTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV'];
    if (!validTypes.includes(record.type)) {
      errors.push(`Invalid record type: ${record.type}`);
    }

    // Validate name
    if (!record.name || record.name.trim() === '') {
      errors.push('Record name is required');
    }

    // Validate value
    if (!record.value || record.value.trim() === '') {
      errors.push('Record value is required');
    }

    // Validate TTL
    if (record.ttl < 60 || record.ttl > 86400) {
      errors.push('TTL must be between 60 and 86400 seconds');
    }

    // Type-specific validations
    if (record.type === 'TXT' && record.value.length > 255) {
      errors.push('TXT record value too long (max 255 characters per string)');
    }

    if (record.type === 'CNAME' && record.name.includes('.') && !record.name.endsWith('.')) {
      // CNAME names should be fully qualified or relative
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

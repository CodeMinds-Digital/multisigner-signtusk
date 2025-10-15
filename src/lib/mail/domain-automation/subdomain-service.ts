export interface SubdomainConfig {
  userDomain: string;
  userId: string;
}

export interface CNAMERecord {
  type: 'CNAME';
  name: string;
  value: string;
  ttl: number;
}

export interface SubdomainSetupResult {
  success: boolean;
  subdomain?: string;
  cnameRecord?: CNAMERecord;
  userInstructions?: {
    record: CNAMERecord;
    message: string;
    steps: string[];
  };
  error?: string;
}

export class SubdomainDelegationService {
  private controlledDomain = process.env.MAIL_SERVICE_DOMAIN || 'mailservice.yourdomain.com';

  async setupSubdomainEmail(userDomain: string, userId: string): Promise<SubdomainSetupResult> {
    try {
      // Generate unique subdomain
      const subdomain = `mail-${userId.slice(0, 8)}.${userDomain}`;
      
      // User only needs to add one CNAME record
      const cnameRecord: CNAMERecord = {
        type: 'CNAME',
        name: subdomain,
        value: this.controlledDomain,
        ttl: 300
      };

      // We control the email-service domain zone
      // and can automatically set up all required records
      await this.setupControlledZoneRecords(subdomain);

      const userInstructions = {
        record: cnameRecord,
        message: `Add this CNAME record to delegate ${subdomain} to our email service`,
        steps: [
          '1. Log in to your domain registrar or DNS provider',
          `2. Navigate to DNS management for ${userDomain}`,
          '3. Add a new CNAME record with the details below',
          '4. Wait 5-10 minutes for DNS propagation',
          '5. Click "Verify Domain" to complete setup'
        ]
      };

      return {
        success: true,
        subdomain,
        cnameRecord,
        userInstructions
      };
    } catch (error) {
      console.error('Subdomain setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async setupControlledZoneRecords(subdomain: string): Promise<void> {
    // Automatically create all required records in our controlled zone
    const records = [
      {
        type: 'TXT',
        name: subdomain,
        content: 'v=spf1 include:zeptomail.in ~all',
        ttl: 300
      },
      {
        type: 'TXT',
        name: `zeptomail._domainkey.${subdomain}`,
        content: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7vKqvkjhwsa9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9FrXmjdaLe8CcMOxWblvTGnQs+wjQjuvpgZQFE9RsWvQjGj8j9QIDAQAB',
        ttl: 300
      },
      {
        type: 'TXT',
        name: `_dmarc.${subdomain}`,
        content: 'v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@yourdomain.com',
        ttl: 300
      },
      {
        type: 'TXT',
        name: `_emailverify.${subdomain}`,
        content: `v=emailverify1; token=${this.generateVerificationToken()}`,
        ttl: 300
      }
    ];

    // Create records in our controlled DNS zone
    for (const record of records) {
      await this.createDNSRecord(record);
    }
  }

  private async createDNSRecord(record: any): Promise<void> {
    // This would integrate with your DNS provider (Cloudflare, Route53, etc.)
    // For now, we'll simulate the record creation
    console.log(`Creating DNS record in controlled zone:`, record);
    
    // In a real implementation, you would:
    // 1. Use your DNS provider's API to create the record
    // 2. Store the record ID for later cleanup
    // 3. Handle errors and retries
    
    // Example with Cloudflare:
    /*
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CONTROLLED_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });
    */
  }

  async verifySubdomainSetup(subdomain: string): Promise<{
    verified: boolean;
    cnameVerified: boolean;
    recordsVerified: boolean;
    error?: string;
  }> {
    try {
      // Check if CNAME is pointing to our controlled domain
      const cnameVerified = await this.checkCNAMERecord(subdomain);
      
      // Check if our controlled zone records are accessible
      const recordsVerified = await this.checkControlledZoneRecords(subdomain);

      return {
        verified: cnameVerified && recordsVerified,
        cnameVerified,
        recordsVerified
      };
    } catch (error) {
      return {
        verified: false,
        cnameVerified: false,
        recordsVerified: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async checkCNAMERecord(subdomain: string): Promise<boolean> {
    try {
      const dns = require('dns').promises;
      const records = await dns.resolveCname(subdomain);
      return records.some((record: string) => record === this.controlledDomain);
    } catch (error) {
      console.error(`CNAME check failed for ${subdomain}:`, error);
      return false;
    }
  }

  private async checkControlledZoneRecords(subdomain: string): Promise<boolean> {
    try {
      const dns = require('dns').promises;
      
      // Check if SPF record is accessible through the CNAME
      const txtRecords = await dns.resolveTxt(subdomain);
      const spfExists = txtRecords.some((record: string[]) => 
        record.join('').includes('v=spf1') && record.join('').includes('zeptomail.in')
      );

      // Check DKIM record
      const dkimRecords = await dns.resolveTxt(`zeptomail._domainkey.${subdomain}`);
      const dkimExists = dkimRecords.length > 0;

      return spfExists && dkimExists;
    } catch (error) {
      console.error(`Controlled zone records check failed for ${subdomain}:`, error);
      return false;
    }
  }

  private generateVerificationToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  async cleanupSubdomainRecords(subdomain: string): Promise<void> {
    try {
      // Clean up records in our controlled zone
      console.log(`Cleaning up subdomain records for ${subdomain}`);
      
      // In a real implementation, you would:
      // 1. Query for records matching the subdomain
      // 2. Delete each record using your DNS provider's API
      // 3. Handle errors gracefully
      
      // Example cleanup logic:
      /*
      const recordsToDelete = [
        subdomain,
        `zeptomail._domainkey.${subdomain}`,
        `_dmarc.${subdomain}`,
        `_emailverify.${subdomain}`
      ];

      for (const recordName of recordsToDelete) {
        await this.deleteDNSRecord(recordName);
      }
      */
    } catch (error) {
      console.error('Error during subdomain cleanup:', error);
    }
  }

  generateDNSInstructions(userDomain: string, subdomain: string): {
    title: string;
    description: string;
    record: CNAMERecord;
    steps: string[];
    commonProviders: { name: string; instructions: string }[];
  } {
    const cnameRecord: CNAMERecord = {
      type: 'CNAME',
      name: subdomain,
      value: this.controlledDomain,
      ttl: 300
    };

    return {
      title: 'Subdomain Email Setup',
      description: `Set up email sending for ${userDomain} using subdomain delegation. This is the easiest method requiring only one DNS record.`,
      record: cnameRecord,
      steps: [
        'Log in to your domain registrar or DNS provider',
        `Navigate to DNS management for ${userDomain}`,
        'Add a new CNAME record with the details below',
        'Save the DNS changes',
        'Wait 5-10 minutes for DNS propagation',
        'Return here and click "Verify Domain"'
      ],
      commonProviders: [
        {
          name: 'Cloudflare',
          instructions: 'Go to DNS tab → Add record → Select CNAME → Enter name and target'
        },
        {
          name: 'GoDaddy',
          instructions: 'Go to DNS Management → Add → CNAME → Enter host and points to'
        },
        {
          name: 'Namecheap',
          instructions: 'Go to Advanced DNS → Add New Record → CNAME → Enter host and value'
        },
        {
          name: 'Route53',
          instructions: 'Go to Hosted Zones → Select domain → Create Record → CNAME → Enter name and value'
        }
      ]
    };
  }
}

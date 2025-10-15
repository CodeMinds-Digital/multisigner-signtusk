import dns from 'dns/promises';

interface DomainRecord {
  domain: string;
  verification_method: string;
  verification_token?: string;
  subdomain?: string;
}

interface VerificationResult {
  verified: boolean;
  txtVerified: boolean;
  dkimVerified: boolean;
  spfVerified: boolean;
  dmarcVerified: boolean;
  errors: string[];
  nextCheck?: Date;
}

interface DNSRecord {
  type: string;
  name: string;
  value: string;
  verified: boolean;
  error?: string;
}

export class DomainVerificationService {
  private readonly dnsTimeout = 5000; // 5 seconds

  /**
   * Verify domain DNS records
   */
  async verifyDomain(domain: DomainRecord): Promise<VerificationResult> {
    const results: VerificationResult = {
      verified: false,
      txtVerified: false,
      dkimVerified: false,
      spfVerified: false,
      dmarcVerified: false,
      errors: []
    };

    try {
      // Verify based on verification method
      switch (domain.verification_method) {
        case 'subdomain':
          return await this.verifySubdomainDelegation(domain, results);
        case 'manual':
        default:
          return await this.verifyManualSetup(domain, results);
      }
    } catch (error) {
      results.errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return results;
    }
  }

  /**
   * Verify subdomain delegation setup
   */
  private async verifySubdomainDelegation(domain: DomainRecord, results: VerificationResult): Promise<VerificationResult> {
    if (!domain.subdomain) {
      results.errors.push('Subdomain not configured');
      return results;
    }

    try {
      // Check CNAME record for subdomain delegation
      const cnameRecords = await this.lookupDNS(domain.subdomain, 'CNAME');
      const expectedCname = `mail.signtusk.com`; // Your mail service domain
      
      const validCname = cnameRecords.some(record => 
        record.toLowerCase().includes('signtusk.com') || 
        record.toLowerCase().includes('mail.signtusk.com')
      );

      if (validCname) {
        results.txtVerified = true;
        results.dkimVerified = true;
        results.spfVerified = true;
        results.dmarcVerified = true;
        results.verified = true;
      } else {
        results.errors.push(`CNAME record not found or incorrect for ${domain.subdomain}`);
        results.nextCheck = new Date(Date.now() + 5 * 60 * 1000); // Check again in 5 minutes
      }
    } catch (error) {
      results.errors.push(`CNAME verification failed: ${error instanceof Error ? error.message : 'DNS lookup failed'}`);
      results.nextCheck = new Date(Date.now() + 5 * 60 * 1000);
    }

    return results;
  }

  /**
   * Verify manual DNS setup
   */
  private async verifyManualSetup(domain: DomainRecord, results: VerificationResult): Promise<VerificationResult> {
    const verificationPromises = [
      this.verifyTXTRecord(domain),
      this.verifyDKIMRecord(domain),
      this.verifySPFRecord(domain),
      this.verifyDMARCRecord(domain)
    ];

    const [txtResult, dkimResult, spfResult, dmarcResult] = await Promise.allSettled(verificationPromises);

    // Process TXT verification
    if (txtResult.status === 'fulfilled' && txtResult.value.verified) {
      results.txtVerified = true;
    } else {
      results.errors.push(txtResult.status === 'fulfilled' ? txtResult.value.error || 'TXT verification failed' : 'TXT verification error');
    }

    // Process DKIM verification
    if (dkimResult.status === 'fulfilled' && dkimResult.value.verified) {
      results.dkimVerified = true;
    } else {
      results.errors.push(dkimResult.status === 'fulfilled' ? dkimResult.value.error || 'DKIM verification failed' : 'DKIM verification error');
    }

    // Process SPF verification
    if (spfResult.status === 'fulfilled' && spfResult.value.verified) {
      results.spfVerified = true;
    } else {
      results.errors.push(spfResult.status === 'fulfilled' ? spfResult.value.error || 'SPF verification failed' : 'SPF verification error');
    }

    // Process DMARC verification
    if (dmarcResult.status === 'fulfilled' && dmarcResult.value.verified) {
      results.dmarcVerified = true;
    } else {
      results.errors.push(dmarcResult.status === 'fulfilled' ? dmarcResult.value.error || 'DMARC verification failed' : 'DMARC verification error');
    }

    // Domain is verified if TXT and at least SPF are verified
    results.verified = results.txtVerified && results.spfVerified;

    // If not fully verified, schedule next check
    if (!results.verified) {
      results.nextCheck = new Date(Date.now() + 10 * 60 * 1000); // Check again in 10 minutes
    }

    return results;
  }

  /**
   * Verify TXT record for domain verification
   */
  private async verifyTXTRecord(domain: DomainRecord): Promise<{ verified: boolean; error?: string }> {
    if (!domain.verification_token) {
      return { verified: false, error: 'No verification token provided' };
    }

    try {
      const txtRecords = await this.lookupDNS(domain.domain, 'TXT');
      const expectedValue = `signtusk-verification=${domain.verification_token}`;
      
      const verified = txtRecords.some(record => 
        record.includes(domain.verification_token) || 
        record === expectedValue
      );

      return { 
        verified, 
        error: verified ? undefined : `TXT record not found. Expected: ${expectedValue}` 
      };
    } catch (error) {
      return { 
        verified: false, 
        error: `TXT lookup failed: ${error instanceof Error ? error.message : 'DNS error'}` 
      };
    }
  }

  /**
   * Verify DKIM record
   */
  private async verifyDKIMRecord(domain: DomainRecord): Promise<{ verified: boolean; error?: string }> {
    try {
      const dkimSelector = 'signtusk'; // Your DKIM selector
      const dkimDomain = `${dkimSelector}._domainkey.${domain.domain}`;
      
      const txtRecords = await this.lookupDNS(dkimDomain, 'TXT');
      
      const verified = txtRecords.some(record => 
        record.includes('v=DKIM1') && record.includes('k=rsa')
      );

      return { 
        verified, 
        error: verified ? undefined : `DKIM record not found at ${dkimDomain}` 
      };
    } catch (error) {
      return { 
        verified: false, 
        error: `DKIM lookup failed: ${error instanceof Error ? error.message : 'DNS error'}` 
      };
    }
  }

  /**
   * Verify SPF record
   */
  private async verifySPFRecord(domain: DomainRecord): Promise<{ verified: boolean; error?: string }> {
    try {
      const txtRecords = await this.lookupDNS(domain.domain, 'TXT');
      
      const spfRecord = txtRecords.find(record => record.startsWith('v=spf1'));
      
      if (!spfRecord) {
        return { verified: false, error: 'SPF record not found' };
      }

      const verified = spfRecord.includes('include:zeptomail.in') || 
                      spfRecord.includes('include:signtusk.com');

      return { 
        verified, 
        error: verified ? undefined : 'SPF record does not include required domains' 
      };
    } catch (error) {
      return { 
        verified: false, 
        error: `SPF lookup failed: ${error instanceof Error ? error.message : 'DNS error'}` 
      };
    }
  }

  /**
   * Verify DMARC record
   */
  private async verifyDMARCRecord(domain: DomainRecord): Promise<{ verified: boolean; error?: string }> {
    try {
      const dmarcDomain = `_dmarc.${domain.domain}`;
      const txtRecords = await this.lookupDNS(dmarcDomain, 'TXT');
      
      const verified = txtRecords.some(record => 
        record.startsWith('v=DMARC1')
      );

      return { 
        verified, 
        error: verified ? undefined : `DMARC record not found at ${dmarcDomain}` 
      };
    } catch (error) {
      return { 
        verified: false, 
        error: `DMARC lookup failed: ${error instanceof Error ? error.message : 'DNS error'}` 
      };
    }
  }

  /**
   * Perform DNS lookup with timeout
   */
  private async lookupDNS(domain: string, type: 'TXT' | 'CNAME' | 'MX'): Promise<string[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.dnsTimeout);

    try {
      let records: string[] = [];

      switch (type) {
        case 'TXT':
          const txtRecords = await dns.resolveTxt(domain);
          records = txtRecords.flat();
          break;
        case 'CNAME':
          try {
            const cnameRecords = await dns.resolveCname(domain);
            records = cnameRecords;
          } catch (error) {
            // CNAME might not exist, that's okay
            records = [];
          }
          break;
        case 'MX':
          const mxRecords = await dns.resolveMx(domain);
          records = mxRecords.map(mx => mx.exchange);
          break;
      }

      clearTimeout(timeoutId);
      return records;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get all DNS records for a domain (for debugging)
   */
  async getAllDNSRecords(domain: string): Promise<DNSRecord[]> {
    const records: DNSRecord[] = [];

    // TXT records
    try {
      const txtRecords = await this.lookupDNS(domain, 'TXT');
      txtRecords.forEach(value => {
        records.push({
          type: 'TXT',
          name: domain,
          value,
          verified: true
        });
      });
    } catch (error) {
      records.push({
        type: 'TXT',
        name: domain,
        value: '',
        verified: false,
        error: error instanceof Error ? error.message : 'Lookup failed'
      });
    }

    // CNAME records
    try {
      const cnameRecords = await this.lookupDNS(domain, 'CNAME');
      cnameRecords.forEach(value => {
        records.push({
          type: 'CNAME',
          name: domain,
          value,
          verified: true
        });
      });
    } catch (error) {
      // CNAME errors are expected for root domains
    }

    // MX records
    try {
      const mxRecords = await this.lookupDNS(domain, 'MX');
      mxRecords.forEach(value => {
        records.push({
          type: 'MX',
          name: domain,
          value,
          verified: true
        });
      });
    } catch (error) {
      records.push({
        type: 'MX',
        name: domain,
        value: '',
        verified: false,
        error: error instanceof Error ? error.message : 'Lookup failed'
      });
    }

    return records;
  }
}

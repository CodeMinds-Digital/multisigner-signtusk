import { supabaseAdmin } from '@/lib/supabase-admin';

interface DomainRecord {
  id: string;
  domain: string;
  automation_enabled: boolean;
  automation_provider: string | null;
  automation_config: any;
}

interface CleanupResult {
  success: boolean;
  recordsRemoved: number;
  errors: string[];
}

export class DomainCleanupService {
  /**
   * Clean up DNS records for a domain
   */
  async cleanupDomainRecords(domain: DomainRecord): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      recordsRemoved: 0,
      errors: []
    };

    if (!domain.automation_enabled || !domain.automation_provider) {
      return result; // Nothing to clean up
    }

    try {
      switch (domain.automation_provider) {
        case 'cloudflare':
          return await this.cleanupCloudflareRecords(domain, result);
        case 'route53':
          return await this.cleanupRoute53Records(domain, result);
        case 'subdomain':
          return await this.cleanupSubdomainRecords(domain, result);
        default:
          result.errors.push(`Unknown automation provider: ${domain.automation_provider}`);
          result.success = false;
          return result;
      }
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Clean up Cloudflare DNS records
   */
  private async cleanupCloudflareRecords(domain: DomainRecord, result: CleanupResult): Promise<CleanupResult> {
    try {
      const config = this.decryptConfig(domain.automation_config);
      if (!config.apiToken || !config.recordIds) {
        result.errors.push('Missing Cloudflare configuration');
        result.success = false;
        return result;
      }

      const { CloudflareAutomationService } = await import('./domain-automation/cloudflare-service');
      const cloudflareService = new CloudflareAutomationService();

      // Remove DNS records
      const recordIds = Array.isArray(config.recordIds) ? config.recordIds : [];
      
      for (const recordId of recordIds) {
        try {
          await cloudflareService.deleteRecord(config.apiToken, config.zoneId, recordId);
          result.recordsRemoved++;
        } catch (error) {
          result.errors.push(`Failed to delete Cloudflare record ${recordId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Clear automation config
      await this.clearAutomationConfig(domain.id);

    } catch (error) {
      result.errors.push(`Cloudflare cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Clean up Route53 DNS records
   */
  private async cleanupRoute53Records(domain: DomainRecord, result: CleanupResult): Promise<CleanupResult> {
    try {
      const config = this.decryptConfig(domain.automation_config);
      if (!config.accessKeyId || !config.secretAccessKey) {
        result.errors.push('Missing Route53 configuration');
        result.success = false;
        return result;
      }

      const { Route53AutomationService } = await import('./domain-automation/route53-service');
      const route53Service = new Route53AutomationService({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region || 'us-east-1'
      });

      // Remove DNS records
      const cleanupResult = await route53Service.cleanupDomainRecords(domain.domain);
      
      if (cleanupResult.success) {
        result.recordsRemoved = cleanupResult.recordsRemoved || 0;
      } else {
        result.errors.push(cleanupResult.error || 'Route53 cleanup failed');
        result.success = false;
      }

      // Clear automation config
      await this.clearAutomationConfig(domain.id);

    } catch (error) {
      result.errors.push(`Route53 cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Clean up subdomain delegation
   */
  private async cleanupSubdomainRecords(domain: DomainRecord, result: CleanupResult): Promise<CleanupResult> {
    try {
      // For subdomain delegation, we just need to clear the config
      // The user needs to manually remove the CNAME record
      await this.clearAutomationConfig(domain.id);
      
      // Add informational message
      result.errors.push('Please manually remove the CNAME record for subdomain delegation');
      
    } catch (error) {
      result.errors.push(`Subdomain cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Clear automation configuration from database
   */
  private async clearAutomationConfig(domainId: string): Promise<void> {
    await supabaseAdmin
      .from('email_domains')
      .update({
        automation_enabled: false,
        automation_provider: null,
        automation_config: null,
        setup_progress: {
          step: 'manual',
          percentage: 0,
          message: 'Automation removed - manual setup required'
        }
      })
      .eq('id', domainId);
  }

  /**
   * Decrypt automation configuration
   */
  private decryptConfig(encryptedConfig: any): any {
    try {
      // In a real implementation, you would decrypt the config here
      // For now, we'll assume it's already decrypted or use a simple approach
      if (typeof encryptedConfig === 'string') {
        return JSON.parse(encryptedConfig);
      }
      return encryptedConfig || {};
    } catch (error) {
      console.error('Error decrypting config:', error);
      return {};
    }
  }

  /**
   * Clean up all domains for an account (when account is deleted)
   */
  async cleanupAccountDomains(accountId: string): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      recordsRemoved: 0,
      errors: []
    };

    try {
      // Get all domains for the account
      const { data: domains, error } = await supabaseAdmin
        .from('email_domains')
        .select('*')
        .eq('email_account_id', accountId)
        .eq('automation_enabled', true);

      if (error) {
        result.errors.push(`Failed to fetch domains: ${error.message}`);
        result.success = false;
        return result;
      }

      if (!domains || domains.length === 0) {
        return result; // No domains to clean up
      }

      // Clean up each domain
      for (const domain of domains) {
        try {
          const domainResult = await this.cleanupDomainRecords(domain);
          result.recordsRemoved += domainResult.recordsRemoved;
          result.errors.push(...domainResult.errors);
          
          if (!domainResult.success) {
            result.success = false;
          }
        } catch (error) {
          result.errors.push(`Failed to cleanup domain ${domain.domain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.success = false;
        }
      }

    } catch (error) {
      result.errors.push(`Account cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup(domain: DomainRecord): Promise<{ verified: boolean; remainingRecords: string[] }> {
    const remainingRecords: string[] = [];

    try {
      // Import domain verification service to check DNS
      const { DomainVerificationService } = await import('./domain-verification-service');
      const verificationService = new DomainVerificationService();

      // Get all DNS records for the domain
      const dnsRecords = await verificationService.getAllDNSRecords(domain.domain);

      // Check for remaining SignTusk-related records
      const signTuskRecords = dnsRecords.filter(record => 
        record.value.includes('signtusk') || 
        record.value.includes('zeptomail') ||
        record.name.includes('_domainkey')
      );

      signTuskRecords.forEach(record => {
        remainingRecords.push(`${record.type} ${record.name}: ${record.value}`);
      });

      return {
        verified: remainingRecords.length === 0,
        remainingRecords
      };
    } catch (error) {
      console.error('Cleanup verification error:', error);
      return {
        verified: false,
        remainingRecords: ['Unable to verify cleanup - DNS lookup failed']
      };
    }
  }

  /**
   * Schedule cleanup job for later execution
   */
  async scheduleCleanup(domainId: string, delay: number = 0): Promise<void> {
    try {
      const { qstash } = await import('@/lib/upstash-config');
      
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/cleanup-domain`,
        body: {
          domainId,
          action: 'cleanup'
        },
        delay
      });
    } catch (error) {
      console.error('Error scheduling cleanup job:', error);
      throw new Error('Failed to schedule cleanup job');
    }
  }
}

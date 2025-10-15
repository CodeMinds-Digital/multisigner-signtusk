import { qstash } from '@/lib/upstash-config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redis } from '@/lib/upstash-config';

interface DomainVerificationJobPayload {
  domainId: string;
  action: 'verify' | 'retry' | 'delayed';
  retryCount?: number;
  maxRetries?: number;
}

export class DomainVerificationJob {
  private readonly maxRetries = 10; // Check for up to 24 hours
  private readonly retryDelays = [
    60,    // 1 minute
    300,   // 5 minutes
    900,   // 15 minutes
    1800,  // 30 minutes
    3600,  // 1 hour
    7200,  // 2 hours
    14400, // 4 hours
    28800, // 8 hours
    43200, // 12 hours
    86400  // 24 hours
  ];

  /**
   * Schedule domain verification
   */
  async scheduleDomainVerification(
    domainId: string, 
    type: 'immediate' | 'delayed' = 'immediate'
  ): Promise<void> {
    const delay = type === 'immediate' ? 0 : 60; // 1 minute delay for 'delayed'

    try {
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/verify-domain`,
        body: {
          domainId,
          action: type === 'immediate' ? 'verify' : 'delayed',
          retryCount: 0,
          maxRetries: this.maxRetries
        } as DomainVerificationJobPayload,
        delay
      });

      // Update domain status
      await supabaseAdmin
        .from('email_domains')
        .update({
          verification_status: 'verifying',
          last_verification_attempt: new Date().toISOString(),
          setup_progress: {
            step: 'verifying',
            percentage: 10,
            message: 'Verification job scheduled'
          }
        })
        .eq('id', domainId);

      // Cache verification status
      await redis.setex(`domain_verification:${domainId}`, 3600, 'verifying');
    } catch (error) {
      console.error('Error scheduling domain verification:', error);
      throw new Error('Failed to schedule domain verification');
    }
  }

  /**
   * Process domain verification
   */
  async processDomainVerification(payload: DomainVerificationJobPayload): Promise<{
    success: boolean;
    verified: boolean;
    shouldRetry: boolean;
    nextRetryDelay?: number;
    error?: string;
  }> {
    const { domainId, retryCount = 0 } = payload;

    try {
      // Get domain details
      const { data: domain, error: domainError } = await supabaseAdmin
        .from('email_domains')
        .select('*')
        .eq('id', domainId)
        .single();

      if (domainError || !domain) {
        return {
          success: false,
          verified: false,
          shouldRetry: false,
          error: 'Domain not found'
        };
      }

      // Import and use domain verification service
      const { DomainVerificationService } = await import('../domain-verification-service');
      const verificationService = new DomainVerificationService();

      // Perform verification
      const result = await verificationService.verifyDomain(domain);

      // Update domain status based on result
      if (result.verified) {
        await this.markDomainVerified(domainId);
        await redis.del(`domain_verification:${domainId}`);
        
        return {
          success: true,
          verified: true,
          shouldRetry: false
        };
      } else {
        // Check if we should retry
        const shouldRetry = retryCount < this.maxRetries;
        
        if (shouldRetry) {
          const nextRetryDelay = this.retryDelays[retryCount] || this.retryDelays[this.retryDelays.length - 1];
          
          // Update progress
          const progress = Math.min(90, 10 + (retryCount / this.maxRetries) * 80);
          await supabaseAdmin
            .from('email_domains')
            .update({
              verification_attempts: retryCount + 1,
              last_verification_attempt: new Date().toISOString(),
              setup_progress: {
                step: 'verifying',
                percentage: progress,
                message: `Verification attempt ${retryCount + 1}/${this.maxRetries}. Next check in ${this.formatDelay(nextRetryDelay)}`
              }
            })
            .eq('id', domainId);

          // Schedule retry
          await this.scheduleRetry(domainId, retryCount + 1, nextRetryDelay);

          return {
            success: true,
            verified: false,
            shouldRetry: true,
            nextRetryDelay
          };
        } else {
          // Max retries reached, mark as failed
          await this.markDomainFailed(domainId, 'Verification timeout - DNS records not found after 24 hours');
          await redis.del(`domain_verification:${domainId}`);

          return {
            success: true,
            verified: false,
            shouldRetry: false,
            error: 'Verification timeout'
          };
        }
      }
    } catch (error) {
      console.error('Domain verification processing error:', error);
      
      // Update domain with error
      await supabaseAdmin
        .from('email_domains')
        .update({
          setup_progress: {
            step: 'failed',
            percentage: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        })
        .eq('id', domainId);

      return {
        success: false,
        verified: false,
        shouldRetry: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Schedule verification retry
   */
  private async scheduleRetry(domainId: string, retryCount: number, delay: number): Promise<void> {
    await qstash.publishJSON({
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/verify-domain`,
      body: {
        domainId,
        action: 'retry',
        retryCount,
        maxRetries: this.maxRetries
      } as DomainVerificationJobPayload,
      delay
    });
  }

  /**
   * Mark domain as verified
   */
  private async markDomainVerified(domainId: string): Promise<void> {
    await supabaseAdmin
      .from('email_domains')
      .update({
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        setup_progress: {
          step: 'completed',
          percentage: 100,
          message: 'Domain successfully verified and ready for sending'
        }
      })
      .eq('id', domainId);
  }

  /**
   * Mark domain as failed
   */
  private async markDomainFailed(domainId: string, error: string): Promise<void> {
    await supabaseAdmin
      .from('email_domains')
      .update({
        verification_status: 'failed',
        setup_progress: {
          step: 'failed',
          percentage: 0,
          error
        }
      })
      .eq('id', domainId);
  }

  /**
   * Format delay in human readable format
   */
  private formatDelay(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  }

  /**
   * Get verification status from cache
   */
  async getVerificationStatus(domainId: string): Promise<string | null> {
    try {
      return await redis.get(`domain_verification:${domainId}`);
    } catch (error) {
      console.error('Error getting verification status from cache:', error);
      return null;
    }
  }

  /**
   * Cancel domain verification
   */
  async cancelDomainVerification(domainId: string): Promise<void> {
    try {
      // Clear cache
      await redis.del(`domain_verification:${domainId}`);
      
      // Update domain status
      await supabaseAdmin
        .from('email_domains')
        .update({
          verification_status: 'pending',
          setup_progress: {
            step: 'cancelled',
            percentage: 0,
            message: 'Verification cancelled by user'
          }
        })
        .eq('id', domainId);
    } catch (error) {
      console.error('Error cancelling domain verification:', error);
      throw new Error('Failed to cancel domain verification');
    }
  }
}

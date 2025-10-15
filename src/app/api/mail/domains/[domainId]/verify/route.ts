import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

// POST /api/mail/domains/[domainId]/verify - Manually trigger domain verification
export async function POST(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;

    // Get domain with account verification
    const { data: domain, error } = await supabaseAdmin
      .from('email_domains')
      .select(`
        *,
        email_accounts!inner(user_id)
      `)
      .eq('id', domainId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check if domain is already verified
    if (domain.verification_status === 'verified') {
      return NextResponse.json({
        success: true,
        message: 'Domain is already verified',
        verification: {
          verified: true,
          txt_verification: domain.txt_verification_status,
          dkim_verification: domain.dkim_status,
          spf_verification: domain.spf_status,
          dmarc_verification: domain.dmarc_status
        }
      });
    }

    // Update verification status to 'verifying'
    await supabase
      .from('email_domains')
      .update({
        verification_status: 'verifying',
        last_verification_attempt: new Date().toISOString(),
        verification_attempts: domain.verification_attempts + 1,
        setup_progress: { step: 'verifying', percentage: 80 }
      })
      .eq('id', domainId);

    // Perform verification based on method
    let verificationResult;
    try {
      const { DomainVerificationService } = await import('@/lib/mail/domain-verification-service');
      const verificationService = new DomainVerificationService();

      verificationResult = await verificationService.verifyDomain(domain);
    } catch (verificationError) {
      console.error('Domain verification failed:', verificationError);

      // Update status to failed
      await supabase
        .from('email_domains')
        .update({
          verification_status: 'failed',
          setup_progress: {
            step: 'failed',
            percentage: 0,
            error: verificationError.message
          }
        })
        .eq('id', domainId);

      return NextResponse.json({
        success: false,
        error: 'Verification failed',
        details: verificationError.message
      }, { status: 400 });
    }

    // Update domain with verification results
    const updateData: any = {
      txt_verification_status: verificationResult.txtVerification,
      dkim_status: verificationResult.dkimVerification,
      spf_status: verificationResult.spfVerification,
      dmarc_status: verificationResult.dmarcVerification
    };

    if (verificationResult.verified) {
      updateData.verification_status = 'verified';
      updateData.verified_at = new Date().toISOString();
      updateData.setup_progress = { step: 'completed', percentage: 100 };
    } else {
      updateData.verification_status = 'pending';
      updateData.setup_progress = {
        step: 'waiting_propagation',
        percentage: 60,
        message: 'DNS records found but not fully propagated. Will retry automatically.'
      };
    }

    const { data: updatedDomain, error: updateError } = await supabase
      .from('email_domains')
      .update(updateData)
      .eq('id', domainId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating domain verification status:', updateError);
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 });
    }

    // If not fully verified, schedule retry
    if (!verificationResult.verified && verificationResult.nextCheck) {
      try {
        const { DomainVerificationJob } = await import('@/lib/mail/jobs/domain-verification-job');
        const verificationJob = new DomainVerificationJob();
        await verificationJob.scheduleDomainVerification(domainId, 'delayed');
      } catch (jobError) {
        console.error('Error scheduling verification retry:', jobError);
        // Continue anyway
      }
    }

    return NextResponse.json({
      success: verificationResult.verified,
      domain: updatedDomain,
      verification: {
        verified: verificationResult.verified,
        txt_verification: verificationResult.txtVerification,
        dkim_verification: verificationResult.dkimVerification,
        spf_verification: verificationResult.spfVerification,
        dmarc_verification: verificationResult.dmarcVerification,
        next_check: verificationResult.nextCheck
      }
    });
  } catch (error) {
    console.error('Error in POST /api/mail/domains/[domainId]/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/mail/domains/[domainId]/verify - Get verification status and instructions
export async function GET(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;

    // Get domain with account verification
    const { data: domain, error } = await supabaseAdmin
      .from('email_domains')
      .select(`
        *,
        email_accounts!inner(user_id)
      `)
      .eq('id', domainId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Generate DNS instructions based on verification method
    const { DNSInstructionsService } = await import('@/lib/mail/dns-instructions-service');
    const instructionsService = new DNSInstructionsService();
    const instructions = instructionsService.generateInstructions(domain);

    return NextResponse.json({
      domain,
      instructions,
      verification_status: {
        verified: domain.verification_status === 'verified',
        txt_verification: domain.txt_verification_status,
        dkim_verification: domain.dkim_status,
        spf_verification: domain.spf_status,
        dmarc_verification: domain.dmarc_status
      }
    });
  } catch (error) {
    console.error('Error in GET /api/mail/domains/[domainId]/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

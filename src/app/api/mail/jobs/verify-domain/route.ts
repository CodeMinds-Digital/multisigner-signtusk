import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { DomainVerificationJob } from '@/lib/mail/jobs/domain-verification-job';

interface DomainVerificationJobPayload {
  domainId: string;
  action: 'verify' | 'retry' | 'delayed';
  retryCount?: number;
  maxRetries?: number;
}

async function handler(request: NextRequest) {
  try {
    const payload: DomainVerificationJobPayload = await request.json();
    const { domainId, action, retryCount = 0 } = payload;

    console.log(`Processing domain verification job: ${action} for domain ${domainId}, retry ${retryCount}`);

    const verificationJob = new DomainVerificationJob();
    const result = await verificationJob.processDomainVerification(payload);

    return NextResponse.json({
      success: result.success,
      verified: result.verified,
      shouldRetry: result.shouldRetry,
      nextRetryDelay: result.nextRetryDelay,
      error: result.error,
      retryCount
    });
  } catch (error) {
    console.error('Domain verification job error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);

import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { EmailSendingService } from '@/lib/mail/email-sending-service';

interface EmailJobPayload {
  messageId: string;
  action: 'send_immediate' | 'send_scheduled' | 'retry';
  retryCount?: number;
  sendAt?: string;
}

async function handler(request: NextRequest) {
  try {
    const payload: EmailJobPayload = await request.json();
    const { messageId, action, retryCount = 0 } = payload;

    console.log(`Processing email job: ${action} for message ${messageId}`);

    const emailService = new EmailSendingService();

    switch (action) {
      case 'send_immediate':
      case 'send_scheduled':
        const result = await emailService.sendEmail(messageId);
        
        if (!result.success && retryCount < 3) {
          // Queue for retry
          await emailService.retryEmail(messageId, retryCount + 1);
        }
        
        return NextResponse.json({ 
          success: result.success, 
          externalId: result.externalId,
          error: result.error 
        });

      case 'retry':
        const retryResult = await emailService.sendEmail(messageId);
        
        if (!retryResult.success && retryCount < 3) {
          // Queue for another retry
          await emailService.retryEmail(messageId, retryCount + 1);
        }
        
        return NextResponse.json({ 
          success: retryResult.success, 
          externalId: retryResult.externalId,
          error: retryResult.error,
          retryCount 
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Email job processing error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);

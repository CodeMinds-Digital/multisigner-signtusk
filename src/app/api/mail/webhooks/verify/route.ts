import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { webhook_url, secret } = body;

    if (!webhook_url || !secret) {
      return NextResponse.json({ 
        error: 'Missing webhook_url or secret' 
      }, { status: 400 });
    }

    // Generate test payload
    const testPayload = {
      events: [{
        event: 'test',
        email: 'test@example.com',
        timestamp: Math.floor(Date.now() / 1000).toString(),
        message_id: 'test_message_id',
        client_reference: 'test_reference'
      }]
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = `${timestamp}.${JSON.stringify(testPayload)}`;
    
    // Generate signature
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Send test webhook
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ZeptoMail-Signature': signature,
        'X-ZeptoMail-Timestamp': timestamp,
        'User-Agent': 'SignTusk-Mail-Webhook-Test/1.0'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      response: responseText,
      test_payload: testPayload,
      signature,
      timestamp
    });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Webhook verification failed' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return webhook configuration info
    return NextResponse.json({
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/webhooks/zeptomail`,
      required_headers: [
        'X-ZeptoMail-Signature',
        'X-ZeptoMail-Timestamp'
      ],
      supported_events: [
        'sent',
        'delivered', 
        'bounce',
        'complaint',
        'open',
        'click',
        'unsubscribe',
        'reject'
      ],
      signature_method: 'HMAC-SHA256',
      payload_format: 'JSON'
    });
  } catch (error) {
    console.error('Webhook info error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get webhook info' 
    }, { status: 500 });
  }
}

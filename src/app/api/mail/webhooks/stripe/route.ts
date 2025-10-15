import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { BillingService } from '@/lib/mail/billing-service';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log(`Processing Stripe webhook: ${event.type}`);

    // Handle the event
    const billingService = new BillingService();
    await billingService.handleWebhook(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Webhook processing failed' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { BillingService } from '@/lib/mail/billing-service';

// GET /api/mail/billing - Get billing information
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account_id' }, { status: 400 });
    }

    // Verify user owns the account
    const { data: account, error } = await supabaseAdmin
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const billingService = new BillingService();
    
    // Get current usage
    const usage = await billingService.calculateUsage(accountId);
    
    // Get available plans
    const plans = billingService.getPlans();
    
    // Get current plan details
    const currentPlan = billingService.getPlan(account.plan);

    return NextResponse.json({
      account: {
        id: account.id,
        plan: account.plan,
        monthly_quota: account.monthly_quota,
        emails_sent_this_month: account.emails_sent_this_month,
        subscription_status: account.subscription_status,
        stripe_customer_id: account.stripe_customer_id
      },
      usage,
      current_plan: currentPlan,
      available_plans: plans
    });
  } catch (error) {
    console.error('Billing info error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get billing info' 
    }, { status: 500 });
  }
}

// POST /api/mail/billing - Create subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id, plan_id } = body;

    if (!account_id || !plan_id) {
      return NextResponse.json({ 
        error: 'Missing account_id or plan_id' 
      }, { status: 400 });
    }

    // Verify user owns the account
    const { data: account, error } = await supabaseAdmin
      .from('email_accounts')
      .select('id, user_id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const billingService = new BillingService();
    
    // Validate plan
    const plan = billingService.getPlan(plan_id);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (plan_id === 'free') {
      // Downgrade to free plan
      await supabaseAdmin
        .from('email_accounts')
        .update({
          plan: 'free',
          monthly_quota: 3000
        })
        .eq('id', account_id);

      return NextResponse.json({ success: true, plan: 'free' });
    }

    // Create subscription for paid plan
    const result = await billingService.createSubscription(account_id, plan_id);

    return NextResponse.json({
      success: true,
      subscription_id: result.subscriptionId,
      client_secret: result.clientSecret
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create subscription' 
    }, { status: 500 });
  }
}

// DELETE /api/mail/billing - Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account_id' }, { status: 400 });
    }

    // Verify user owns the account
    const { data: account, error } = await supabaseAdmin
      .from('email_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const billingService = new BillingService();
    await billingService.cancelSubscription(accountId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
    }, { status: 500 });
  }
}

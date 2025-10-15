import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface EmailPlan {
  id: string;
  name: string;
  monthlyQuota: number;
  pricePerEmail: number;
  stripePriceId: string;
  features: string[];
}

interface UsageData {
  emailsSent: number;
  quota: number;
  overage: number;
  cost: number;
}

export class BillingService {
  private stripe: Stripe;
  
  // Email plans configuration
  private readonly plans: Record<string, EmailPlan> = {
    free: {
      id: 'free',
      name: 'Free',
      monthlyQuota: 3000,
      pricePerEmail: 0,
      stripePriceId: '',
      features: ['3,000 emails/month', 'Basic templates', 'Email analytics']
    },
    starter: {
      id: 'starter',
      name: 'Starter',
      monthlyQuota: 10000,
      pricePerEmail: 0.001, // $0.001 per email
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
      features: ['10,000 emails/month', 'Advanced templates', 'Priority support', 'Custom domains']
    },
    professional: {
      id: 'professional',
      name: 'Professional',
      monthlyQuota: 50000,
      pricePerEmail: 0.0008, // $0.0008 per email
      stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || '',
      features: ['50,000 emails/month', 'All templates', 'API access', 'Webhooks', 'Analytics']
    },
    enterprise: {
      id: 'enterprise',
      name: 'Enterprise',
      monthlyQuota: 500000,
      pricePerEmail: 0.0005, // $0.0005 per email
      stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
      features: ['500,000 emails/month', 'Dedicated IP', 'Custom integrations', 'SLA']
    }
  };

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-06-20'
    });
  }

  /**
   * Get available email plans
   */
  getPlans(): EmailPlan[] {
    return Object.values(this.plans);
  }

  /**
   * Get specific plan details
   */
  getPlan(planId: string): EmailPlan | null {
    return this.plans[planId] || null;
  }

  /**
   * Create Stripe customer for email account
   */
  async createCustomer(accountId: string, userEmail: string, userName?: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        name: userName,
        metadata: {
          email_account_id: accountId,
          service: 'mail'
        }
      });

      // Update email account with Stripe customer ID
      await supabaseAdmin
        .from('email_accounts')
        .update({ stripe_customer_id: customer.id })
        .eq('id', accountId);

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create billing customer');
    }
  }

  /**
   * Create subscription for email plan
   */
  async createSubscription(accountId: string, planId: string): Promise<{
    subscriptionId: string;
    clientSecret?: string;
  }> {
    try {
      const plan = this.getPlan(planId);
      if (!plan || planId === 'free') {
        throw new Error('Invalid plan or free plan selected');
      }

      // Get email account with customer ID
      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('stripe_customer_id, user_id')
        .eq('id', accountId)
        .single();

      if (error || !account) {
        throw new Error('Email account not found');
      }

      let customerId = account.stripe_customer_id;

      // Create customer if doesn't exist
      if (!customerId) {
        // Get user details
        const { data: user } = await supabaseAdmin
          .from('user_profiles')
          .select('email, first_name, last_name')
          .eq('id', account.user_id)
          .single();

        const userName = user ? `${user.first_name} ${user.last_name}`.trim() : undefined;
        customerId = await this.createCustomer(accountId, user?.email || '', userName);
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: plan.stripePriceId
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          email_account_id: accountId,
          plan_id: planId
        }
      });

      // Update email account with subscription details
      await supabaseAdmin
        .from('email_accounts')
        .update({
          plan: planId,
          monthly_quota: plan.monthlyQuota,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status
        })
        .eq('id', accountId);

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent?.client_secret
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(accountId: string): Promise<void> {
    try {
      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('stripe_subscription_id')
        .eq('id', accountId)
        .single();

      if (error || !account?.stripe_subscription_id) {
        throw new Error('Subscription not found');
      }

      // Cancel at period end
      await this.stripe.subscriptions.update(account.stripe_subscription_id, {
        cancel_at_period_end: true
      });

      // Update account status
      await supabaseAdmin
        .from('email_accounts')
        .update({
          subscription_status: 'canceling'
        })
        .eq('id', accountId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Calculate usage and billing for current month
   */
  async calculateUsage(accountId: string): Promise<UsageData> {
    try {
      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('plan, monthly_quota, emails_sent_this_month')
        .eq('id', accountId)
        .single();

      if (error || !account) {
        throw new Error('Email account not found');
      }

      const plan = this.getPlan(account.plan);
      const emailsSent = account.emails_sent_this_month || 0;
      const quota = account.monthly_quota || 0;
      const overage = Math.max(0, emailsSent - quota);

      let cost = 0;
      if (plan && plan.pricePerEmail > 0) {
        // Calculate overage cost
        cost = overage * plan.pricePerEmail;
      }

      return {
        emailsSent,
        quota,
        overage,
        cost
      };
    } catch (error) {
      console.error('Error calculating usage:', error);
      throw new Error('Failed to calculate usage');
    }
  }

  /**
   * Create usage-based invoice for overages
   */
  async createUsageInvoice(accountId: string): Promise<string | null> {
    try {
      const usage = await this.calculateUsage(accountId);
      
      if (usage.overage === 0 || usage.cost === 0) {
        return null; // No overage to bill
      }

      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('stripe_customer_id')
        .eq('id', accountId)
        .single();

      if (error || !account?.stripe_customer_id) {
        throw new Error('Customer not found');
      }

      // Create invoice item for overage
      await this.stripe.invoiceItems.create({
        customer: account.stripe_customer_id,
        amount: Math.round(usage.cost * 100), // Convert to cents
        currency: 'usd',
        description: `Email overage: ${usage.overage} emails`,
        metadata: {
          email_account_id: accountId,
          overage_emails: usage.overage.toString(),
          billing_period: new Date().toISOString().slice(0, 7) // YYYY-MM
        }
      });

      // Create and finalize invoice
      const invoice = await this.stripe.invoices.create({
        customer: account.stripe_customer_id,
        auto_advance: true
      });

      await this.stripe.invoices.finalizeInvoice(invoice.id);

      return invoice.id;
    } catch (error) {
      console.error('Error creating usage invoice:', error);
      throw new Error('Failed to create usage invoice');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle subscription changes
   */
  private async handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
    const accountId = subscription.metadata.email_account_id;
    if (!accountId) return;

    const planId = subscription.status === 'active' ? 
      subscription.metadata.plan_id || 'free' : 'free';

    const plan = this.getPlan(planId);

    await supabaseAdmin
      .from('email_accounts')
      .update({
        plan: planId,
        monthly_quota: plan?.monthlyQuota || 3000,
        subscription_status: subscription.status
      })
      .eq('id', accountId);
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    
    // Find account by customer ID
    const { data: account } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (account) {
      // Reset email count for new billing period if this is a subscription invoice
      if (invoice.subscription) {
        await supabaseAdmin
          .from('email_accounts')
          .update({ emails_sent_this_month: 0 })
          .eq('id', account.id);
      }
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    
    // Find account by customer ID
    const { data: account } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (account) {
      // Could implement account suspension logic here
      console.log(`Payment failed for account ${account.id}`);
    }
  }

  /**
   * Check if account can send emails (quota enforcement)
   */
  async canSendEmail(accountId: string): Promise<{ canSend: boolean; reason?: string }> {
    try {
      const { data: account, error } = await supabaseAdmin
        .from('email_accounts')
        .select('plan, monthly_quota, emails_sent_this_month, status, subscription_status')
        .eq('id', accountId)
        .single();

      if (error || !account) {
        return { canSend: false, reason: 'Account not found' };
      }

      if (account.status !== 'active') {
        return { canSend: false, reason: 'Account is not active' };
      }

      if (account.subscription_status === 'past_due') {
        return { canSend: false, reason: 'Payment is past due' };
      }

      const emailsSent = account.emails_sent_this_month || 0;
      const quota = account.monthly_quota || 0;

      if (emailsSent >= quota) {
        const plan = this.getPlan(account.plan);
        if (!plan || plan.pricePerEmail === 0) {
          return { canSend: false, reason: 'Monthly quota exceeded' };
        }
        // Allow overage for paid plans
      }

      return { canSend: true };
    } catch (error) {
      console.error('Error checking send permission:', error);
      return { canSend: false, reason: 'Error checking quota' };
    }
  }
}

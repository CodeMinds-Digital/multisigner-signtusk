import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import crypto from 'crypto';

// GET /api/mail/accounts - Get user's email account
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's email account with related data
    const { data: emailAccount, error } = await supabaseAdmin
      .from('email_accounts')
      .select(`
        *,
        email_domains:email_domains(count),
        email_templates:email_templates(count),
        email_messages:email_messages(count)
      `)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching email account:', error);
      return NextResponse.json({ error: 'Failed to fetch email account' }, { status: 500 });
    }

    // If no account exists, return 404 (will trigger account creation on frontend)
    if (!emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Calculate additional stats
    const { data: verifiedDomains } = await supabaseAdmin
      .from('email_domains')
      .select('id')
      .eq('email_account_id', emailAccount.id)
      .eq('verification_status', 'verified');

    const { data: recentMessages } = await supabaseAdmin
      .from('email_messages')
      .select('status')
      .eq('email_account_id', emailAccount.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // Calculate delivery rate
    const totalRecent = recentMessages?.length || 0;
    const deliveredRecent = recentMessages?.filter(m => m.status === 'delivered').length || 0;
    const deliveryRate = totalRecent > 0 ? (deliveredRecent / totalRecent) * 100 : 0;

    const enrichedAccount = {
      ...emailAccount,
      verified_domains_count: verifiedDomains?.length || 0,
      delivery_rate: Math.round(deliveryRate * 10) / 10,
      recent_messages_count: totalRecent
    };

    return NextResponse.json(enrichedAccount);
  } catch (error) {
    console.error('Error in GET /api/mail/accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mail/accounts - Create email account
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_name, plan = 'free' } = body;

    if (!account_name) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }

    // Check if user already has an email account
    const { data: existingAccount } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingAccount) {
      return NextResponse.json({ error: 'User already has an email account' }, { status: 400 });
    }

    // Create email account
    const { data: emailAccount, error } = await supabaseAdmin
      .from('email_accounts')
      .insert({
        user_id: user.id,
        account_name,
        plan,
        monthly_quota: plan === 'free' ? 3000 : plan === 'pro' ? 50000 : 300000,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email account:', error);
      return NextResponse.json({ error: 'Failed to create email account' }, { status: 500 });
    }

    // Generate secure API key
    const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;

    console.log('Email account created successfully:', {
      userId: user.id,
      emailAccountId: emailAccount.id,
      accountName: account_name,
      plan
    });



    return NextResponse.json({
      ...emailAccount,
      api_key: apiKey // Return the API key only once during creation
    });
  } catch (error) {
    console.error('Error in POST /api/mail/accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/mail/accounts - Update email account
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_name, plan } = body;

    // Get user's email account
    const { data: emailAccount, error: fetchError } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Update account
    const updateData: any = {};
    if (account_name) updateData.account_name = account_name;
    if (plan) {
      updateData.plan = plan;
      // Update quota based on plan
      updateData.monthly_quota = plan === 'free' ? 3000 :
        plan === 'starter' ? 50000 :
          plan === 'growth' ? 300000 :
            plan === 'scale' ? 1500000 :
              updateData.monthly_quota; // Keep existing for enterprise
    }

    const { data: updatedAccount, error } = await supabase
      .from('email_accounts')
      .update(updateData)
      .eq('id', emailAccount.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email account:', error);
      return NextResponse.json({ error: 'Failed to update email account' }, { status: 500 });
    }

    return NextResponse.json({ account: updatedAccount });
  } catch (error) {
    console.error('Error in PUT /api/mail/accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mail/accounts - Delete email account
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's email account
    const { data: emailAccount, error: fetchError } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (fetchError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Delete account (cascade will handle related records)
    const { error } = await supabase
      .from('email_accounts')
      .delete()
      .eq('id', emailAccount.id);

    if (error) {
      console.error('Error deleting email account:', error);
      return NextResponse.json({ error: 'Failed to delete email account' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/mail/accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

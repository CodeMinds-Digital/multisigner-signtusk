import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { qstash } from '@/lib/upstash-config';

// POST /api/mail/domains/verify - Verify domain DNS records
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain_id } = await request.json();

    if (!domain_id) {
      return NextResponse.json({ error: 'Domain ID is required' }, { status: 400 });
    }

    // Get user's email account
    const { data: emailAccount, error: accountError } = await supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (accountError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Get domain
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('email_domains')
      .select('*')
      .eq('id', domain_id)
      .eq('email_account_id', emailAccount.id)
      .single();

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Update domain status to verifying
    await supabaseAdmin
      .from('email_domains')
      .update({ 
        verification_status: 'verifying',
        last_verification_attempt: new Date().toISOString()
      })
      .eq('id', domain_id);

    // Queue domain verification job
    try {
      await qstash.publishJSON({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mail/jobs/verify-domain`,
        body: {
          domainId: domain_id,
          action: 'verify_dns'
        },
        delay: 5 // 5 second delay to allow DNS propagation
      });

      return NextResponse.json({
        success: true,
        message: 'Domain verification started',
        domain_id,
        status: 'verifying'
      });
    } catch (queueError) {
      console.error('Error queuing domain verification:', queueError);
      
      // Reset status back to pending
      await supabaseAdmin
        .from('email_domains')
        .update({ verification_status: 'pending' })
        .eq('id', domain_id);

      return NextResponse.json({
        error: 'Failed to start domain verification'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/mail/domains/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

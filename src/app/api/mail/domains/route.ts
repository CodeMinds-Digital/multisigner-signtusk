import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

// GET /api/mail/domains - Get user's email domains
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get domains
    const { data: domains, error } = await supabaseAdmin
      .from('email_domains')
      .select('*')
      .eq('email_account_id', emailAccount.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching domains:', error);
      return NextResponse.json({ error: 'Failed to fetch domains' }, { status: 500 });
    }

    return NextResponse.json({ domains: domains || [] });
  } catch (error) {
    console.error('Error in GET /api/mail/domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/mail/domains - Add new domain
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { domain, verification_method = 'subdomain' } = body;

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
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

    // Check if domain already exists
    const { data: existingDomain } = await supabaseAdmin
      .from('email_domains')
      .select('id')
      .eq('email_account_id', emailAccount.id)
      .eq('domain', domain)
      .single();

    if (existingDomain) {
      return NextResponse.json({ error: 'Domain already exists' }, { status: 400 });
    }

    // Generate verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create domain record
    const domainData: any = {
      email_account_id: emailAccount.id,
      domain,
      verification_method,
      verification_token: verificationToken,
      setup_progress: { step: 'initializing', percentage: 0 }
    };

    // Handle subdomain method
    if (verification_method === 'subdomain') {
      const userId = user.id.slice(0, 8);
      domainData.subdomain = `mail-${userId}.${domain}`;
      domainData.automation_enabled = true;
    }

    const { data: newDomain, error } = await supabaseAdmin
      .from('email_domains')
      .insert(domainData)
      .select()
      .single();

    if (error) {
      console.error('Error creating domain:', error);
      return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
    }

    // Start domain setup process based on method
    try {
      const { DomainSetupService } = await import('@/lib/mail/domain-setup-service');
      const setupService = new DomainSetupService();

      // Start async setup process
      setupService.initiateDomainSetup(newDomain.id, newDomain.verification_method);
    } catch (setupError) {
      console.error('Error starting domain setup:', setupError);
      // Continue anyway, user can retry setup later
    }

    return NextResponse.json({ domain: newDomain });
  } catch (error) {
    console.error('Error in POST /api/mail/domains:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

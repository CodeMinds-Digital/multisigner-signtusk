import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { EmailValidator } from '@/lib/mail/email-validator';

// POST /api/mail/test - Test email functionality
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { test_type, email, domain } = await request.json();

    switch (test_type) {
      case 'validate_email':
        return testEmailValidation(email);
      
      case 'check_domain':
        return testDomainCheck(domain);
      
      case 'send_test_email':
        return testEmailSending(user.id, email);
      
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/mail/test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Test email validation
 */
async function testEmailValidation(email: string) {
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const validation = EmailValidator.validateEmail(email);
  const normalized = EmailValidator.normalizeEmail(email);
  const isBusinessEmail = EmailValidator.isBusinessEmail(email);
  const domainExists = await EmailValidator.checkDomainExists(email);

  return NextResponse.json({
    test_type: 'validate_email',
    email,
    validation,
    normalized,
    is_business_email: isBusinessEmail,
    domain_exists: domainExists
  });
}

/**
 * Test domain verification
 */
async function testDomainCheck(domain: string) {
  if (!domain) {
    return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  }

  // Check if domain exists in our system
  const { data: existingDomain } = await supabaseAdmin
    .from('email_domains')
    .select('*')
    .eq('domain', domain)
    .single();

  // Generate DNS records that would be needed
  const dnsRecords = [
    {
      type: 'TXT',
      name: `_dmarc.${domain}`,
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@signtusk.com'
    },
    {
      type: 'TXT',
      name: domain,
      value: `v=spf1 include:zeptomail.in ~all`
    },
    {
      type: 'CNAME',
      name: `zeptomail._domainkey.${domain}`,
      value: 'zeptomail.dkim.zoho.com'
    }
  ];

  return NextResponse.json({
    test_type: 'check_domain',
    domain,
    exists_in_system: !!existingDomain,
    domain_info: existingDomain,
    required_dns_records: dnsRecords
  });
}

/**
 * Test email sending (dry run)
 */
async function testEmailSending(userId: string, toEmail: string) {
  if (!toEmail) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // Get user's email account
  const { data: emailAccount, error: accountError } = await supabaseAdmin
    .from('email_accounts')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (accountError || !emailAccount) {
    return NextResponse.json({ 
      test_type: 'send_test_email',
      success: false,
      error: 'Email account not found. Please create an email account first.'
    });
  }

  // Check quota
  const quotaCheck = {
    current_usage: emailAccount.emails_sent_this_month,
    monthly_quota: emailAccount.monthly_quota,
    remaining: emailAccount.monthly_quota - emailAccount.emails_sent_this_month,
    can_send: emailAccount.emails_sent_this_month < emailAccount.monthly_quota
  };

  // Validate email
  const emailValidation = EmailValidator.validateEmail(toEmail);

  // Check if we have any verified domains
  const { data: verifiedDomains } = await supabaseAdmin
    .from('email_domains')
    .select('domain, verification_status')
    .eq('email_account_id', emailAccount.id)
    .eq('verification_status', 'verified');

  // Check suppression list
  const { data: suppressedEmails } = await supabaseAdmin
    .from('email_suppression_list')
    .select('email, reason')
    .eq('email_account_id', emailAccount.id)
    .eq('email', toEmail);

  const testResult = {
    test_type: 'send_test_email',
    account_status: {
      account_id: emailAccount.id,
      account_name: emailAccount.account_name,
      plan: emailAccount.plan,
      status: emailAccount.status
    },
    quota_check: quotaCheck,
    email_validation: emailValidation,
    verified_domains: verifiedDomains || [],
    suppression_check: {
      is_suppressed: !!suppressedEmails?.length,
      suppression_reason: suppressedEmails?.[0]?.reason
    },
    can_send: quotaCheck.can_send && 
              emailValidation.isValid && 
              (verifiedDomains?.length || 0) > 0 && 
              !suppressedEmails?.length,
    recommendations: []
  };

  // Add recommendations
  if (!quotaCheck.can_send) {
    testResult.recommendations.push('Upgrade your plan to increase email quota');
  }

  if (!emailValidation.isValid) {
    testResult.recommendations.push(`Fix email validation: ${emailValidation.error}`);
  }

  if ((verifiedDomains?.length || 0) === 0) {
    testResult.recommendations.push('Add and verify at least one domain before sending emails');
  }

  if (suppressedEmails?.length) {
    testResult.recommendations.push('Remove email from suppression list or use a different email');
  }

  if (testResult.can_send) {
    testResult.recommendations.push('✅ Ready to send! Use POST /api/mail/send to send emails');
  }

  return NextResponse.json(testResult);
}

// GET /api/mail/test - Get test information
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      available_tests: [
        {
          test_type: 'validate_email',
          description: 'Validate email address format and check for common issues',
          method: 'POST',
          body: { test_type: 'validate_email', email: 'test@example.com' }
        },
        {
          test_type: 'check_domain',
          description: 'Check domain status and get required DNS records',
          method: 'POST',
          body: { test_type: 'check_domain', domain: 'example.com' }
        },
        {
          test_type: 'send_test_email',
          description: 'Test email sending readiness (dry run)',
          method: 'POST',
          body: { test_type: 'send_test_email', email: 'test@example.com' }
        }
      ],
      endpoints: {
        send_email: 'POST /api/mail/send',
        verify_domain: 'POST /api/mail/domains/verify',
        analytics: 'GET /api/mail/analytics',
        webhooks: 'POST /api/mail/webhooks/zeptomail'
      }
    });
  } catch (error) {
    console.error('Error in GET /api/mail/test:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

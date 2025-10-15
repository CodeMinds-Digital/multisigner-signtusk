import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SMTPRelayService } from '@/lib/mail/smtp-relay-service';

// GET /api/mail/smtp - Get SMTP configuration
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
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const smtpService = new SMTPRelayService();
    const config = await smtpService.getSMTPConfig(accountId);

    if (!config) {
      return NextResponse.json({ error: 'SMTP not configured for this account' }, { status: 404 });
    }

    return NextResponse.json({
      smtp_config: config,
      instructions: {
        host: config.host,
        port: config.port,
        security: 'STARTTLS',
        authentication: 'Required',
        username: config.auth.user,
        password: 'Use your API key as password'
      }
    });
  } catch (error) {
    console.error('SMTP config error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get SMTP config' 
    }, { status: 500 });
  }
}

// POST /api/mail/smtp - Send email via SMTP-like API
export async function POST(request: NextRequest) {
  try {
    // This endpoint simulates SMTP sending via HTTP API
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    const smtpService = new SMTPRelayService();
    
    // Authenticate using API key
    const auth = await smtpService.authenticateUser('api', apiKey);
    if (!auth.success || !auth.accountId) {
      return NextResponse.json({ error: auth.error || 'Authentication failed' }, { status: 401 });
    }

    const body = await request.json();
    const { from, to, cc, bcc, subject, html, text, attachments } = body;

    // Validate message
    const validation = smtpService.validateMessage({ from, to, cc, bcc, subject, html, text });
    if (!validation.valid) {
      return NextResponse.json({ 
        error: 'Invalid message format',
        details: validation.errors 
      }, { status: 400 });
    }

    // Process message
    const result = await smtpService.processSMTPMessage(auth.accountId, {
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments: attachments?.map((att: any) => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.contentType
      }))
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message_id: result.messageId,
      status: 'queued'
    });
  } catch (error) {
    console.error('SMTP send error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    }, { status: 500 });
  }
}

// PUT /api/mail/smtp - Generate SMTP credentials
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id } = body;

    if (!account_id) {
      return NextResponse.json({ error: 'Missing account_id' }, { status: 400 });
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

    const smtpService = new SMTPRelayService();
    const credentials = await smtpService.generateSMTPCredentials(account_id);

    if (!credentials) {
      return NextResponse.json({ error: 'Failed to generate SMTP credentials' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      credentials: {
        host: process.env.SMTP_HOST || 'smtp.signtusk.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        username: credentials.username,
        password: credentials.password,
        security: 'STARTTLS'
      },
      instructions: [
        'Use these credentials in your email client or application',
        'The username is your account ID',
        'The password is your API key',
        'Enable STARTTLS for secure connection',
        'Port 587 is recommended for submission'
      ]
    });
  } catch (error) {
    console.error('SMTP credentials generation error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate credentials' 
    }, { status: 500 });
  }
}

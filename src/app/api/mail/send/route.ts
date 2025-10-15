import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

// POST /api/mail/send - Send email
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      template_id,
      template_data,
      html,
      text,
      attachments,
      tags,
      metadata,
      send_at
    } = body;

    // Validate required fields
    if (!from || !to || (!subject && !template_id)) {
      return NextResponse.json({
        error: 'Missing required fields: from, to, and either subject or template_id'
      }, { status: 400 });
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from)) {
      return NextResponse.json({ error: 'Invalid from email address' }, { status: 400 });
    }

    const toEmails = Array.isArray(to) ? to : [to];
    for (const email of toEmails) {
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: `Invalid email address: ${email}` }, { status: 400 });
      }
    }

    // Get user's email account
    const { data: emailAccount, error: accountError } = await supabaseAdmin
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (accountError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Check quota
    if (emailAccount.emails_sent_this_month >= emailAccount.monthly_quota) {
      return NextResponse.json({
        error: 'Monthly email quota exceeded',
        quota: emailAccount.monthly_quota,
        sent: emailAccount.emails_sent_this_month
      }, { status: 429 });
    }

    // Verify from domain is verified
    const fromDomain = from.split('@')[1];
    const { data: domain, error: domainError } = await supabaseAdmin
      .from('email_domains')
      .select('verification_status')
      .eq('email_account_id', emailAccount.id)
      .eq('domain', fromDomain)
      .single();

    if (domainError || !domain || domain.verification_status !== 'verified') {
      return NextResponse.json({
        error: `Domain ${fromDomain} is not verified. Please verify your domain before sending emails.`
      }, { status: 400 });
    }

    // Check suppression list
    const { data: suppressedEmails } = await supabaseAdmin
      .from('email_suppression_list')
      .select('email')
      .eq('email_account_id', emailAccount.id)
      .in('email', toEmails);

    if (suppressedEmails && suppressedEmails.length > 0) {
      const suppressedList = suppressedEmails.map(s => s.email);
      return NextResponse.json({
        error: 'Some recipients are in suppression list',
        suppressed_emails: suppressedList
      }, { status: 400 });
    }

    // Process template if template_id is provided
    let finalHtml = html;
    let finalText = text;
    let finalSubject = subject;

    if (template_id) {
      const { data: template, error: templateError } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('id', template_id)
        .eq('email_account_id', emailAccount.id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Compile template with data
      const { TemplateCompiler } = await import('@/lib/mail/template-compiler');
      const compiler = new TemplateCompiler();

      try {
        const compiled = compiler.compile(template, template_data || {});
        finalHtml = compiled.html;
        finalText = compiled.text;
        finalSubject = compiled.subject;
      } catch (compileError) {
        return NextResponse.json({
          error: 'Template compilation failed',
          details: compileError.message
        }, { status: 400 });
      }
    }

    // Create message record
    const messageData = {
      email_account_id: emailAccount.id,
      template_id: template_id || null,
      from_email: from,
      to_emails: toEmails,
      cc_emails: cc || null,
      bcc_emails: bcc || null,
      subject: finalSubject,
      html_content: finalHtml,
      text_content: finalText,
      attachments: attachments || null,
      tags: tags || [],
      metadata: metadata || {},
      status: send_at ? 'scheduled' : 'queued',
      scheduled_at: send_at ? new Date(send_at).toISOString() : null
    };

    const { data: message, error: messageError } = await supabaseAdmin
      .from('email_messages')
      .insert(messageData)
      .select()
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    // Queue email for sending
    try {
      const { EmailSendingService } = await import('@/lib/mail/email-sending-service');
      const sendingService = new EmailSendingService();

      if (send_at) {
        // Schedule for later
        await sendingService.scheduleEmail(message.id, new Date(send_at));
      } else {
        // Send immediately
        await sendingService.queueEmail(message.id);
      }
    } catch (queueError) {
      console.error('Error queuing email:', queueError);

      // Update message status to failed
      await supabaseAdmin
        .from('email_messages')
        .update({ status: 'failed' })
        .eq('id', message.id);

      return NextResponse.json({
        error: 'Failed to queue email for sending',
        message_id: message.id
      }, { status: 500 });
    }

    return NextResponse.json({
      id: message.id,
      status: message.status,
      created_at: message.created_at,
      scheduled_at: message.scheduled_at
    });
  } catch (error) {
    console.error('Error in POST /api/mail/send:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

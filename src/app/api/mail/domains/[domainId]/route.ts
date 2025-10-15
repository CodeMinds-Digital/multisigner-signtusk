import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

// GET /api/mail/domains/[domainId] - Get specific domain
export async function GET(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;

    // Get domain with account verification
    const { data: domain, error } = await supabaseAdmin
      .from('email_domains')
      .select(`
        *,
        email_accounts!inner(user_id)
      `)
      .eq('id', domainId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    return NextResponse.json({ domain });
  } catch (error) {
    console.error('Error in GET /api/mail/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/mail/domains/[domainId] - Update domain
export async function PUT(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;
    const body = await request.json();

    // Verify domain ownership
    const { data: domain, error: fetchError } = await supabaseAdmin
      .from('email_domains')
      .select(`
        *,
        email_accounts!inner(user_id)
      `)
      .eq('id', domainId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Update domain
    const { data: updatedDomain, error } = await supabase
      .from('email_domains')
      .update(body)
      .eq('id', domainId)
      .select()
      .single();

    if (error) {
      console.error('Error updating domain:', error);
      return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
    }

    return NextResponse.json({ domain: updatedDomain });
  } catch (error) {
    console.error('Error in PUT /api/mail/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mail/domains/[domainId] - Delete domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: { domainId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domainId } = params;

    // Verify domain ownership
    const { data: domain, error: fetchError } = await supabaseAdmin
      .from('email_domains')
      .select(`
        *,
        email_accounts!inner(user_id)
      `)
      .eq('id', domainId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (fetchError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Check if domain is being used in any messages
    const { data: messages, error: messagesError } = await supabase
      .from('email_messages')
      .select('id')
      .eq('email_account_id', domain.email_account_id)
      .ilike('from_email', `%@${domain.domain}`)
      .limit(1);

    if (messagesError) {
      console.error('Error checking domain usage:', messagesError);
      return NextResponse.json({ error: 'Failed to check domain usage' }, { status: 500 });
    }

    if (messages && messages.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete domain that has been used to send emails'
      }, { status: 400 });
    }

    // Delete domain
    const { error } = await supabase
      .from('email_domains')
      .delete()
      .eq('id', domainId);

    if (error) {
      console.error('Error deleting domain:', error);
      return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
    }

    // Clean up DNS records if automation was enabled
    try {
      if (domain.automation_enabled && domain.automation_provider) {
        const { DomainCleanupService } = await import('@/lib/mail/domain-cleanup-service');
        const cleanupService = new DomainCleanupService();
        await cleanupService.cleanupDomainRecords(domain);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up DNS records:', cleanupError);
      // Continue anyway, domain is deleted from our system
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/mail/domains/[domainId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

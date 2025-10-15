import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = supabaseAdmin;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');

    let query = supabase
      .from('email_templates')
      .select(`
        *,
        email_accounts!inner(id, user_id)
      `)
      .eq('email_accounts.user_id', user.id)
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('email_account_id', accountId);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/mail/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email_account_id, name, subject, html_content, text_content, variables } = body;

    // Validate required fields
    if (!email_account_id || !name || !subject || !html_content) {
      return NextResponse.json({
        error: 'Missing required fields: email_account_id, name, subject, html_content'
      }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    // Verify user owns the email account
    const { data: emailAccount, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('id', email_account_id)
      .eq('user_id', user.id)
      .single();

    if (accountError || !emailAccount) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // Create template
    const { data: template, error } = await supabase
      .from('email_templates')
      .insert({
        email_account_id,
        name,
        subject,
        html_content,
        text_content: text_content || '',
        variables: variables || [],
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/mail/templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

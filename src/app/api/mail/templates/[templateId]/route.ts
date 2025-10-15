import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .select(`
        *,
        email_accounts!inner(id, user_id)
      `)
      .eq('id', params.templateId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in GET /api/mail/templates/[templateId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, html_content, text_content, variables, is_active } = body;

    // Verify user owns the template
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select(`
        id,
        email_accounts!inner(user_id)
      `)
      .eq('id', params.templateId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Update template
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (html_content !== undefined) updateData.html_content = html_content;
    if (text_content !== undefined) updateData.text_content = text_content;
    if (variables !== undefined) updateData.variables = variables;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: template, error } = await supabase
      .from('email_templates')
      .update(updateData)
      .eq('id', params.templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error in PUT /api/mail/templates/[templateId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns the template
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select(`
        id,
        email_accounts!inner(user_id)
      `)
      .eq('id', params.templateId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Delete template
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', params.templateId);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/mail/templates/[templateId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

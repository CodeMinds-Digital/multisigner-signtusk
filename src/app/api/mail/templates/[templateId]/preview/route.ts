import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';
import { TemplateCompiler } from '@/lib/mail/template-compiler';

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = params;
    const body = await request.json();
    const { sampleData = {} } = body;

    // Get template
    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .select(`
        *,
        email_accounts!inner(id, user_id)
      `)
      .eq('id', templateId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Compile template with sample data
    const compiler = new TemplateCompiler();
    const preview = compiler.generatePreview(template, sampleData);

    return NextResponse.json({
      preview,
      template: {
        id: template.id,
        name: template.name,
        variables: template.variables
      }
    });
  } catch (error) {
    console.error('Template preview error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate preview' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = params;

    // Get template
    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .select(`
        *,
        email_accounts!inner(id, user_id)
      `)
      .eq('id', templateId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Validate template and generate preview with default sample data
    const compiler = new TemplateCompiler();
    const validation = compiler.validateTemplate(template);
    const preview = compiler.generatePreview(template);

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content,
        variables: template.variables
      },
      validation,
      preview
    });
  } catch (error) {
    console.error('Template preview error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to get template preview' 
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/auth-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get message with events
    const { data: message, error } = await supabaseAdmin
      .from('email_messages')
      .select(`
        *,
        email_accounts!inner(id, user_id),
        email_templates(id, name),
        email_events(
          id,
          event_type,
          event_data,
          created_at
        )
      `)
      .eq('id', params.messageId)
      .eq('email_accounts.user_id', user.id)
      .single();

    if (error || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error in GET /api/mail/messages/[messageId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

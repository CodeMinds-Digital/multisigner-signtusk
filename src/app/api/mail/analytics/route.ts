import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getCurrentUser } from '@/lib/auth/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use supabaseAdmin for server-side operations
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get email account(s)
    let accountQuery = supabaseAdmin
      .from('email_accounts')
      .select('id')
      .eq('user_id', user.id);

    if (accountId) {
      accountQuery = accountQuery.eq('id', accountId);
    }

    const { data: accounts, error: accountError } = await accountQuery;

    if (accountError || !accounts?.length) {
      return NextResponse.json({ error: 'No email accounts found' }, { status: 404 });
    }

    const accountIds = accounts.map(acc => acc.id);

    // Get message statistics
    const { data: messageStats, error: messageError } = await supabaseAdmin
      .from('email_messages')
      .select('status, created_at')
      .in('email_account_id', accountIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (messageError) {
      console.error('Error fetching message stats:', messageError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Get event statistics
    const { data: eventStats, error: eventError } = await supabaseAdmin
      .from('email_events')
      .select(`
        event_type,
        created_at,
        email_messages!inner(email_account_id)
      `)
      .in('email_messages.email_account_id', accountIds)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (eventError) {
      console.error('Error fetching event stats:', eventError);
    }

    // Process statistics
    const totalSent = messageStats?.length || 0;
    const delivered = eventStats?.filter(e => e.event_type === 'delivered').length || 0;
    const opened = eventStats?.filter(e => e.event_type === 'opened').length || 0;
    const clicked = eventStats?.filter(e => e.event_type === 'clicked').length || 0;
    const bounced = eventStats?.filter(e => e.event_type === 'bounced').length || 0;
    const complained = eventStats?.filter(e => e.event_type === 'complained').length || 0;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (delivered / totalSent) * 100 : 0;
    const openRate = delivered > 0 ? (opened / delivered) * 100 : 0;
    const clickRate = delivered > 0 ? (clicked / delivered) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounced / totalSent) * 100 : 0;
    const complaintRate = totalSent > 0 ? (complained / totalSent) * 100 : 0;

    // Generate daily breakdown
    const dailyStats = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayMessages = messageStats?.filter(m =>
        m.created_at.startsWith(dateStr)
      ).length || 0;

      const dayEvents = eventStats?.filter(e =>
        e.created_at.startsWith(dateStr)
      ) || [];

      dailyStats.unshift({
        date: dateStr,
        sent: dayMessages,
        delivered: dayEvents.filter(e => e.event_type === 'delivered').length,
        opened: dayEvents.filter(e => e.event_type === 'opened').length,
        clicked: dayEvents.filter(e => e.event_type === 'clicked').length,
        bounced: dayEvents.filter(e => e.event_type === 'bounced').length
      });
    }

    // Get top domains
    const domainStats = messageStats?.reduce((acc: any, msg: any) => {
      const domain = msg.to_emails?.[0]?.split('@')[1] || 'unknown';
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {}) || {};

    const topDomains = Object.entries(domainStats)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([domain, count]) => ({ domain, count }));

    return NextResponse.json({
      summary: {
        totalSent,
        delivered,
        opened,
        clicked,
        bounced,
        complained,
        deliveryRate: Math.round(deliveryRate * 100) / 100,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        complaintRate: Math.round(complaintRate * 100) / 100
      },
      dailyStats,
      topDomains,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Error in GET /api/mail/analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

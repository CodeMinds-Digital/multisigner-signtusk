import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/send/notifications/preferences
 * Get user notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get preferences
    const { data, error } = await supabaseAdmin
      .from('send_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    // Return preferences or defaults
    const preferences = data ? {
      emailNotifications: data.email_notifications ?? true,
      realtimeNotifications: data.realtime_notifications ?? true,
      slackNotifications: data.slack_notifications ?? false,
      webhookNotifications: data.webhook_notifications ?? false,
      notifyOnView: data.notify_on_view ?? true,
      notifyOnDownload: data.notify_on_download ?? true,
      notifyOnPrint: data.notify_on_print ?? true,
      notifyOnNDA: data.notify_on_nda ?? true,
      notifyOnHighEngagement: data.notify_on_high_engagement ?? true,
      notifyOnReturningVisitor: data.notify_on_returning_visitor ?? true
    } : {
      emailNotifications: true,
      realtimeNotifications: true,
      slackNotifications: false,
      webhookNotifications: false,
      notifyOnView: true,
      notifyOnDownload: true,
      notifyOnPrint: true,
      notifyOnNDA: true,
      notifyOnHighEngagement: true,
      notifyOnReturningVisitor: true
    }

    return NextResponse.json({
      success: true,
      preferences
    })
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/send/notifications/preferences
 * Update user notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const body = await request.json()
    const {
      emailNotifications,
      realtimeNotifications,
      slackNotifications,
      webhookNotifications,
      notifyOnView,
      notifyOnDownload,
      notifyOnPrint,
      notifyOnNDA,
      notifyOnHighEngagement,
      notifyOnReturningVisitor
    } = body

    // Upsert preferences
    const { error } = await supabaseAdmin
      .from('send_notification_preferences')
      .upsert({
        user_id: userId,
        email_notifications: emailNotifications,
        realtime_notifications: realtimeNotifications,
        slack_notifications: slackNotifications,
        webhook_notifications: webhookNotifications,
        notify_on_view: notifyOnView,
        notify_on_download: notifyOnDownload,
        notify_on_print: notifyOnPrint,
        notify_on_nda: notifyOnNDA,
        notify_on_high_engagement: notifyOnHighEngagement,
        notify_on_returning_visitor: notifyOnReturningVisitor,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Preferences updated'
    })
  } catch (error: any) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}


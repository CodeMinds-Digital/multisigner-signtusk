import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendWebhookService } from '@/lib/send-webhook-service'

/**
 * GET /api/send/webhooks
 * List all webhooks for the current user
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

    const { data: webhooks, error } = await supabaseAdmin
      .from('send_webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Don't expose secrets in the response
    const sanitizedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      secret: undefined
    }))

    return NextResponse.json({
      success: true,
      webhooks: sanitizedWebhooks
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/send/webhooks
 * Create a new webhook
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
    const { url, events, secret } = body

    // Validate input
    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'URL and events array are required' },
        { status: 400 }
      )
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    // Create webhook
    const result = await SendWebhookService.createWebhook(
      userId,
      url,
      events,
      secret
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...result.webhook,
        secret: undefined // Don't expose secret
      },
      secret: result.webhook.secret // Return secret only on creation
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { SendWebhookService } from '@/lib/send-webhook-service'

/**
 * GET /api/send/webhooks/[webhookId]
 * Get webhook details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: webhook, error } = await supabase
      .from('send_webhooks')
      .select('*')
      .eq('id', params.webhookId)
      .eq('user_id', user.id)
      .single()

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      webhook: {
        ...webhook,
        secret: undefined // Don't expose secret
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/send/webhooks/[webhookId]
 * Update webhook
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: webhook } = await supabase
      .from('send_webhooks')
      .select('id')
      .eq('id', params.webhookId)
      .eq('user_id', user.id)
      .single()

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const body = await request.json()
    const { url, events, enabled } = body

    const updates: any = {}
    if (url !== undefined) updates.url = url
    if (events !== undefined) updates.events = events
    if (enabled !== undefined) updates.enabled = enabled

    const result = await SendWebhookService.updateWebhook(params.webhookId, updates)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/send/webhooks/[webhookId]
 * Delete webhook
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { webhookId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const { data: webhook } = await supabase
      .from('send_webhooks')
      .select('id')
      .eq('id', params.webhookId)
      .eq('user_id', user.id)
      .single()

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const result = await SendWebhookService.deleteWebhook(params.webhookId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


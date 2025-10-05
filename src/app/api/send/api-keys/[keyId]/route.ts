import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendAPIKeyService } from '@/lib/send-api-key-service'

/**
 * GET /api/send/api-keys/[keyId]
 * Get API key details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const { data: key, error } = await supabaseAdmin
      .from('send_api_keys')
      .select('id, name, key_prefix, scopes, last_used_at, expires_at, created_at')
      .eq('id', params.keyId)
      .eq('user_id', userId)
      .single()

    if (error || !key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Get usage stats
    const stats = await SendAPIKeyService.getUsageStats(params.keyId)

    return NextResponse.json({
      success: true,
      key,
      stats
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/send/api-keys/[keyId]
 * Revoke API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify ownership
    const { data: key } = await supabaseAdmin
      .from('send_api_keys')
      .select('id')
      .eq('id', params.keyId)
      .eq('user_id', userId)
      .single()

    if (!key) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const result = await SendAPIKeyService.revokeAPIKey(params.keyId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


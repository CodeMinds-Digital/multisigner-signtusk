import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const signatureId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get request body
    const body = await request.json()

    // Handle different update operations
    if (body.signature_data) {
      // Update signature data
      const { error } = await supabaseAdmin
        .from('signatures')
        .update({ 
          signature_data: body.signature_data,
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating signature:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update signature' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else if (body.is_default !== undefined) {
      // Set as default signature
      if (body.is_default) {
        // First, unset all default signatures for this user
        await supabaseAdmin
          .from('signatures')
          .update({ is_default: false })
          .eq('user_id', userId)

        // Then set the selected signature as default
        const { error } = await supabaseAdmin
          .from('signatures')
          .update({ is_default: true })
          .eq('id', signatureId)
          .eq('user_id', userId)

        if (error) {
          console.error('Error setting default signature:', error)
          return new Response(
            JSON.stringify({ error: 'Failed to set default signature' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating signature:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const signatureId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Delete signature
    const { error } = await supabaseAdmin
      .from('signatures')
      .delete()
      .eq('id', signatureId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting signature:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to delete signature' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting signature:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

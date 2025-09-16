import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Check if signatures table exists by trying to query it (v2)
async function ensureSignaturesTable() {
  try {
    // Simply try to query the signatures table
    // If it exists, this will work; if not, we'll get an error
    const { error } = await supabaseAdmin
      .from('signatures')
      .select('id')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116') {
        // Table exists but is empty, that's fine
        console.log('Signatures table exists and is ready')
      } else {
        console.log('Signatures table might not exist or has access issues:', error.message)
        // Table might not exist, but we can't create it via API
        // The table should be created manually in Supabase SQL Editor
      }
    } else {
      console.log('Signatures table exists and is accessible')
    }
  } catch (error) {
    console.error('Error checking signatures table:', error)
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Ensure signatures table exists
    await ensureSignaturesTable()

    // Get user signatures
    const { data: signatures, error } = await supabaseAdmin
      .from('signatures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching signatures:', error)
      return new Response(
        JSON.stringify({ success: true, data: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: signatures || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching signatures:', error)

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

export async function POST(request: NextRequest) {
  try {
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
    const { name, signature_data, is_default } = await request.json()

    if (!name || !signature_data) {
      return new Response(
        JSON.stringify({ error: 'Name and signature data are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Ensure signatures table exists
    await ensureSignaturesTable()

    // If this is set as default, unset all other defaults first
    if (is_default) {
      await supabaseAdmin
        .from('signatures')
        .update({ is_default: false })
        .eq('user_id', userId)
    }

    // Insert new signature
    const { data: signature, error } = await supabaseAdmin
      .from('signatures')
      .insert({
        user_id: userId,
        name,
        signature_data,
        is_default: is_default || false
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating signature:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create signature' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, data: signature }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating signature:', error)

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Ensure signatures table exists
async function ensureSignaturesTable() {
  try {
    // Check if table exists
    const { data: tables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'signatures')

    if (checkError) {
      console.log('Error checking for signatures table:', checkError)
    }

    if (!tables || tables.length === 0) {
      console.log('Signatures table does not exist, creating it...')
      
      // Create the signatures table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.signatures (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          name TEXT NOT NULL,
          signature_data TEXT NOT NULL,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON public.signatures(user_id);
        CREATE INDEX IF NOT EXISTS idx_signatures_is_default ON public.signatures(user_id, is_default);

        ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own signatures" ON public.signatures;
        DROP POLICY IF EXISTS "Users can insert their own signatures" ON public.signatures;
        DROP POLICY IF EXISTS "Users can update their own signatures" ON public.signatures;
        DROP POLICY IF EXISTS "Users can delete their own signatures" ON public.signatures;

        CREATE POLICY "Users can view their own signatures" ON public.signatures
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own signatures" ON public.signatures
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own signatures" ON public.signatures
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own signatures" ON public.signatures
          FOR DELETE USING (auth.uid() = user_id);

        GRANT ALL ON public.signatures TO authenticated;
      `

      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL })
      
      if (createError) {
        console.error('Error creating signatures table:', createError)
        // Try alternative approach
        const { error: altError } = await supabaseAdmin
          .from('signatures')
          .select('id')
          .limit(1)
        
        if (altError && altError.code === 'PGRST116') {
          // Table exists but is empty, that's fine
          console.log('Signatures table exists but is empty')
        } else if (altError) {
          console.error('Signatures table creation failed:', altError)
        }
      } else {
        console.log('Signatures table created successfully')
      }
    } else {
      console.log('Signatures table already exists')
    }
  } catch (error) {
    console.error('Error ensuring signatures table:', error)
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

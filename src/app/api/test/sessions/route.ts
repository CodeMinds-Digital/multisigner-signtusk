import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

// GET - Test and fix user sessions
export async function GET(request: NextRequest) {
  try {
    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json({
        error: 'Authentication required',
        step: 'auth_check'
      }, { status: 401 })
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    console.log('Testing sessions for user:', userId)

    // Step 1: Check if user_sessions table exists
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('user_sessions')
      .select('count')
      .limit(1)

    if (tableError) {
      console.error('Table check error:', tableError)

      // Try to create a simple user_sessions table
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.user_sessions (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID NOT NULL,
          session_token TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_used_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
          ip_address TEXT,
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          is_current BOOLEAN DEFAULT false,
          device_fingerprint TEXT,
          location_country TEXT,
          location_city TEXT,
          terminated_at TIMESTAMPTZ
        );
        
        -- Add RLS policies
        ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Users can view their own sessions" ON public.user_sessions
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "Users can update their own sessions" ON public.user_sessions
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "System can insert sessions" ON public.user_sessions
          FOR INSERT WITH CHECK (true);
        
        -- Add indexes
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON public.user_sessions(is_active);
      `

      const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
        sql: createTableQuery
      })

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create user_sessions table',
          details: (createError as any)?.message || String(createError),
          step: 'table_creation'
        }, { status: 500 })
      }
    }

    // Step 2: Check existing sessions for user
    const { data: existingSessions, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)

    if (sessionError) {
      return NextResponse.json({
        error: 'Failed to fetch existing sessions',
        details: (sessionError as any)?.message || String(sessionError),
        step: 'session_fetch'
      }, { status: 500 })
    }

    // Step 3: Create a current session if none exists
    let currentSession = null
    if (!existingSessions || existingSessions.length === 0) {
      const sessionData = {
        user_id: userId,
        session_token: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1',
        user_agent: request.headers.get('user-agent') || 'Unknown',
        is_current: true,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }

      const { data: newSession, error: insertError } = await supabaseAdmin
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({
          error: 'Failed to create session',
          details: (insertError as any)?.message || String(insertError),
          step: 'session_creation'
        }, { status: 500 })
      }

      currentSession = newSession
    }

    // Step 4: Test the active sessions API
    const { data: activeSessions, error: activeError } = await supabaseAdmin
      .from('user_sessions')
      .select(`
        id,
        session_token,
        created_at,
        last_used_at,
        expires_at,
        ip_address,
        user_agent,
        is_current
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: {
        userId,
        tableExists: !tableError,
        existingSessionsCount: existingSessions?.length || 0,
        createdNewSession: !!currentSession,
        activeSessions: activeSessions || [],
        activeSessionsCount: activeSessions?.length || 0,
        testResults: {
          tableCheck: !tableError ? 'PASS' : 'FAIL',
          sessionFetch: !sessionError ? 'PASS' : 'FAIL',
          activeSessionsAPI: !activeError ? 'PASS' : 'FAIL'
        }
      }
    })

  } catch (error) {
    console.error('Error in sessions test:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      step: 'general_error'
    }, { status: 500 })
  }
}

// POST - Create mock sessions for testing
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    if (!accessToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Create 2-3 mock sessions
    const mockSessions = [
      {
        user_id: userId,
        session_token: `session_current_${Date.now()}`,
        ip_address: '192.168.1.100',
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        is_current: true,
        is_active: true,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        user_id: userId,
        session_token: `session_mobile_${Date.now()}`,
        ip_address: '10.0.0.50',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        is_current: false,
        is_active: true,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        last_used_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    const { data: createdSessions, error } = await supabaseAdmin
      .from('user_sessions')
      .insert(mockSessions)
      .select()

    if (error) {
      return NextResponse.json({
        error: 'Failed to create mock sessions',
        details: (error as any)?.message || String(error)
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Mock sessions created successfully',
      data: createdSessions
    })

  } catch (error) {
    console.error('Error creating mock sessions:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

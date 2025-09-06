import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

    // Get dashboard stats using admin client
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('status, created_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching documents:', error)
      // Return mock data as fallback
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            totalDocuments: 0,
            pendingSignatures: 0,
            completedDocuments: 0,
            expiredDocuments: 0
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate stats
    const totalDocuments = documents?.length || 0
    const pendingSignatures = documents?.filter(doc => doc.status === 'pending').length || 0
    const completedDocuments = documents?.filter(doc => doc.status === 'completed').length || 0
    const expiredDocuments = documents?.filter(doc => doc.status === 'expired').length || 0

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalDocuments,
          pendingSignatures,
          completedDocuments,
          expiredDocuments
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

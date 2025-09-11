import { NextRequest } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

    // Get request body
    const { pdfUrl } = await request.json()

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'PDF URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If it's already a full URL, return it
    if (pdfUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({
          success: true,
          data: { url: pdfUrl }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract path from URL if needed
    let filePath = pdfUrl
    if (pdfUrl.includes('/storage/v1/object/public/')) {
      const parts = pdfUrl.split('/storage/v1/object/public/documents/')
      if (parts.length > 1) {
        filePath = parts[1]
      }
    }

    console.log('🔍 Getting public URL for Drive document path:', filePath)

    // For Drive documents, use 'documents' bucket (signed/active documents)
    const { data: documentsUrlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath)

    let publicUrl = null
    if (documentsUrlData?.publicUrl) {
      console.log('✅ Got public URL from documents bucket:', documentsUrlData.publicUrl)
      publicUrl = documentsUrlData.publicUrl
    }

    if (!publicUrl) {
      console.log('❌ Failed to get public URL from any bucket')
      return new Response(
        JSON.stringify({ error: 'Failed to get document URL' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { url: publicUrl }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting document URL:', error)

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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

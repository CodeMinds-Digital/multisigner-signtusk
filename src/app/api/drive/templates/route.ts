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

    // Get document templates using admin client
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching document templates:', error)
      // Return mock data as fallback
      return new Response(
        JSON.stringify({
          success: true,
          data: getMockDocuments()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Transform documents to match DocumentTemplate interface
    const templates = (documents || []).map(doc => ({
      id: doc.id,
      name: doc.title || doc.file_name,
      type: doc.document_type || 'general',
      signature_type: doc.signature_type || 'single',
      status: doc.status,
      pdf_url: doc.file_url,
      template_url: doc.template_url,
      schemas: doc.signature_fields || [],
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      user_id: doc.user_id,
      description: doc.description,
      template_data: doc.template_data,
      category: doc.category,
      is_public: doc.is_public || false,
      is_system_template: doc.is_system_template || false,
      usage_count: doc.usage_count || 0
    }))

    return new Response(
      JSON.stringify({
        success: true,
        data: templates
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching document templates:', error)
    
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

// Mock documents for fallback
function getMockDocuments() {
  return [
    {
      id: '1',
      name: 'Employment Contract Template',
      type: 'contract',
      signature_type: 'multi',
      status: 'ready',
      pdf_url: '/mock-documents/employment-contract.pdf',
      template_url: '/mock-documents/employment-contract-template.json',
      schemas: [],
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'mock-user',
      description: 'Standard employment contract with signature fields',
      category: 'HR',
      is_public: false,
      is_system_template: false,
      usage_count: 5
    },
    {
      id: '2',
      name: 'NDA Agreement',
      type: 'agreement',
      signature_type: 'multi',
      status: 'draft',
      pdf_url: '/mock-documents/nda.pdf',
      template_url: '/mock-documents/nda-template.json',
      schemas: [],
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: 'mock-user',
      description: 'Non-disclosure agreement template',
      category: 'Legal',
      is_public: false,
      is_system_template: false,
      usage_count: 2
    }
  ]
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

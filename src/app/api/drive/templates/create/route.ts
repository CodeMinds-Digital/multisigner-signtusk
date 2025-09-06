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
    const userId = payload.userId

    // Get request body
    const { documentData, pdfPath, userEmail } = await request.json()

    if (!documentData || !pdfPath) {
      return new Response(
        JSON.stringify({ error: 'Document data and PDF path are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(pdfPath)

    const publicUrl = publicUrlData.publicUrl

    // Prepare the document data
    const documentInsertData = {
      title: documentData.name,
      file_name: documentData.name,
      file_url: publicUrl,
      user_id: userId,
      user_email: userEmail || payload.email,
      status: 'draft',
      document_type: documentData.type,
      category: documentData.category || 'Other',
      signature_type: 'single', // Default to single
      description: `${documentData.type} - ${documentData.category || 'Other'}`,
      completion_percentage: 0,
      pdf_url: publicUrl,
      template_url: null,
      signature_fields: [],
      signers: [],
      settings: {},
      metadata: {},
      template_data: null,
      is_public: false,
      is_system_template: false,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert document template
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .insert([documentInsertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating document template:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create document template' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Transform to match DocumentTemplate interface
    const template = {
      id: document.id,
      name: document.title,
      type: document.document_type,
      signature_type: document.signature_type,
      status: document.status,
      pdf_url: document.pdf_url,
      template_url: document.template_url,
      schemas: document.signature_fields || [],
      created_at: document.created_at,
      updated_at: document.updated_at,
      user_id: document.user_id,
      description: document.description,
      template_data: document.template_data,
      category: document.category,
      is_public: document.is_public,
      is_system_template: document.is_system_template,
      usage_count: document.usage_count
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: template 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating document template:', error)
    
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

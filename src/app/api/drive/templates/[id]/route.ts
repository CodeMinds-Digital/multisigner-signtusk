import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params to fix Next.js async API warning
    const resolvedParams = await params
    const documentId = resolvedParams.id

    // Get access token from cookies
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify access token
    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get document template
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Transform to DocumentTemplate format
    const documentTemplate = {
      id: document.id,
      name: document.title,
      type: document.document_type || 'template',
      signature_type: document.signature_type || 'single',
      status: document.status,
      pdf_url: document.file_url || document.pdf_url,
      template_url: document.template_url,
      schemas: document.schemas || [],
      signers: document.signers || [],
      created_at: document.created_at,
      updated_at: document.updated_at,
      user_id: document.user_id,
      description: document.description,
      template_data: document.template_data,
      category: document.category,
      is_public: document.is_public || false,
      is_system_template: document.is_system_template || false,
      usage_count: document.usage_count || 0,
      completion_percentage: document.completion_percentage || 0
    }

    return NextResponse.json({
      success: true,
      data: documentTemplate
    })

  } catch (error) {
    console.error('Error fetching document template:', error)
    
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

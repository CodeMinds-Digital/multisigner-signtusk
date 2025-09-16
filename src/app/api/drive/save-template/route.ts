import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid access token' },
        { status: 401 }
      )
    }

    const { template, userId, documentId } = await request.json()

    // Verify user authorization
    if (payload.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    // Get document info to ensure correct metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('signature_type, title, category, document_type')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Preserve complete PDFme template structure
    const completeTemplate = {
      basePdf: template.basePdf || null, // Preserve basePdf if exists
      schemas: template.schemas || [],
      // ✅ CRITICAL: Preserve signers array
      signers: template.signers || [],
      // ✅ CRITICAL: Preserve multiSignature flag
      multiSignature: template.multiSignature || (template.signers && template.signers.length > 1) || document.signature_type === 'multi',
      // Add metadata for compatibility
      metadata: {
        signature_type: document.signature_type,
        document_type: document.document_type,
        category: document.category,
        title: document.title,
        is_multi_signature: document.signature_type === 'multi',
        created_at: new Date().toISOString(),
        version: '1.0',
        // Preserve any existing metadata
        ...template.metadata
      }
    }

    const fileName = `templates/${userId}/${documentId}/template.json`
    const json = JSON.stringify(completeTemplate, null, 2)

    // Upload to 'files' bucket (no MIME type restrictions)
    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .upload(fileName, new Blob([json], { type: 'application/json' }), {
        upsert: true
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to save template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { path: data.path }
    })

  } catch (error) {
    console.error('Save template API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

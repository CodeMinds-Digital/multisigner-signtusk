import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateSignersFromSchemas, analyzeDocumentSignatureType, validateDocumentCompletion } from '@/lib/signature-field-utils'

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

    const { documentId, schemas, templatePath, signers } = await request.json()

    // Get current document to validate completion and user ownership
    const { data: currentDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', payload.userId)
      .single()

    if (docError || !currentDoc) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      )
    }

    // Get current signers from the document
    const currentSigners = currentDoc.signers || []

    // Validate document completion in template mode (no email validation)
    const validation = validateDocumentCompletion(schemas, currentSigners, true)

    console.log('🔍 Document validation result:', {
      documentId,
      currentStatus: currentDoc.status,
      newStatus: validation.status,
      currentCompletion: currentDoc.completion_percentage,
      newCompletion: validation.completion_percentage,
      schemasCount: schemas?.length || 0,
      signatureFieldsCount: validation.signatureFieldsCount,
      validSignersCount: validation.validSignersCount,
      isValid: validation.isValid,
      issues: validation.issues
    })

    // Ensure schemas is properly serialized for JSONB column
    const serializedSchemas = Array.isArray(schemas) ? schemas : []

    const updatePayload: any = {
      schemas: serializedSchemas,
      status: validation.status,
      completion_percentage: validation.completion_percentage,
      updated_at: new Date().toISOString()
    }

    if (templatePath) {
      updatePayload.template_url = templatePath
    }

    // Analyze signature fields and determine signature type automatically
    const signatureAnalysis = analyzeDocumentSignatureType({ schemas: serializedSchemas })
    console.log('🔍 Signature analysis for document update:', signatureAnalysis)

    // Always update signature_type based on actual signature fields in schemas
    updatePayload.signature_type = signatureAnalysis.signatureType

    // Auto-generate signers from signature fields if not provided or validation failed
    let finalSigners = signers
    if (!signers || signers.length === 0 || !validation.isValid) {
      console.log('🔍 Generating signers from schemas due to missing signers or validation issues')
      finalSigners = generateSignersFromSchemas(schemas)

      // Re-validate with generated signers in template mode
      const revalidation = validateDocumentCompletion(schemas, finalSigners, true)
      console.log('🔍 Re-validation with generated signers:', {
        status: revalidation.status,
        completion: revalidation.completion_percentage,
        isValid: revalidation.isValid,
        issues: revalidation.issues
      })

      // Update payload with re-validation results
      updatePayload.status = revalidation.status
      updatePayload.completion_percentage = revalidation.completion_percentage
    }

    if (finalSigners && Array.isArray(finalSigners)) {
      updatePayload.signers = finalSigners
    }

    console.log('🔍 Updating document with payload:', updatePayload)

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .update(updatePayload)
      .eq('id', documentId)
      .eq('user_id', payload.userId)
      .select()
      .single()

    if (error) {
      console.error('Document update error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update document' },
        { status: 500 }
      )
    }

    // Transform to DocumentTemplate format
    const updatedDocument = {
      id: document.id,
      name: document.title,
      status: document.status,
      created_at: document.created_at,
      updated_at: document.updated_at,
      file_name: document.file_name,
      file_url: document.file_url,
      user_id: document.user_id,
      metadata: document.metadata || {},
      description: document.description,
      document_type: document.document_type,
      completion_percentage: document.completion_percentage,
      signature_type: document.signature_type,
      template_url: document.template_url,
      schemas: document.schemas
    }

    return NextResponse.json({
      success: true,
      data: updatedDocument
    })

  } catch (error) {
    console.error('Update document API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * API Route: /api/v1/signatures/requests/[id]/sign
 * Handles document signing
 */

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/lib/signature/core/signature-service'
import { SignDocumentSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * POST /api/v1/signatures/requests/[id]/sign
 * Sign a document
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = validateInput(SignDocumentSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signature data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    // Ensure the signature_request_id matches the URL parameter
    if (validation.data!.signature_request_id !== id) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Request ID mismatch' } },
        { status: 400 }
      )
    }

    // Extract IP address and user agent for audit logging
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'Unknown'

    const result = await signatureService.signDocument(
      user.id,
      user.email || '',
      validation.data!,
      ipAddress,
      userAgent
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error signing document:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


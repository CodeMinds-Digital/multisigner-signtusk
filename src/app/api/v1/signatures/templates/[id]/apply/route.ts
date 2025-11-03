/**
 * API Route: /api/v1/signatures/templates/[id]/apply
 * Applies a template to create a signature request
 */

import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/signature/templates/template-service'
import { signatureService } from '@/lib/signature/core/signature-service'
import { ApplyTemplateSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * POST /api/v1/signatures/templates/[id]/apply
 * Apply template to create signature request
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
    const validation = validateInput(ApplyTemplateSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template application data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    // Get the template
    const templateResult = await templateService.getTemplate(id, user.id)

    if (!templateResult.success || !templateResult.data) {
      return NextResponse.json(
        { error: templateResult.error },
        { status: 404 }
      )
    }

    const template = templateResult.data

    // Merge template defaults with overrides (Comment 4)
    // Only include signers with valid emails, skip placeholders
    const signers = validation.data!.signers || template.default_signers
      .filter((s) => s.email && s.email.trim() !== '')
      .map((s) => ({
        signer_email: s.email!,
        signer_name: s.name,
        signing_order: s.signing_order,
      }))

    // Validate that we have at least one signer with a valid email
    if (signers.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template has no valid signer emails. Please provide signers with valid email addresses.',
            details: { signers: 'At least one signer with a valid email is required' },
          },
        },
        { status: 400 }
      )
    }

    const requestData = {
      document_id: validation.data!.document_id,
      title: `From Template: ${template.name}`,
      description: template.description,
      signers,
      signing_order: template.signing_order,
      require_totp: template.require_totp,
      expires_in_days: validation.data!.expires_in_days || template.expires_in_days,
      metadata: {
        ...validation.data!.metadata,
        template_id: template.id,
        template_name: template.name,
      },
    }

    // Validate the merged request data using the schema (Comment 4)
    const { CreateSignatureRequestSchema, validateInput: validateRequestInput } = await import('@/lib/signature/validation/signature-validation-schemas')
    const requestValidation = validateRequestInput(CreateSignatureRequestSchema, requestData)

    if (!requestValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid signature request data from template',
            details: requestValidation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    // Create signature request
    const result = await signatureService.createRequest(user.id, requestValidation.data!)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    // Increment template usage
    await templateService.incrementUsage(template.id)

    return NextResponse.json(
      { data: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error applying template:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


/**
 * API Route: /api/v1/signatures/requests/[id]
 * Handles individual signature request operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/lib/signature/core/signature-service'
import { UpdateSignatureRequestSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * GET /api/v1/signatures/requests/[id]
 * Retrieve a single signature request
 */
export async function GET(
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

    const result = await signatureService.getRequest(id, user.id, user.email)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error fetching signature request:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/signatures/requests/[id]
 * Update a signature request
 */
export async function PATCH(
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
    const validation = validateInput(UpdateSignatureRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const result = await signatureService.updateRequest(id, user.id, user.email || '', validation.data!)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error updating signature request:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/signatures/requests/[id]
 * Delete a signature request
 */
export async function DELETE(
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

    const result = await signatureService.deleteRequest(id, user.id, user.email || '')

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error) {
    console.error('Error deleting signature request:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


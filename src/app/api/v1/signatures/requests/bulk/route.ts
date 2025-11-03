/**
 * API Route: /api/v1/signatures/requests/bulk
 * Handles bulk operations on signature requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { bulkOperationsService } from '@/lib/signature/bulk/bulk-operations-service'
import { BulkOperationSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'
import { checkRateLimit } from '@/lib/signature/middleware/rate-limit' // Comment 9

/**
 * POST /api/v1/signatures/requests/bulk
 * Execute bulk operations
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Rate limiting for bulk operations (Comment 9)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const rateLimitResult = await checkRateLimit(user.id, ip, 'signatureBulk')
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    const body = await request.json()
    const validation = validateInput(BulkOperationSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk operation data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { operation, request_ids, parameters } = validation.data!

    const result = await bulkOperationsService.executeBulkOperation(
      user.id,
      user.email || '',
      operation,
      request_ids,
      parameters
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error executing bulk operation:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


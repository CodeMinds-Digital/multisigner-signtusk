/**
 * API Route: /api/v1/signatures/requests
 * Handles signature request CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { signatureService } from '@/lib/signature/core/signature-service'
import {
  CreateSignatureRequestSchema,
  RequestListQuerySchema,
  validateInput
} from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'
import { checkRateLimit } from '@/lib/signature/middleware/rate-limit' // Comment 9

/**
 * GET /api/v1/signatures/requests
 * List signature requests with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      )
    }

    // Rate limiting (Comment 9)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const rateLimitResult = await checkRateLimit(user.id, ip, 'signature')
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    // Parse and validate query parameters (Comment 15)
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      status: searchParams.get('status'),
      view: searchParams.get('view'),
      search: searchParams.get('search'),
    }

    const validation = validateInput(RequestListQuerySchema, queryParams)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const { page, pageSize, status, view, search } = validation.data!

    // Call service with both user ID and email
    const result = await signatureService.listRequests(user.id, user.email || '', {
      page,
      pageSize,
      status,
      view,
      search,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    })

    // Add rate limit headers (Comment 9)
    if (rateLimitResult.limit && rateLimitResult.remaining !== undefined && rateLimitResult.reset) {
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
    }

    return response
  } catch (error) {
    console.error('Error listing signature requests:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/signatures/requests
 * Create a new signature request
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

    // Rate limiting (Comment 9)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
    const rateLimitResult = await checkRateLimit(user.id, ip, 'signature')
    if (!rateLimitResult.success && rateLimitResult.response) {
      return rateLimitResult.response
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = validateInput(CreateSignatureRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    // Create signature request
    const result = await signatureService.createRequest(user.id, validation.data!)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating signature request:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


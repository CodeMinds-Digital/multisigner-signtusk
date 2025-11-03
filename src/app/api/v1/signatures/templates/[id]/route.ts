/**
 * API Route: /api/v1/signatures/templates/[id]
 * Handles individual template operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/signature/templates/template-service'
import { UpdateTemplateSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'
import { getCachedTemplate, cacheTemplate, invalidateTemplateCache, addCacheHeaders } from '@/lib/signature/middleware/cache' // Comment 10

/**
 * GET /api/v1/signatures/templates/[id]
 * Retrieve a single template
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

    // Check for duplicate action
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    if (action === 'duplicate') {
      const newName = searchParams.get('name') || `Copy of Template`
      const result = await templateService.duplicateTemplate(id, user.id, newName)

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: result.data }, { status: 201 })
    }

    // Try to get from cache first (Comment 10)
    const cached = await getCachedTemplate(id)
    if (cached) {
      const response = NextResponse.json({ data: cached })
      response.headers.set('X-Cache', 'HIT')
      return addCacheHeaders(response)
    }

    const result = await templateService.getTemplate(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Cache the result (Comment 10)
    await cacheTemplate(id, result.data)

    const response = NextResponse.json({ data: result.data })
    response.headers.set('X-Cache', 'MISS')
    return addCacheHeaders(response)
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/signatures/templates/[id]
 * Update a template
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
    const validation = validateInput(UpdateTemplateSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template update data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const result = await templateService.updateTemplate(id, user.id, validation.data!)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Invalidate cache after update (Comment 10)
    await invalidateTemplateCache(id)

    return NextResponse.json({ data: result.data })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/signatures/templates/[id]
 * Delete a template
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

    const result = await templateService.deleteTemplate(id, user.id)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Invalidate cache after deletion (Comment 10)
    await invalidateTemplateCache(id)

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


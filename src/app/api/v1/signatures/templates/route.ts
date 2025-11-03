/**
 * API Route: /api/v1/signatures/templates
 * Handles signature template management
 */

import { NextRequest, NextResponse } from 'next/server'
import { templateService } from '@/lib/signature/templates/template-service'
import { CreateTemplateSchema, validateInput } from '@/lib/signature/validation/signature-validation-schemas'
import { getSupabaseClient } from '@/lib/dynamic-supabase'

/**
 * GET /api/v1/signatures/templates
 * List templates
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

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const isPublic = searchParams.get('is_public') === 'true' ? true : searchParams.get('is_public') === 'false' ? false : undefined
    const search = searchParams.get('search') || undefined

    const result = await templateService.listTemplates(user.id, {
      page,
      pageSize,
      isPublic,
      search,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    })
  } catch (error) {
    console.error('Error listing templates:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/signatures/templates
 * Create a new template
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

    const body = await request.json()
    const validation = validateInput(CreateTemplateSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid template data',
            details: validation.errors?.flatten(),
          },
        },
        { status: 400 }
      )
    }

    const result = await templateService.createTemplate(user.id, validation.data!)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.statusCode || 500 }
      )
    }

    return NextResponse.json(
      { data: result.data },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}


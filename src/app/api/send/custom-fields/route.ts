import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/custom-fields - Get user's custom fields
export async function GET(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    // Build query
    let query = supabaseAdmin
      .from('send_custom_fields')
      .select('*')
      .eq('user_id', userId)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: customFields, error } = await query
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching custom fields:', error)
      return NextResponse.json(
        { error: 'Failed to fetch custom fields' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      custom_fields: customFields || []
    })

  } catch (error) {
    console.error('Custom fields API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/custom-fields - Create custom field
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    const body = await request.json()
    const {
      name,
      label,
      field_type,
      description,
      placeholder,
      is_required = false,
      field_config = {},
      validation_rules = {},
      display_order = 0,
      group_name
    } = body

    // Validate required fields
    if (!name || !label || !field_type) {
      return NextResponse.json(
        { error: 'Name, label, and field_type are required' },
        { status: 400 }
      )
    }

    // Validate field type
    const validFieldTypes = ['text', 'email', 'phone', 'number', 'select', 'multiselect', 'textarea', 'checkbox', 'date', 'url']
    if (!validFieldTypes.includes(field_type)) {
      return NextResponse.json(
        { error: 'Invalid field type' },
        { status: 400 }
      )
    }

    // Create custom field
    const { data: customField, error: createError } = await supabaseAdmin
      .from('send_custom_fields')
      .insert({
        user_id: userId,
        name: name.trim(),
        label: label.trim(),
        field_type,
        description: description?.trim() || null,
        placeholder: placeholder?.trim() || null,
        is_required,
        field_config,
        validation_rules,
        display_order,
        group_name: group_name?.trim() || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating custom field:', createError)
      
      // Handle unique constraint violation
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A custom field with this name already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create custom field' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      custom_field: customField
    })

  } catch (error) {
    console.error('Create custom field API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

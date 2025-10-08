import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/custom-fields/[id] - Get custom field details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get custom field
    const { data: customField, error } = await supabaseAdmin
      .from('send_custom_fields')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !customField) {
      return NextResponse.json(
        { error: 'Custom field not found' },
        { status: 404 }
      )
    }

    // Get usage statistics
    const { data: usageStats, error: statsError } = await supabaseAdmin
      .from('send_custom_field_responses')
      .select('id, submitted_at')
      .eq('field_id', id)

    if (statsError) {
      console.error('Error fetching usage stats:', statsError)
    }

    return NextResponse.json({
      success: true,
      custom_field: {
        ...customField,
        usage_count: usageStats?.length || 0,
        last_used: usageStats && usageStats.length > 0 ?
          Math.max(...usageStats.map(s => new Date(s.submitted_at).getTime())) : null
      }
    })

  } catch (error) {
    console.error('Get custom field API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/custom-fields/[id] - Update custom field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify field exists and belongs to user
    const { data: existingField, error: verifyError } = await supabaseAdmin
      .from('send_custom_fields')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (verifyError || !existingField) {
      return NextResponse.json(
        { error: 'Custom field not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      label,
      field_type,
      description,
      placeholder,
      is_required,
      is_active,
      field_config,
      validation_rules,
      display_order,
      group_name
    } = body

    // Validate field type if provided
    if (field_type) {
      const validFieldTypes = ['text', 'email', 'phone', 'number', 'select', 'multiselect', 'textarea', 'checkbox', 'date', 'url']
      if (!validFieldTypes.includes(field_type)) {
        return NextResponse.json(
          { error: 'Invalid field type' },
          { status: 400 }
        )
      }
    }

    // Update custom field
    const updateData: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updateData.name = name.trim()
    if (label !== undefined) updateData.label = label.trim()
    if (field_type !== undefined) updateData.field_type = field_type
    if (description !== undefined) updateData.description = description?.trim() || null
    if (placeholder !== undefined) updateData.placeholder = placeholder?.trim() || null
    if (is_required !== undefined) updateData.is_required = is_required
    if (is_active !== undefined) updateData.is_active = is_active
    if (field_config !== undefined) updateData.field_config = field_config
    if (validation_rules !== undefined) updateData.validation_rules = validation_rules
    if (display_order !== undefined) updateData.display_order = display_order
    if (group_name !== undefined) updateData.group_name = group_name?.trim() || null

    const { data: updatedField, error: updateError } = await supabaseAdmin
      .from('send_custom_fields')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating custom field:', updateError)

      // Handle unique constraint violation
      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A custom field with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update custom field' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      custom_field: updatedField
    })

  } catch (error) {
    console.error('Update custom field API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/custom-fields/[id] - Delete custom field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Check if field has responses
    const { data: responses } = await supabaseAdmin
      .from('send_custom_field_responses')
      .select('id')
      .eq('field_id', id)
      .limit(1)

    if (responses && responses.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete custom field that has responses. Deactivate it instead.' },
        { status: 400 }
      )
    }

    // Delete custom field
    const { error: deleteError } = await supabaseAdmin
      .from('send_custom_fields')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error deleting custom field:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete custom field' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Delete custom field API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

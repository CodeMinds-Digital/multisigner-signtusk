import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/send/custom-fields/responses - Submit field responses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { link_id, session_id, responses, viewer_email } = body

    if (!link_id || !session_id || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'link_id, session_id, and responses array are required' },
        { status: 400 }
      )
    }

    // Get client information
    const userAgent = request.headers.get('user-agent') || ''
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwarded?.split(',')[0] || realIp || '127.0.0.1'

    // Verify link exists
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_document_links')
      .select('id')
      .eq('id', link_id)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Get custom fields for this link
    const { data: linkFields, error: fieldsError } = await supabaseAdmin
      .rpc('get_link_custom_fields', { link_id_param: link_id })

    if (fieldsError) {
      console.error('Error fetching link fields:', fieldsError)
      return NextResponse.json(
        { error: 'Failed to fetch custom fields' },
        { status: 500 }
      )
    }

    const fieldMap = new Map(linkFields.map(f => [f.field_id, f]))
    const validationErrors = []
    const responseInserts = []

    // Validate and prepare responses
    for (const response of responses) {
      const { field_id, field_value, field_values } = response
      
      if (!field_id) {
        validationErrors.push('field_id is required for all responses')
        continue
      }

      const fieldDef = fieldMap.get(field_id)
      if (!fieldDef) {
        validationErrors.push(`Field ${field_id} not found or not assigned to this link`)
        continue
      }

      // Validate field response using the database function
      const { data: isValid, error: validationError } = await supabaseAdmin
        .rpc('validate_custom_field_response', {
          field_id_param: field_id,
          field_value_param: field_value || null,
          field_values_param: field_values || null
        })

      if (validationError) {
        console.error('Validation error:', validationError)
        validationErrors.push(`Validation failed for field ${fieldDef.name}`)
        continue
      }

      if (!isValid) {
        validationErrors.push(`Invalid value for field ${fieldDef.label}`)
        continue
      }

      // Prepare response insert
      responseInserts.push({
        field_id,
        link_id,
        session_id,
        viewer_email: viewer_email || null,
        field_value: field_value || null,
        field_values: field_values || null,
        ip_address: ipAddress,
        user_agent: userAgent
      })
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    if (responseInserts.length === 0) {
      return NextResponse.json(
        { error: 'No valid responses to submit' },
        { status: 400 }
      )
    }

    // Insert responses (upsert to handle duplicate submissions)
    const { data: insertedResponses, error: insertError } = await supabaseAdmin
      .from('send_custom_field_responses')
      .upsert(responseInserts, {
        onConflict: 'field_id,session_id',
        ignoreDuplicates: false
      })
      .select()

    if (insertError) {
      console.error('Error inserting field responses:', insertError)
      return NextResponse.json(
        { error: 'Failed to save responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      responses: insertedResponses,
      count: insertedResponses?.length || 0
    })

  } catch (error) {
    console.error('Submit field responses API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/send/custom-fields/responses - Get field responses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('link_id')
    const sessionId = searchParams.get('session_id')
    const fieldId = searchParams.get('field_id')

    if (!linkId) {
      return NextResponse.json(
        { error: 'link_id is required' },
        { status: 400 }
      )
    }

    let query = supabaseAdmin
      .from('send_custom_field_responses')
      .select(`
        *,
        field:send_custom_fields(id, name, label, field_type)
      `)
      .eq('link_id', linkId)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    if (fieldId) {
      query = query.eq('field_id', fieldId)
    }

    const { data: responses, error } = await query
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching field responses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch responses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      responses: responses || []
    })

  } catch (error) {
    console.error('Get field responses API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/branding - Get branding settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Get branding settings
    const { data: branding, error: brandingError } = await supabaseAdmin
      .from('send_dataroom_branding')
      .select('*')
      .eq('data_room_id', roomId)
      .single()

    if (brandingError && brandingError.code !== 'PGRST116') {
      console.error('Error fetching branding settings:', brandingError)
      return NextResponse.json(
        { error: 'Failed to fetch branding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      branding: branding || null
    })

  } catch (error: any) {
    console.error('Get branding settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/data-rooms/[roomId]/branding - Create or update branding settings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      logo_url,
      banner_url,
      favicon_url,
      primary_color,
      secondary_color,
      background_color,
      text_color,
      custom_css,
      social_title,
      social_description,
      social_image_url,
      custom_domain,
      show_branding
    } = body

    // Check if branding settings already exist
    const { data: existingBranding } = await supabaseAdmin
      .from('send_dataroom_branding')
      .select('id')
      .eq('data_room_id', roomId)
      .single()

    let result
    if (existingBranding) {
      // Update existing branding
      const { data, error } = await supabaseAdmin
        .from('send_dataroom_branding')
        .update({
          logo_url,
          banner_url,
          favicon_url,
          primary_color,
          secondary_color,
          background_color,
          text_color,
          custom_css,
          social_title,
          social_description,
          social_image_url,
          custom_domain,
          show_branding,
          updated_at: new Date().toISOString()
        })
        .eq('data_room_id', roomId)
        .select()
        .single()

      result = { data, error }
    } else {
      // Create new branding
      const { data, error } = await supabaseAdmin
        .from('send_dataroom_branding')
        .insert({
          data_room_id: roomId,
          logo_url,
          banner_url,
          favicon_url,
          primary_color,
          secondary_color,
          background_color,
          text_color,
          custom_css,
          social_title,
          social_description,
          social_image_url,
          custom_domain,
          show_branding,
          created_by: userId
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      console.error('Error saving branding settings:', result.error)
      return NextResponse.json(
        { error: 'Failed to save branding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      branding: result.data
    })

  } catch (error: any) {
    console.error('Save branding settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/send/data-rooms/[roomId]/branding - Reset branding to defaults
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params
    const { accessToken } = getAuthTokensFromRequest(request)
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Verify user owns the dataroom
    const { data: dataroom, error: dataroomError } = await supabaseAdmin
      .from('send_data_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Delete branding settings
    const { error: deleteError } = await supabaseAdmin
      .from('send_dataroom_branding')
      .delete()
      .eq('data_room_id', roomId)

    if (deleteError) {
      console.error('Error deleting branding settings:', deleteError)
      return NextResponse.json(
        { error: 'Failed to reset branding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Branding settings reset to defaults'
    })

  } catch (error: any) {
    console.error('Delete branding settings error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

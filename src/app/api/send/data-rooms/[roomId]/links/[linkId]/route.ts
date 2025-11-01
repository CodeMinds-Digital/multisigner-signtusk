import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// DELETE /api/send/data-rooms/[roomId]/links/[linkId] - Delete a specific share link
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; linkId: string }> }
) {
  try {
    const { roomId, linkId } = await params
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

    // Verify link belongs to this data room
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('id')
      .eq('id', linkId)
      .eq('data_room_id', roomId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    // Delete the link
    const { error: deleteError } = await supabaseAdmin
      .from('send_dataroom_links')
      .delete()
      .eq('id', linkId)

    if (deleteError) {
      console.error('Error deleting data room link:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Link deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete data room link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/send/data-rooms/[roomId]/links/[linkId] - Update a specific share link
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; linkId: string }> }
) {
  try {
    const { roomId, linkId } = await params
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

    // Verify link belongs to this data room
    const { data: link, error: linkError } = await supabaseAdmin
      .from('send_dataroom_links')
      .select('*')
      .eq('id', linkId)
      .eq('data_room_id', roomId)
      .single()

    if (linkError || !link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const {
      name,
      is_active,
      expires_at,
      view_limit,
      download_enabled,
      watermark_enabled,
      screenshot_protection
    } = body

    // Update the link
    const { data: updatedLink, error: updateError } = await supabaseAdmin
      .from('send_dataroom_links')
      .update({
        ...(name !== undefined && { name: name.trim() }),
        ...(is_active !== undefined && { is_active }),
        ...(expires_at !== undefined && { expires_at }),
        ...(view_limit !== undefined && { view_limit }),
        ...(download_enabled !== undefined && { download_enabled }),
        ...(watermark_enabled !== undefined && { watermark_enabled }),
        ...(screenshot_protection !== undefined && { screenshot_protection }),
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating data room link:', updateError)
      return NextResponse.json(
        { error: 'Failed to update link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      link: {
        id: updatedLink.id,
        slug: updatedLink.slug,
        name: updatedLink.name,
        password_protected: !!updatedLink.password_hash,
        expires_at: updatedLink.expires_at,
        view_limit: updatedLink.view_limit,
        download_enabled: updatedLink.download_enabled,
        watermark_enabled: updatedLink.watermark_enabled,
        screenshot_protection: updatedLink.screenshot_protection,
        created_at: updatedLink.created_at,
        total_views: updatedLink.total_views || 0,
        is_active: updatedLink.is_active
      }
    })

  } catch (error: any) {
    console.error('Update data room link error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

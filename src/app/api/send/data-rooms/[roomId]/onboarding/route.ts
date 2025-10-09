import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/data-rooms/[roomId]/onboarding - Get onboarding steps
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
      .select('id, name')
      .eq('id', roomId)
      .eq('user_id', userId)
      .single()

    if (dataroomError || !dataroom) {
      return NextResponse.json(
        { error: 'Dataroom not found' },
        { status: 404 }
      )
    }

    // Check completion status for each step
    const [documentsRes, collaboratorsRes, brandingRes, permissionsRes, linksRes] = await Promise.all([
      supabaseAdmin
        .from('send_documents')
        .select('id')
        .eq('data_room_id', roomId)
        .limit(1),
      supabaseAdmin
        .from('send_dataroom_collaborators')
        .select('id')
        .eq('data_room_id', roomId)
        .limit(1),
      supabaseAdmin
        .from('send_dataroom_branding')
        .select('id')
        .eq('data_room_id', roomId)
        .limit(1),
      supabaseAdmin
        .from('send_dataroom_permissions')
        .select('id')
        .eq('data_room_id', roomId)
        .limit(1),
      supabaseAdmin
        .from('send_document_links')
        .select('id')
        .eq('data_room_id', roomId)
        .limit(1)
    ])

    const hasDocuments = (documentsRes.data?.length || 0) > 0
    const hasCollaborators = (collaboratorsRes.data?.length || 0) > 0
    const hasBranding = (brandingRes.data?.length || 0) > 0
    const hasPermissions = (permissionsRes.data?.length || 0) > 0
    const hasLinks = (linksRes.data?.length || 0) > 0

    const steps = [
      {
        id: 'upload-documents',
        title: 'Upload Your First Document',
        description: 'Add documents to your data room to get started',
        completed: hasDocuments,
        action: hasDocuments ? undefined : 'Upload Now'
      },
      {
        id: 'invite-collaborators',
        title: 'Invite Team Members',
        description: 'Add collaborators to work together on your data room',
        completed: hasCollaborators,
        action: hasCollaborators ? undefined : 'Invite Now'
      },
      {
        id: 'set-permissions',
        title: 'Configure Permissions',
        description: 'Set up access controls and user permissions',
        completed: hasPermissions,
        action: hasPermissions ? undefined : 'Set Permissions'
      },
      {
        id: 'customize-branding',
        title: 'Customize Branding',
        description: 'Add your logo and customize the appearance',
        completed: hasBranding,
        action: hasBranding ? undefined : 'Customize'
      },
      {
        id: 'create-share-link',
        title: 'Create Share Link',
        description: 'Generate a secure link to share your data room',
        completed: hasLinks,
        action: hasLinks ? undefined : 'Create Link'
      }
    ]

    return NextResponse.json({
      success: true,
      steps
    })

  } catch (error: any) {
    console.error('Get onboarding steps error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

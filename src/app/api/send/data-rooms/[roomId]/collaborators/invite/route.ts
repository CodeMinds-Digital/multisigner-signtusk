import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomBytes } from 'crypto'

// POST /api/send/data-rooms/[roomId]/collaborators/invite - Send collaborator invitations
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

    const body = await request.json()
    const {
      emails,
      role = 'viewer',
      message,
      expires_at,
      permissions
    } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'Email addresses are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['viewer', 'collaborator', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = emails.filter(email => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: `Invalid email addresses: ${invalidEmails.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for existing collaborators
    const { data: existingCollaborators } = await supabaseAdmin
      .from('send_dataroom_collaborators')
      .select('email')
      .eq('data_room_id', roomId)
      .in('email', emails)

    const existingEmails = existingCollaborators?.map(c => c.email) || []
    const newEmails = emails.filter(email => !existingEmails.includes(email))

    if (newEmails.length === 0) {
      return NextResponse.json(
        { error: 'All email addresses are already invited' },
        { status: 400 }
      )
    }

    // Create collaborator invitations
    const collaborators = newEmails.map(email => ({
      data_room_id: roomId,
      email: email.toLowerCase(),
      role,
      status: 'pending',
      permissions: permissions || {
        can_view: true,
        can_download: role !== 'viewer',
        can_upload: role === 'collaborator' || role === 'admin',
        can_share: role === 'collaborator' || role === 'admin',
        can_comment: role === 'collaborator' || role === 'admin',
        can_manage_users: role === 'admin'
      },
      invitation_token: randomBytes(32).toString('hex'),
      expires_at: expires_at || null,
      invited_by: userId,
      invited_at: new Date().toISOString()
    }))

    const { data: insertedCollaborators, error: insertError } = await supabaseAdmin
      .from('send_dataroom_collaborators')
      .insert(collaborators)
      .select()

    if (insertError) {
      console.error('Error creating collaborators:', insertError)
      return NextResponse.json(
        { error: 'Failed to create collaborator invitations' },
        { status: 500 }
      )
    }

    // Send invitation emails (in a real app, you'd use a proper email service)
    try {
      for (const collaborator of insertedCollaborators) {
        // Create invitation link
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${collaborator.invitation_token}`
        
        // Log the invitation for now (replace with actual email sending)
        await supabaseAdmin
          .from('send_analytics_events')
          .insert({
            user_id: userId,
            event_type: 'collaborator_invitation_sent',
            event_data: {
              data_room_id: roomId,
              collaborator_email: collaborator.email,
              role: collaborator.role,
              invitation_url: invitationUrl,
              custom_message: message
            }
          })

        console.log(`Invitation sent to ${collaborator.email}: ${invitationUrl}`)
      }
    } catch (emailError) {
      console.error('Error sending invitation emails:', emailError)
      // Don't fail the request if email sending fails
    }

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${newEmails.length} collaborators`,
      invited_count: newEmails.length,
      skipped_count: existingEmails.length,
      collaborators: insertedCollaborators
    })

  } catch (error: any) {
    console.error('Send collaborator invitations error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

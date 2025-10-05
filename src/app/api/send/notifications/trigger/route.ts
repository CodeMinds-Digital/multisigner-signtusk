import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SendNotifications, NotificationData } from '@/lib/send-notifications'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * POST /api/send/notifications/trigger
 * Trigger a notification for a document event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      documentId,
      type,
      visitorEmail,
      visitorFingerprint,
      visitorLocation,
      metadata
    } = body

    if (!documentId || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get document info
    const { data: document } = await supabaseAdmin
      .from('send_shared_documents')
      .select('id, user_id, title')
      .eq('id', documentId)
      .single()

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', document.user_id)
      .single()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Create notification data
    const notification: NotificationData = {
      type,
      documentId: document.id,
      documentTitle: document.title,
      visitorEmail,
      visitorFingerprint,
      visitorLocation,
      metadata
    }

    // Send notification through all enabled channels
    await SendNotifications.notify(
      document.user_id,
      user.email,
      notification
    )

    return NextResponse.json({
      success: true,
      message: 'Notification sent'
    })
  } catch (error: any) {
    console.error('Notification trigger error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger notification' },
      { status: 500 }
    )
  }
}


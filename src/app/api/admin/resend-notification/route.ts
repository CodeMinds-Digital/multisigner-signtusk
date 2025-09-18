import { NextRequest } from 'next/server'
import { SequentialNotificationService } from '@/lib/sequential-notification-service'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { notificationId } = await request.json()

    if (!notificationId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Notification ID is required' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📧 Admin resend notification:', notificationId)

    // Get the original notification details
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (notificationError || !notification) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Notification not found' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the signing request details
    const { data: signingRequest, error: requestError } = await supabaseAdmin
      .from('signing_requests')
      .select('*')
      .eq('id', notification.signing_request_id)
      .single()

    if (requestError || !signingRequest) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Signing request not found' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get signer details
    const { data: signer, error: signerError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('*')
      .eq('signing_request_id', notification.signing_request_id)
      .eq('signer_email', notification.recipient_email)
      .single()

    if (signerError || !signer) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Signer not found' 
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let result: { success: boolean; messageId?: string; error?: string }

    // Resend based on notification type
    switch (notification.notification_type) {
      case 'sequential_next':
        result = await SequentialNotificationService.sendNextSignerNotification(
          notification.signing_request_id,
          notification.recipient_email,
          signer.signer_name,
          signingRequest.title,
          signer.signing_order,
          signingRequest.signers?.length || 1
        )
        break

      case 'reminder':
        result = await SequentialNotificationService.sendReminderNotification(
          notification.signing_request_id,
          notification.recipient_email,
          signer.signer_name,
          signingRequest.title,
          new Date(signingRequest.expires_at)
        )
        break

      case 'completion':
        // For completion notifications, we'd need to implement a completion notification service
        result = { success: false, error: 'Completion notification resend not implemented' }
        break

      default:
        result = { success: false, error: 'Unknown notification type' }
    }

    if (result.success) {
      // Update the original notification log to mark it as resent
      await supabaseAdmin
        .from('notification_logs')
        .update({
          status: 'resent',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)

      console.log('✅ Notification resent successfully')
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notification resent successfully',
          messageId: result.messageId
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      console.error('❌ Failed to resend notification:', result.error)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to resend notification'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error in resend notification API:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

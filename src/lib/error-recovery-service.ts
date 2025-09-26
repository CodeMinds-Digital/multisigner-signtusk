import { supabaseAdmin } from './supabase-admin'
import { NotificationService } from './notification-service'
import { PDFGenerationService } from './pdf-generation-service'

export interface RecoveryAction {
  id: string
  type: 'retry_pdf' | 'skip_signer' | 'extend_deadline' | 'reset_signer' | 'cancel_request'
  description: string
  automated: boolean
  requiresAdmin: boolean
}

export interface ErrorRecoveryConfig {
  requestId: string
  errorType: 'pdf_generation_failed' | 'signer_declined' | 'request_expired' | 'corrupted_data' | 'notification_failed'
  errorDetails: string
  affectedSigner?: string
  timestamp: string
}

export class ErrorRecoveryService {
  /**
   * Handle signer decline in sequential workflow
   */
  static async handleSignerDecline(
    requestId: string,
    signerEmail: string,
    reason?: string
  ): Promise<{ success: boolean; action: string; error?: string }> {
    try {
      console.log(`🚫 Handling signer decline: ${signerEmail} for request ${requestId}`)

      // Get signing request details
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*),
          signers:signing_request_signers(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, action: 'none', error: 'Signing request not found' }
      }

      // Update signer status
      await supabaseAdmin
        .from('signing_request_signers')
        .update({
          status: 'declined',
          signer_status: 'declined',
          declined_at: new Date().toISOString(),
          decline_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)

      // Determine signing mode
      let signingMode = 'sequential'
      try {
        if (signingRequest.document?.settings) {
          const settings = typeof signingRequest.document.settings === 'string'
            ? JSON.parse(signingRequest.document.settings)
            : signingRequest.document.settings
          signingMode = settings.signing_order || 'sequential'
        }
      } catch (_error) {
        console.log('⚠️ Could not parse document settings, using sequential mode')
      }

      if (signingMode === 'sequential') {
        // In sequential mode, decline stops the process
        await supabaseAdmin
          .from('signing_requests')
          .update({
            status: 'declined',
            document_status: 'declined',
            declined_by: signerEmail,
            declined_at: new Date().toISOString(),
            decline_reason: reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        // Notify requester
        try {
          await NotificationService.createNotification(
            signingRequest.initiated_by || '',
            'signature_request_declined',
            'Signature Declined',
            `${signerEmail} has declined to sign "${signingRequest.title || 'Document'}". Reason: ${reason}`,
            { requestId, signerEmail, reason }
          )
        } catch (notificationError) {
          console.error('❌ Error sending decline notification:', notificationError)
        }

        return { success: true, action: 'request_cancelled' }
      } else {
        // In parallel mode, check if enough signers remain
        const allSigners = signingRequest.signers
        const declinedCount = allSigners.filter((s: any) => s.status === 'declined').length
        const signedCount = allSigners.filter((s: any) => s.status === 'signed' || s.signer_status === 'signed').length
        const remainingSigners = allSigners.length - declinedCount - signedCount

        // If no remaining signers, cancel the request
        if (remainingSigners === 0) {
          await supabaseAdmin
            .from('signing_requests')
            .update({
              status: 'declined',
              document_status: 'declined',
              declined_by: signerEmail,
              declined_at: new Date().toISOString(),
              decline_reason: 'All remaining signers declined',
              updated_at: new Date().toISOString()
            })
            .eq('id', requestId)

          return { success: true, action: 'request_cancelled' }
        }

        return { success: true, action: 'continue_with_remaining' }
      }
    } catch (error) {
      console.error('❌ Error handling signer decline:', error)
      return {
        success: false,
        action: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Handle expired signing requests
   */
  static async handleExpiredRequest(requestId: string): Promise<{
    success: boolean
    action: string
    error?: string
  }> {
    try {
      console.log(`⏰ Handling expired request: ${requestId}`)

      // Get signing request details
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, action: 'none', error: 'Signing request not found' }
      }

      // Check if already completed
      if (signingRequest.status === 'completed') {
        return { success: true, action: 'already_completed' }
      }

      // Check if any signers have signed
      const signedSigners = signingRequest.signers.filter((s: any) =>
        s.status === 'signed' || s.signer_status === 'signed'
      )

      if (signedSigners.length > 0) {
        // Partial signatures exist - mark as partially expired
        await supabaseAdmin
          .from('signing_requests')
          .update({
            status: 'partially_expired',
            document_status: 'partially_expired',
            expired_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        // Notify requester about partial completion
        try {
          await NotificationService.createNotification(
            signingRequest.initiated_by || '',
            'signature_request_expired',
            'Document Partially Expired',
            `"${signingRequest.title || 'Document'}" has expired with partial completion. ${signedSigners.length} of ${signingRequest.signers.length} signers completed.`,
            { requestId, signedCount: signedSigners.length, totalSigners: signingRequest.signers.length }
          )
        } catch (notificationError) {
          console.error('❌ Error sending partial expiration notification:', notificationError)
        }

        return { success: true, action: 'marked_partially_expired' }
      } else {
        // No signatures - mark as fully expired
        await supabaseAdmin
          .from('signing_requests')
          .update({
            status: 'expired',
            document_status: 'expired',
            expired_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        // Notify requester about full expiration
        try {
          await NotificationService.createNotification(
            signingRequest.initiated_by || '',
            'signature_request_expired',
            'Document Expired',
            `"${signingRequest.title || 'Document'}" has expired without any signatures.`,
            { requestId }
          )
        } catch (notificationError) {
          console.error('❌ Error sending expiration notification:', notificationError)
        }

        return { success: true, action: 'marked_expired' }
      }
    } catch (error) {
      console.error('❌ Error handling expired request:', error)
      return {
        success: false,
        action: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Retry failed PDF generation
   */
  static async retryPDFGeneration(requestId: string): Promise<{
    success: boolean
    finalPdfUrl?: string
    error?: string
  }> {
    try {
      console.log(`🔄 Retrying PDF generation for request: ${requestId}`)

      // Check if request is in a state that allows PDF generation
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, error: 'Signing request not found' }
      }

      if (signingRequest.status !== 'pdf_generation_failed' && signingRequest.status !== 'completed') {
        return { success: false, error: 'Request is not in a state that allows PDF retry' }
      }

      // Reset error status
      await supabaseAdmin
        .from('signing_requests')
        .update({
          status: 'in_progress',
          document_status: 'generating_pdf',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // Attempt PDF generation
      const finalPdfUrl = await PDFGenerationService.generateFinalPDF(requestId)

      if (finalPdfUrl) {
        console.log('✅ PDF generation retry successful')
        return { success: true, finalPdfUrl }
      } else {
        // Mark as failed again
        await supabaseAdmin
          .from('signing_requests')
          .update({
            status: 'pdf_generation_failed',
            document_status: 'pdf_generation_failed',
            error_message: 'PDF generation retry failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        return { success: false, error: 'PDF generation retry failed' }
      }
    } catch (error) {
      console.error('❌ Error retrying PDF generation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Reset a signer's status to allow re-signing
   */
  static async resetSigner(
    requestId: string,
    signerEmail: string,
    adminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔄 Resetting signer: ${signerEmail} for request ${requestId}`)

      // Verify admin permissions (in real implementation, check admin role)
      if (!adminEmail) {
        return { success: false, error: 'Admin authentication required' }
      }

      // Reset signer status
      const { error: updateError } = await supabaseAdmin
        .from('signing_request_signers')
        .update({
          status: 'pending',
          signer_status: 'pending',
          signature_data: null,
          field_values: null,
          signed_at: null,
          declined_at: null,
          decline_reason: null,
          viewed_at: null,
          reset_by: adminEmail,
          reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)

      if (updateError) {
        return { success: false, error: 'Failed to reset signer status' }
      }

      // Update signing request status if needed
      await supabaseAdmin
        .from('signing_requests')
        .update({
          status: 'in_progress',
          document_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      // Send notification to signer about reset
      try {
        // Get signer's user ID
        const { data: signerUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', signerEmail)
          .single()

        if (signerUser) {
          await NotificationService.createNotification(
            signerUser.id,
            'signature_request_updated',
            'Signature Reset',
            `Your signature status has been reset by an administrator. You can now sign the document again.`,
            { requestId, adminEmail }
          )
        }
      } catch (notificationError) {
        console.error('❌ Error sending reset notification:', notificationError)
      }

      console.log('✅ Signer reset successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Error resetting signer:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Extend signing request deadline
   */
  static async extendDeadline(
    requestId: string,
    newExpirationDate: string,
    adminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📅 Extending deadline for request: ${requestId} to ${newExpirationDate}`)

      // Validate new expiration date
      const newExpiration = new Date(newExpirationDate)
      if (isNaN(newExpiration.getTime()) || newExpiration <= new Date()) {
        return { success: false, error: 'Invalid expiration date' }
      }

      // Update signing request
      const { error: updateError } = await supabaseAdmin
        .from('signing_requests')
        .update({
          expires_at: newExpiration.toISOString(),
          extended_by: adminEmail,
          extended_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        return { success: false, error: 'Failed to extend deadline' }
      }

      // Notify pending signers about extension
      const { data: pendingSigners } = await supabaseAdmin
        .from('signing_request_signers')
        .select('signer_email, signer_name')
        .eq('signing_request_id', requestId)
        .neq('status', 'signed')
        .neq('status', 'declined')

      if (pendingSigners) {
        for (const signer of pendingSigners) {
          try {
            // Get signer's user ID
            const { data: signerUser } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('email', signer.signer_email)
              .single()

            if (signerUser) {
              await NotificationService.createNotification(
                signerUser.id,
                'signature_request_updated',
                'Deadline Extended',
                `The deadline for signing the document has been extended to ${newExpirationDate}.`,
                { requestId, newDeadline: newExpirationDate }
              )
            }
          } catch (notificationError) {
            console.error(`❌ Error sending extension notification to ${signer.signer_email}:`, notificationError)
          }
        }
      }

      console.log('✅ Deadline extended successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Error extending deadline:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process expired requests automatically
   */
  static async processExpiredRequests(): Promise<{
    processed: number
    expired: number
    errors: string[]
  }> {
    try {
      console.log('🔄 Processing expired signing requests...')

      // Find expired requests
      const { data: expiredRequests, error } = await supabaseAdmin
        .from('signing_requests')
        .select('id, title, expires_at')
        .lt('expires_at', new Date().toISOString())
        .in('status', ['pending', 'in_progress'])

      if (error || !expiredRequests) {
        return { processed: 0, expired: 0, errors: ['Failed to fetch expired requests'] }
      }

      let processed = 0
      let expired = 0
      const errors: string[] = []

      for (const request of expiredRequests) {
        processed++

        try {
          const result = await this.handleExpiredRequest(request.id)
          if (result.success) {
            expired++
          } else {
            errors.push(`Failed to process ${request.id}: ${result.error}`)
          }
        } catch (error) {
          errors.push(`Error processing ${request.id}: ${error}`)
        }
      }

      console.log(`✅ Processed ${processed} expired requests, marked ${expired} as expired`)
      return { processed, expired, errors }
    } catch (error) {
      return {
        processed: 0,
        expired: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }
}

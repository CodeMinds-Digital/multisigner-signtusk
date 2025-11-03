/**
 * Multi-Signature Workflow Service
 * Legacy service for backward compatibility
 * New implementations should use src/lib/signature/core/signature-service.ts
 */

import { supabaseAdmin } from './supabase-admin'

export class MultiSignatureWorkflowService {
  /**
   * Handle signer completion
   * @deprecated Use signatureService.signDocument() instead
   */
  static async handleSignerCompletion(requestId: string, userEmail: string) {
    try {
      // Get the signing request
      const { data: request, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError || !request) {
        return {
          success: false,
          error: 'Signing request not found'
        }
      }

      // Get the signer
      const { data: signer, error: signerError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .eq('signer_email', userEmail)
        .single()

      if (signerError || !signer) {
        return {
          success: false,
          error: 'Signer not found'
        }
      }

      // Update signer status
      const { error: updateError } = await supabaseAdmin
        .from('signing_request_signers')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString()
        })
        .eq('id', signer.id)

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update signer status'
        }
      }

      // Check if all signers have signed
      const { data: allSigners, error: allSignersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)

      if (allSignersError) {
        return {
          success: false,
          error: 'Failed to fetch signers'
        }
      }

      const allSigned = allSigners.every(s => s.status === 'signed')

      // Update request status if all signed
      if (allSigned) {
        await supabaseAdmin
          .from('signing_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', requestId)
      }

      return {
        success: true,
        allSigned,
        nextSigner: null
      }
    } catch (error) {
      console.error('Error in handleSignerCompletion:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Track document view
   * @deprecated Use signatureService instead
   */
  static async trackDocumentView(requestId: string, userEmail: string) {
    try {
      // Update signer viewed_at timestamp
      const { error } = await supabaseAdmin
        .from('signing_request_signers')
        .update({
          viewed_at: new Date().toISOString()
        })
        .eq('signing_request_id', requestId)
        .eq('signer_email', userEmail)
        .is('viewed_at', null) // Only update if not already viewed

      return !error
    } catch (error) {
      console.error('Error tracking document view:', error)
      return false
    }
  }

  /**
   * Validate sequential signing permission
   * @deprecated Use signatureService instead
   */
  static async validateSequentialSigningPermission(requestId: string, userEmail: string) {
    try {
      // Get the signing request
      const { data: request, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError || !request) {
        return {
          allowed: false,
          reason: 'Signing request not found'
        }
      }

      // If not sequential, allow
      if (!request.signing_order || request.signing_order !== 'sequential') {
        return {
          allowed: true
        }
      }

      // Get all signers ordered by signing_order
      const { data: signers, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order', { ascending: true })

      if (signersError || !signers) {
        return {
          allowed: false,
          reason: 'Failed to fetch signers'
        }
      }

      // Find current signer
      const currentSignerIndex = signers.findIndex(s => s.signer_email === userEmail)
      if (currentSignerIndex === -1) {
        return {
          allowed: false,
          reason: 'You are not a signer for this document'
        }
      }

      // Check if all previous signers have signed
      for (let i = 0; i < currentSignerIndex; i++) {
        if (signers[i].status !== 'signed') {
          return {
            allowed: false,
            reason: `Waiting for ${signers[i].signer_email} to sign first`,
            nextSigner: signers[i].signer_email
          }
        }
      }

      return {
        allowed: true
      }
    } catch (error) {
      console.error('Error validating sequential signing permission:', error)
      return {
        allowed: false,
        reason: 'Internal error'
      }
    }
  }
}


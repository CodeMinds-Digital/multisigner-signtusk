import { supabase } from './supabase'
import { PDFSignatureService } from './pdf-signature-service'

export interface SignatureRequestForRecipient {
  id: string
  document_id: string
  document_name: string
  signature_type: 'single' | 'multi'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  requester_id: string
  requester_email?: string
  expires_at?: string
  created_at: string
  updated_at: string
  signer_status: 'pending' | 'signed' | 'declined'
  signer_id: string
  order_index: number
  can_sign: boolean // Whether this signer can sign now (for multi-signature workflows)
}

export interface SignDocumentData {
  signatureData: {
    signature: string // Base64 signature image
    timestamp: string
    ip_address?: string
    user_agent?: string
  }
}

export class SignatureRecipientService {
  private static readonly SIGNATURE_REQUESTS_TABLE = 'signature_requests'
  private static readonly SIGNATURE_REQUEST_SIGNERS_TABLE = 'signature_request_signers'

  /**
   * Get signature requests for a recipient by email
   */
  static async getSignatureRequestsForRecipient(email: string): Promise<SignatureRequestForRecipient[]> {
    try {
      // Get all signature requests where this email is a signer
      const { data: signers, error: signersError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .select(`
          id,
          signature_request_id,
          email,
          status,
          order_index,
          signature_requests!inner (
            id,
            document_id,
            document_name,
            signature_type,
            status,
            requester_id,
            expires_at,
            created_at,
            updated_at
          )
        `)
        .eq('email', email)
        .order('created_at', { ascending: false })

      if (signersError) {
        console.error('Error fetching signature requests for recipient:', signersError)
        return []
      }

      // Transform the data and determine if each request can be signed
      const requests: SignatureRequestForRecipient[] = await Promise.all(
        (signers || []).map(async (signer: any) => {
          const request = signer.signature_requests

          // For multi-signature, check signing permissions based on mode
          let canSign = false
          if (request.signature_type === 'single') {
            canSign = signer.status === 'pending' && request.status === 'pending'
          } else {
            // For multi-signature, check signing mode from document settings
            let signingMode = 'sequential' // default to sequential to match creation default

            // Note: signing_requests.settings doesn't exist, so we need to get it from document
            // For now, we'll assume sequential mode as default since we can't easily access document here
            // This will be properly handled when the database schema is updated
            signingMode = 'sequential'

            if (signingMode === 'parallel') {
              // Parallel mode: any signer can sign at any time
              canSign = signer.status === 'pending' && request.status !== 'cancelled'
            } else {
              // Sequential mode: check if previous signers have signed
              const { data: allSigners } = await supabase
                .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
                .select('order_index, status, signing_order')
                .eq('signature_request_id', request.id)
                .order('signing_order', { ascending: true })

              if (allSigners) {
                const currentSignerIndex = allSigners.findIndex(s => s.order_index === signer.order_index)
                const previousSigners = allSigners.slice(0, currentSignerIndex)
                const allPreviousSigned = previousSigners.every(s => s.status === 'signed')
                canSign = signer.status === 'pending' && allPreviousSigned && request.status !== 'cancelled'
              }
            }
          }

          // Get requester email (optional, for display)
          let requesterEmail = undefined
          try {
            const { data: requesterProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', request.requester_id)
              .single()
            requesterEmail = requesterProfile?.email
          } catch (error) {
            // Ignore error, requester email is optional
          }

          return {
            id: request.id,
            document_id: request.document_id,
            document_name: request.document_name,
            signature_type: request.signature_type,
            status: request.status,
            requester_id: request.requester_id,
            requester_email,
            expires_at: request.expires_at,
            created_at: request.created_at,
            updated_at: request.updated_at,
            signer_status: signer.status,
            signer_id: signer.id,
            order_index: signer.order_index,
            can_sign: canSign
          }
        })
      )

      return requests
    } catch (error) {
      console.error('Error fetching signature requests for recipient:', error)
      return []
    }
  }

  /**
   * Get a specific signature request for signing
   */
  static async getSignatureRequestForSigning(requestId: string, signerEmail: string): Promise<{
    request: SignatureRequestForRecipient | null
    documentUrl: string | null
  }> {
    try {
      const requests = await this.getSignatureRequestsForRecipient(signerEmail)
      const request = requests.find(r => r.id === requestId)

      if (!request) {
        return { request: null, documentUrl: null }
      }

      // Get document URL from document_templates table
      let documentUrl = null
      try {
        const { data: documentTemplate, error: docError } = await supabase
          .from('document_templates')
          .select('pdf_url')
          .eq('id', request.document_id)
          .single()

        if (documentTemplate?.pdf_url && !docError) {
          // Create signed URL for the PDF
          const { data } = await supabase.storage
            .from('documents')
            .createSignedUrl(documentTemplate.pdf_url, 3600) // 1 hour expiry

          documentUrl = data?.signedUrl || null
        }
      } catch (error) {
        console.error('Error getting document URL:', error)
      }

      return { request, documentUrl }
    } catch (error) {
      console.error('Error getting signature request for signing:', error)
      return { request: null, documentUrl: null }
    }
  }

  /**
   * Sign a document
   */
  static async signDocument(
    requestId: string,
    signerEmail: string,
    signatureData: SignDocumentData['signatureData']
  ): Promise<boolean> {
    try {
      // First, verify the signer can sign this document
      const requests = await this.getSignatureRequestsForRecipient(signerEmail)
      const request = requests.find(r => r.id === requestId)

      if (!request || !request.can_sign) {
        console.error('Signer cannot sign this document')
        return false
      }

      // Update the signer record
      const { error: signerError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: signatureData,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.signer_id)

      if (signerError) {
        console.error('Error updating signer status:', signerError)
        return false
      }

      // Check if this signature completes the request and trigger PDF generation
      setTimeout(async () => {
        try {
          await PDFSignatureService.processCompletedSignatureRequest(requestId)
        } catch (error) {
          console.error('Error processing completed signature request:', error)
        }
      }, 1000) // Small delay to ensure database trigger has completed

      return true
    } catch (error) {
      console.error('Error signing document:', error)
      return false
    }
  }

  /**
   * Decline to sign a document
   */
  static async declineDocument(requestId: string, signerEmail: string, reason?: string): Promise<boolean> {
    try {
      // Get the signer record
      const requests = await this.getSignatureRequestsForRecipient(signerEmail)
      const request = requests.find(r => r.id === requestId)

      if (!request) {
        console.error('Signature request not found')
        return false
      }

      // Update the signer record
      const { error: signerError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .update({
          status: 'declined',
          signature_data: reason ? { decline_reason: reason } : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.signer_id)

      if (signerError) {
        console.error('Error updating signer status:', signerError)
        return false
      }

      // The trigger will automatically update the signature request status to cancelled
      return true
    } catch (error) {
      console.error('Error declining document:', error)
      return false
    }
  }

  /**
   * Check if a signature request is expired
   */
  static isExpired(request: SignatureRequestForRecipient): boolean {
    if (!request.expires_at) return false
    return new Date(request.expires_at) < new Date()
  }

  /**
   * Get signature request statistics for a recipient
   */
  static async getSignatureStats(email: string): Promise<{
    total: number
    pending: number
    signed: number
    declined: number
    expired: number
  }> {
    try {
      const requests = await this.getSignatureRequestsForRecipient(email)

      const stats = {
        total: requests.length,
        pending: 0,
        signed: 0,
        declined: 0,
        expired: 0
      }

      requests.forEach(request => {
        if (this.isExpired(request)) {
          stats.expired++
        } else {
          switch (request.signer_status) {
            case 'pending':
              stats.pending++
              break
            case 'signed':
              stats.signed++
              break
            case 'declined':
              stats.declined++
              break
          }
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting signature stats:', error)
      return { total: 0, pending: 0, signed: 0, declined: 0, expired: 0 }
    }
  }
}

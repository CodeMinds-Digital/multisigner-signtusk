/**
 * Unified Signature Service
 * Handles both single and multi-signature workflows using existing infrastructure
 * Leverages document-management-app packages and PDFme integration
 */

import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'

// Types
export interface SignatureRequest {
  id: string
  document_id: string
  user_id: string // Changed from initiator_id to match database schema
  title: string
  description?: string
  signature_type: 'single' | 'multi'
  required_signers: number
  completed_signers: number
  current_signer_index: number
  signing_order: 'sequential' | 'parallel'
  status: 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
  expires_at?: string
  created_at: string
  completed_at?: string
  metadata: Record<string, any>
}

export interface SignatureSigner {
  id: string
  signature_request_id: string
  signer_id: string
  signer_email?: string
  signer_name?: string
  signing_order: number
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired'
  signature_data?: string
  signature_method?: string
  signature_metadata: Record<string, any>
  sent_at?: string
  viewed_at?: string
  signed_at?: string
  declined_at?: string
  created_at: string
}

export interface CreateSignatureRequestParams {
  document_id: string
  title: string
  description?: string
  signers: Array<{
    signer_id: string
    signer_email?: string
    signer_name?: string
    signing_order?: number
  }>
  signature_type?: 'single' | 'multi'
  signing_order?: 'sequential' | 'parallel'
  expires_in_days?: number
  metadata?: Record<string, any>
}

export interface SignDocumentParams {
  signature_request_id: string
  signer_id: string
  signature_data: string
  signature_method: string
  private_key?: string
  metadata?: Record<string, any>
}

export class UnifiedSignatureService {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Create a new signature request (single or multi-signature)
   */
  async createSignatureRequest(
    params: CreateSignatureRequestParams,
    initiator_id: string
  ): Promise<{ success: boolean; data?: SignatureRequest; error?: string }> {
    try {
      const {
        document_id,
        title,
        description,
        signers,
        signature_type = signers.length > 1 ? 'multi' : 'single',
        signing_order = 'sequential',
        expires_in_days = 30,
        metadata = {}
      } = params

      // Validate document exists
      const { data: document, error: docError } = await this.supabase
        .from('documents')
        .select('id, title, status')
        .eq('id', document_id)
        .single()

      if (docError || !document) {
        return { success: false, error: 'Document not found' }
      }

      // Calculate expiry date
      const expires_at = new Date()
      expires_at.setDate(expires_at.getDate() + expires_in_days)

      // Create signature request
      const { data: signatureRequest, error: requestError } = await this.supabase
        .from('signature_requests')
        .insert({
          document_id,
          user_id: initiator_id, // Map initiator_id to user_id for database compatibility
          title,
          description,
          signature_type,
          required_signers: signers.length,
          signing_order,
          expires_at: expires_at.toISOString(),
          metadata
        })
        .select()
        .single()

      if (requestError) {
        return { success: false, error: requestError.message }
      }

      // Create signers
      const signersData = signers.map((signer, index) => ({
        signature_request_id: signatureRequest.id,
        signer_id: signer.signer_id,
        signer_email: signer.signer_email,
        signer_name: signer.signer_name,
        signing_order: signer.signing_order ?? index
      }))

      const { error: signersError } = await this.supabase
        .from('signature_signers')
        .insert(signersData)

      if (signersError) {
        // Cleanup signature request if signers creation fails
        await this.supabase
          .from('signature_requests')
          .delete()
          .eq('id', signatureRequest.id)

        return { success: false, error: signersError.message }
      }

      // Update document with signature request info
      await this.supabase
        .from('documents')
        .update({
          signature_type,
          signature_status: 'pending',
          signature_request_id: signatureRequest.id,
          required_signers: signers.length
        })
        .eq('id', document_id)

      // Log audit trail
      await this.logAuditEvent(signatureRequest.id, null, 'signature_request_created', {
        signature_type,
        required_signers: signers.length,
        initiator_id
      })

      return { success: true, data: signatureRequest }
    } catch (error) {
      console.error('Error creating signature request:', error)
      return { success: false, error: 'Failed to create signature request' }
    }
  }

  /**
   * Get signature request details with signers
   */
  async getSignatureRequest(
    request_id: string,
    user_id?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data: request, error: requestError } = await this.supabase
        .from('signature_requests')
        .select(`
          *,
          documents (
            id,
            title,
            file_name,
            file_path,
            file_size,
            created_at
          ),
          signature_signers (
            id,
            signer_id,
            signer_email,
            signer_name,
            signing_order,
            status,
            signature_data,
            signature_method,
            sent_at,
            viewed_at,
            signed_at,
            declined_at,
            created_at
          )
        `)
        .eq('id', request_id)
        .single()

      if (requestError || !request) {
        return { success: false, error: 'Signature request not found' }
      }

      // Check permissions
      if (user_id) {
        const hasAccess = request.user_id === user_id ||
          request.signature_signers.some((s: any) => s.signer_id === user_id)

        if (!hasAccess) {
          return { success: false, error: 'Access denied' }
        }
      }

      // Calculate progress
      const completedSigners = request.signature_signers.filter(
        (s: any) => s.status === 'signed'
      ).length

      const progress = {
        completed: completedSigners,
        total: request.required_signers,
        percentage: Math.round((completedSigners / request.required_signers) * 100)
      }

      // Get current signer (for sequential signing)
      let currentSigner = null
      if (request.signing_order === 'sequential' && request.status !== 'completed') {
        currentSigner = request.signature_signers
          .filter((s: any) => s.status === 'pending')
          .sort((a: any, b: any) => a.signing_order - b.signing_order)[0]
      }

      return {
        success: true,
        data: {
          ...request,
          progress,
          currentSigner
        }
      }
    } catch (error) {
      console.error('Error getting signature request:', error)
      return { success: false, error: 'Failed to get signature request' }
    }
  }

  /**
   * Sign a document (handles both single and multi-signature)
   */
  async signDocument(
    params: SignDocumentParams
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const {
        signature_request_id,
        signer_id,
        signature_data,
        signature_method,
        private_key,
        metadata = {}
      } = params

      // Get signature request and validate
      const { data: requestData, error: requestError } = await this.getSignatureRequest(
        signature_request_id,
        signer_id
      )

      if (requestError || !requestData) {
        return { success: false, error: requestError || 'Signature request not found' }
      }

      const request = requestData
      const signer = request.signature_signers.find((s: any) => s.signer_id === signer_id)

      if (!signer) {
        return { success: false, error: 'Signer not found in this request' }
      }

      if (signer.status !== 'pending') {
        return { success: false, error: 'Document already signed or not available for signing' }
      }

      // For sequential signing, check if it's the signer's turn
      if (request.signing_order === 'sequential' && request.currentSigner?.id !== signer.id) {
        return { success: false, error: 'Not your turn to sign yet' }
      }

      // Generate cryptographic signature if private key provided
      let cryptographicSignature = null
      if (private_key) {
        try {
          const wallet = new ethers.Wallet(private_key)
          const documentHash = await this.generateDocumentHash(request.documents.id)
          cryptographicSignature = await wallet.signMessage(documentHash)
        } catch (error) {
          console.error('Error generating cryptographic signature:', error)
          return { success: false, error: 'Failed to generate cryptographic signature' }
        }
      }

      // Update signer status
      const { error: signerUpdateError } = await this.supabase
        .from('signature_signers')
        .update({
          status: 'signed',
          signature_data,
          signature_method,
          signature_metadata: {
            ...metadata,
            cryptographic_signature: cryptographicSignature,
            signed_at: new Date().toISOString()
          },
          signed_at: new Date().toISOString()
        })
        .eq('id', signer.id)

      if (signerUpdateError) {
        return { success: false, error: signerUpdateError.message }
      }

      // Create document signature record
      if (cryptographicSignature) {
        await this.supabase
          .from('document_signatures')
          .insert({
            signature_request_id,
            signer_id: signer.id,
            document_id: request.documents.id,
            signature_hash: cryptographicSignature,
            signature_data,
            signature_type: signature_method,
            verification_data: metadata
          })
      }

      // Log audit event
      await this.logAuditEvent(signature_request_id, signer.id, 'document_signed', {
        signature_method,
        has_cryptographic_signature: !!cryptographicSignature
      })

      // Check if all signatures are complete (trigger will handle status update)
      const { data: updatedRequest } = await this.getSignatureRequest(signature_request_id)

      return {
        success: true,
        data: {
          signer_id,
          signed_at: new Date().toISOString(),
          signature_request: updatedRequest?.data
        }
      }
    } catch (error) {
      console.error('Error signing document:', error)
      return { success: false, error: 'Failed to sign document' }
    }
  }

  /**
   * Generate document hash for cryptographic signing
   */
  private async generateDocumentHash(document_id: string): Promise<string> {
    // This would integrate with the existing document hash generation
    // from the document-management-app
    return ethers.keccak256(ethers.toUtf8Bytes(document_id + Date.now()))
  }

  /**
   * Log audit events
   */
  private async logAuditEvent(
    signature_request_id: string,
    signer_id: string | null,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await this.supabase
        .from('signature_audit_log')
        .insert({
          signature_request_id,
          signer_id,
          action,
          details
        })
    } catch (error) {
      console.error('Error logging audit event:', error)
    }
  }

  /**
   * Get user's signature requests
   */
  async getUserSignatureRequests(
    user_id: string,
    filters?: {
      status?: string
      signature_type?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      let query = this.supabase
        .from('signature_requests')
        .select(`
          *,
          documents (
            id,
            title,
            file_name,
            created_at
          ),
          signature_signers (
            id,
            signer_id,
            status,
            signing_order
          )
        `)
        .or(`user_id.eq.${user_id},signature_signers.signer_id.eq.${user_id}`)
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.signature_type) {
        query = query.eq('signature_type', filters.signature_type)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error getting user signature requests:', error)
      return { success: false, error: 'Failed to get signature requests' }
    }
  }
}

import { supabase } from './supabase'

export interface SignatureRequest {
  id: string
  document_id: string
  document_name: string
  signature_type: 'single' | 'multi'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  requester_id: string
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface SignatureRequestSigner {
  id: string
  signature_request_id: string
  email: string
  status: 'pending' | 'signed' | 'declined'
  signed_at?: string
  signature_data?: any
  order_index: number
}

export interface CreateSignatureRequestData {
  documentId: string
  documentName: string
  signatureType: 'single' | 'multi'
  emails: string[]
  expiresInDays?: number
}

export class SignatureRequestService {
  private static readonly SIGNATURE_REQUESTS_TABLE = 'signature_requests'
  private static readonly SIGNATURE_REQUEST_SIGNERS_TABLE = 'signature_request_signers'

  /**
   * Create a new signature request
   */
  static async createSignatureRequest(
    userId: string,
    requestData: CreateSignatureRequestData
  ): Promise<SignatureRequest | null> {
    try {
      // Calculate expiration date (default 30 days) - set to 11:59 PM (23:59:59) in user's local timezone
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (requestData.expiresInDays || 30))
      expiresAt.setHours(23, 59, 59, 999) // Use local timezone so it shows as 11:59 PM for the user

      // Create the signature request
      const { data: signatureRequest, error: requestError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .insert({
          document_id: requestData.documentId,
          document_name: requestData.documentName,
          signature_type: requestData.signatureType,
          status: 'pending',
          requester_id: userId,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (requestError) {
        console.error('Error creating signature request:', requestError)
        return null
      }

      // Create signer records
      const signerInserts = requestData.emails.map((email, index) => ({
        signature_request_id: signatureRequest.id,
        email: email.trim(),
        status: 'pending' as const,
        order_index: index
      }))

      const { error: signersError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .insert(signerInserts)

      if (signersError) {
        console.error('Error creating signers:', signersError)
        // Rollback: delete the signature request
        await supabase
          .from(this.SIGNATURE_REQUESTS_TABLE)
          .delete()
          .eq('id', signatureRequest.id)
        return null
      }

      return signatureRequest
    } catch (error) {
      console.error('Error creating signature request:', error)
      return null
    }
  }

  /**
   * Get signature requests for a user
   */
  static async getSignatureRequests(userId: string): Promise<SignatureRequest[]> {
    try {
      const { data, error } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .select('*')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching signature requests:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching signature requests:', error)
      return []
    }
  }

  /**
   * Get signature request with signers
   */
  static async getSignatureRequestWithSigners(requestId: string): Promise<{
    request: SignatureRequest | null
    signers: SignatureRequestSigner[]
  }> {
    try {
      // Get the signature request
      const { data: request, error: requestError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError) {
        console.error('Error fetching signature request:', requestError)
        return { request: null, signers: [] }
      }

      // Get the signers
      const { data: signers, error: signersError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .select('*')
        .eq('signature_request_id', requestId)
        .order('order_index', { ascending: true })

      if (signersError) {
        console.error('Error fetching signers:', signersError)
        return { request, signers: [] }
      }

      return { request, signers: signers || [] }
    } catch (error) {
      console.error('Error fetching signature request with signers:', error)
      return { request: null, signers: [] }
    }
  }

  /**
   * Update signature request status
   */
  static async updateSignatureRequestStatus(
    requestId: string,
    status: SignatureRequest['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) {
        console.error('Error updating signature request status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating signature request status:', error)
      return false
    }
  }

  /**
   * Cancel signature request
   */
  static async cancelSignatureRequest(requestId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('requester_id', userId) // Ensure user can only cancel their own requests

      if (error) {
        console.error('Error cancelling signature request:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error cancelling signature request:', error)
      return false
    }
  }

  /**
   * Get signature requests for dashboard display
   */
  static async getSignatureRequestsWithCounts(userId: string): Promise<{
    requests: SignatureRequest[]
    counts: {
      total: number
      pending: number
      in_progress: number
      completed: number
      cancelled: number
    }
  }> {
    try {
      const requests = await this.getSignatureRequests(userId)

      const counts = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length
      }

      return { requests, counts }
    } catch (error) {
      console.error('Error fetching signature requests with counts:', error)
      return {
        requests: [],
        counts: { total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 }
      }
    }
  }

  /**
   * Delete signature request (and all associated signers)
   */
  static async deleteSignatureRequest(requestId: string, userId: string): Promise<boolean> {
    try {
      // First delete signers
      const { error: signersError } = await supabase
        .from(this.SIGNATURE_REQUEST_SIGNERS_TABLE)
        .delete()
        .eq('signature_request_id', requestId)

      if (signersError) {
        console.error('Error deleting signers:', signersError)
        return false
      }

      // Then delete the request
      const { error: requestError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .delete()
        .eq('id', requestId)
        .eq('requester_id', userId) // Ensure user can only delete their own requests

      if (requestError) {
        console.error('Error deleting signature request:', requestError)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting signature request:', error)
      return false
    }
  }
}

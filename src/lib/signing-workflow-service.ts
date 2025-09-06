import { supabase } from './supabase'
import { createAuthenticatedSupabaseCall } from './auth-interceptor'

export interface SigningRequestSigner {
  id: string
  signing_request_id: string
  signer_email: string
  signer_name: string
  signing_order: number
  status: 'pending' | 'viewed' | 'signed' | 'declined'
  viewed_at?: string
  signed_at?: string
  signature_data?: string
  decline_reason?: string
  reminder_count: number
  last_reminder_at?: string
  created_at: string
  updated_at: string
}

export interface SigningRequest {
  id: string
  document_template_id?: string
  title: string
  initiated_by: string
  initiated_at: string
  expires_at?: string
  status: 'initiated' | 'in_progress' | 'completed' | 'expired' | 'cancelled'
  total_signers: number
  completed_signers: number
  viewed_signers: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  signers: SigningRequestSigner[]
}

export interface SigningRequestListItem {
  id: string
  title: string
  status: string // Calculated display status
  progress: {
    viewed: number
    signed: number
    total: number
  }
  signers: Array<{
    name: string
    email: string
    status: string
    viewed_at?: string
    signed_at?: string
  }>
  initiated_at: string
  expires_at?: string
  days_remaining?: number
}

export class SigningWorkflowService {
  /**
   * Get all signing requests for a user
   */
  static async getSigningRequests(userId: string): Promise<SigningRequestListItem[]> {
    return createAuthenticatedSupabaseCall(async () => {
      const { data: requests, error } = await supabase
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*)
        `)
        .eq('initiated_by', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching signing requests:', error)
        throw error
      }

      return (requests || []).map((request: any) => this.transformToListItem(request))
    })
  }

  /**
   * Get a single signing request with full details
   */
  static async getSigningRequest(requestId: string, userId: string): Promise<SigningRequest | null> {
    try {
      const { data, error } = await supabase
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*)
        `)
        .eq('id', requestId)
        .eq('initiated_by', userId)
        .single()

      if (error) {
        console.error('Error fetching signing request:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getSigningRequest:', error)
      return null
    }
  }

  /**
   * Create a new signing request
   */
  static async createSigningRequest(
    userId: string,
    title: string,
    signers: Array<{ name: string; email: string; order?: number }>,
    documentTemplateId?: string,
    expiresAt?: string
  ): Promise<string | null> {
    try {
      // Create the signing request
      const { data: request, error: requestError } = await supabase
        .from('signing_requests')
        .insert({
          document_template_id: documentTemplateId,
          title,
          initiated_by: userId,
          expires_at: expiresAt,
          total_signers: signers.length
        })
        .select()
        .single()

      if (requestError) {
        console.error('Error creating signing request:', requestError)
        return null
      }

      // Add signers
      const signersData = signers.map((signer, index) => ({
        signing_request_id: request.id,
        signer_email: signer.email,
        signer_name: signer.name,
        signing_order: signer.order || index + 1
      }))

      const { error: signersError } = await supabase
        .from('signing_request_signers')
        .insert(signersData)

      if (signersError) {
        console.error('Error adding signers:', signersError)
        // Cleanup: delete the request if signers failed
        await supabase.from('signing_requests').delete().eq('id', request.id)
        return null
      }

      return request.id
    } catch (error) {
      console.error('Error in createSigningRequest:', error)
      return null
    }
  }

  /**
   * Update signer status (viewed, signed, declined)
   */
  static async updateSignerStatus(
    signerId: string,
    status: 'viewed' | 'signed' | 'declined',
    signatureData?: string,
    declineReason?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'viewed' && !updateData.viewed_at) {
        updateData.viewed_at = new Date().toISOString()
      } else if (status === 'signed') {
        updateData.signed_at = new Date().toISOString()
        updateData.viewed_at = updateData.viewed_at || new Date().toISOString()
        if (signatureData) {
          updateData.signature_data = signatureData
        }
      } else if (status === 'declined' && declineReason) {
        updateData.decline_reason = declineReason
      }

      const { error } = await supabase
        .from('signing_request_signers')
        .update(updateData)
        .eq('id', signerId)

      if (error) {
        console.error('Error updating signer status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateSignerStatus:', error)
      return false
    }
  }

  /**
   * Cancel a signing request
   */
  static async cancelSigningRequest(requestId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signing_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .eq('initiated_by', userId)

      if (error) {
        console.error('Error cancelling signing request:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in cancelSigningRequest:', error)
      return false
    }
  }

  /**
   * Calculate display status based on signer progress
   */
  private static calculateDisplayStatus(request: any): string {
    const { total_signers, viewed_signers, completed_signers, status } = request

    if (status === 'completed') {
      return 'Completed'
    } else if (status === 'cancelled') {
      return 'Cancelled'
    } else if (status === 'expired') {
      return 'Expired'
    } else if (completed_signers > 0) {
      if (completed_signers === total_signers) {
        return 'Completed'
      } else {
        return `Signed (${completed_signers}/${total_signers})`
      }
    } else if (viewed_signers > 0) {
      return `Viewed (${viewed_signers}/${total_signers})`
    } else {
      return 'Initiated'
    }
  }

  /**
   * Calculate days remaining until expiration
   */
  private static calculateDaysRemaining(expiresAt?: string): number | undefined {
    if (!expiresAt) return undefined

    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 0 ? diffDays : 0
  }

  /**
   * Transform database record to list item format
   */
  private static transformToListItem(request: any): SigningRequestListItem {
    return {
      id: request.id,
      title: request.title,
      status: this.calculateDisplayStatus(request),
      progress: {
        viewed: request.viewed_signers || 0,
        signed: request.completed_signers || 0,
        total: request.total_signers || 0
      },
      signers: (request.signers || []).map((signer: any) => ({
        name: signer.signer_name,
        email: signer.signer_email,
        status: signer.status,
        viewed_at: signer.viewed_at,
        signed_at: signer.signed_at
      })),
      initiated_at: request.initiated_at,
      expires_at: request.expires_at,
      days_remaining: this.calculateDaysRemaining(request.expires_at)
    }
  }

  /**
   * Get signing workflow statistics
   */
  static async getSigningStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('signing_requests')
        .select('status, total_signers, completed_signers')
        .eq('initiated_by', userId)

      if (error) {
        console.error('Error fetching signing stats:', error)
        return {
          total: 0,
          initiated: 0,
          in_progress: 0,
          completed: 0,
          expired: 0
        }
      }

      const stats = {
        total: data.length,
        initiated: data.filter(r => r.status === 'initiated').length,
        in_progress: data.filter(r => r.status === 'in_progress').length,
        completed: data.filter(r => r.status === 'completed').length,
        expired: data.filter(r => r.status === 'expired').length
      }

      return stats
    } catch (error) {
      console.error('Error in getSigningStats:', error)
      return {
        total: 0,
        initiated: 0,
        in_progress: 0,
        completed: 0,
        expired: 0
      }
    }
  }
}

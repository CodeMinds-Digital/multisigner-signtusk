import { supabase } from './supabase'

// Define types locally since they're not exported from drive types
interface SignatureRequest {
  id: string
  documentTemplateId: string
  title: string
  message?: string
  status: 'draft' | 'sent' | 'in_progress' | 'completed' | 'cancelled'
  signers: Signer[]
  createdBy: string
  createdAt: string
  sentAt?: string
  completedAt?: string
  settings: {
    requireAllSigners: boolean
    signingOrder: 'sequential' | 'parallel'
    expiresInDays?: number
  }
  auditTrail: Array<{
    event: string
    timestamp: string
    userId: string
    details: any
  }>
}

interface Signer {
  id: string
  email: string
  name: string
  role?: string
  order: number
  status: 'pending' | 'sent' | 'signed' | 'declined'
  signedAt?: string
  declinedAt?: string
  declineReason?: string
  remindersSent?: number
  lastReminderSent?: string
  accessCode?: string
  ipAddress?: string
  userAgent?: string
  signatureImage?: string
  metadata?: any
}

interface SigningSession {
  id: string
  signatureRequestId: string
  signerId: string
  signerEmail: string
  status: 'pending' | 'active' | 'completed' | 'expired'
  accessToken: string
  accessCode?: string
  startedAt?: string
  completedAt?: string
  expiresAt: string
  fieldsToComplete: any[]
  fieldsCompleted: any[]
}

export class MultiSignatureService {
  private static readonly SIGNATURE_REQUESTS_TABLE = 'signature_requests'
  private static readonly SIGNERS_TABLE = 'signature_request_signers'
  private static readonly SIGNING_SESSIONS_TABLE = 'signing_sessions'
  private static readonly WORKFLOW_TEMPLATES_TABLE = 'signature_workflow_templates'

  /**
   * Create a new signature request with multiple signers
   */
  static async createSignatureRequest(
    documentTemplateId: string,
    signers: Omit<Signer, 'id' | 'status' | 'signedAt'>[],
    settings: SignatureRequest['settings'],
    createdBy: string,
    title: string,
    message?: string
  ): Promise<SignatureRequest | null> {
    try {
      // Create the signature request
      const { data: requestData, error: requestError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .insert([{
          document_template_id: documentTemplateId,
          title,
          message,
          status: 'draft',
          created_by: createdBy,
          settings: JSON.stringify(settings),
          expires_at: new Date(Date.now() + (settings.expiresInDays || 7) * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single()

      if (requestError) {
        console.error('Error creating signature request:', requestError)
        return null
      }

      // Create signers
      const signersWithIds = signers.map((signer, index) => ({
        ...signer,
        id: crypto.randomUUID(),
        status: 'pending' as const,
        signature_request_id: requestData.id,
        order: signer.order || index + 1
      }))

      const { error: signersError } = await supabase
        .from(this.SIGNERS_TABLE)
        .insert(signersWithIds.map(signer => ({
          id: signer.id,
          signature_request_id: signer.signature_request_id,
          email: signer.email,
          name: signer.name,
          role: signer.role,
          order: signer.order,
          status: signer.status,
          metadata: JSON.stringify(signer.metadata || {})
        })))

      if (signersError) {
        console.error('Error creating signers:', signersError)
        // Cleanup: delete the request if signers creation failed
        await supabase.from(this.SIGNATURE_REQUESTS_TABLE).delete().eq('id', requestData.id)
        return null
      }

      // Return the complete signature request
      return {
        id: requestData.id,
        documentTemplateId,
        title,
        message,
        status: 'draft',
        signers: signersWithIds,
        createdBy,
        createdAt: requestData.created_at,
        settings,
        auditTrail: [{
          event: 'signature_request_created',
          timestamp: new Date().toISOString(),
          userId: createdBy,
          details: { title, signersCount: signers.length }
        }]
      }
    } catch (error) {
      console.error('Error creating signature request:', error)
      return null
    }
  }

  /**
   * Send signature request to signers
   */
  static async sendSignatureRequest(requestId: string): Promise<boolean> {
    try {
      // Update request status to 'sent'
      const { error: updateError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) {
        console.error('Error updating signature request status:', updateError)
        return false
      }

      // Get signers for this request
      const { data: signers, error: signersError } = await supabase
        .from(this.SIGNERS_TABLE)
        .select('*')
        .eq('signature_request_id', requestId)
        .order('order')

      if (signersError || !signers) {
        console.error('Error fetching signers:', signersError)
        return false
      }

      // Create signing sessions for each signer
      const sessions = signers.map((signer: any) => ({
        id: crypto.randomUUID(),
        signature_request_id: requestId,
        signer_id: signer.id,
        signer_email: signer.email,
        status: 'pending',
        access_token: crypto.randomUUID(),
        access_code: signer.access_code,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        fields_to_complete: JSON.stringify([]), // Will be populated based on field assignments
        fields_completed: JSON.stringify([])
      }))

      const { error: sessionsError } = await supabase
        .from(this.SIGNING_SESSIONS_TABLE)
        .insert(sessions)

      if (sessionsError) {
        console.error('Error creating signing sessions:', sessionsError)
        return false
      }

      // TODO: Send email notifications to signers
      // This would integrate with your email service
      console.log(`Signature request sent to ${signers.length} signers`)

      return true
    } catch (error) {
      console.error('Error sending signature request:', error)
      return false
    }
  }

  /**
   * Get signature request with signers and progress
   */
  static async getSignatureRequest(requestId: string): Promise<SignatureRequest | null> {
    try {
      const { data: request, error: requestError } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError || !request) {
        console.error('Error fetching signature request:', requestError)
        return null
      }

      const { data: signers, error: signersError } = await supabase
        .from(this.SIGNERS_TABLE)
        .select('*')
        .eq('signature_request_id', requestId)
        .order('order')

      if (signersError) {
        console.error('Error fetching signers:', signersError)
        return null
      }

      return {
        id: request.id,
        documentTemplateId: request.document_template_id,
        title: request.title,
        message: request.message,
        status: request.status,
        signers: signers?.map((signer: any) => ({
          id: signer.id,
          email: signer.email,
          name: signer.name,
          role: signer.role,
          order: signer.order,
          status: signer.status,
          signedAt: signer.signed_at,
          declinedAt: signer.declined_at,
          declineReason: signer.decline_reason,
          remindersSent: signer.reminders_sent || 0,
          lastReminderSent: signer.last_reminder_sent,
          accessCode: signer.access_code,
          ipAddress: signer.ip_address,
          userAgent: signer.user_agent,
          signatureImage: signer.signature_image,
          metadata: signer.metadata ? JSON.parse(signer.metadata) : {}
        })) || [],
        createdBy: request.created_by,
        createdAt: request.created_at,
        sentAt: request.sent_at,
        completedAt: request.completed_at,
        settings: request.settings ? JSON.parse(request.settings) : {},
        auditTrail: request.audit_trail ? JSON.parse(request.audit_trail) : []
      }
    } catch (error) {
      console.error('Error getting signature request:', error)
      return null
    }
  }

  /**
   * Get signing session for a signer
   */
  static async getSigningSession(accessToken: string): Promise<SigningSession | null> {
    try {
      const { data: session, error } = await supabase
        .from(this.SIGNING_SESSIONS_TABLE)
        .select('*')
        .eq('access_token', accessToken)
        .eq('status', 'pending')
        .single()

      if (error || !session) {
        console.error('Error fetching signing session:', error)
        return null
      }

      return {
        id: session.id,
        signatureRequestId: session.signature_request_id,
        signerId: session.signer_id,
        signerEmail: session.signer_email,
        status: session.status,
        accessToken: session.access_token,
        accessCode: session.access_code,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        expiresAt: session.expires_at,
        fieldsToComplete: session.fields_to_complete ? JSON.parse(session.fields_to_complete) : [],
        fieldsCompleted: session.fields_completed ? JSON.parse(session.fields_completed) : []
      }
    } catch (error) {
      console.error('Error getting signing session:', error)
      return null
    }
  }

  /**
   * Update signer status (signed, declined, etc.)
   */
  static async updateSignerStatus(
    signerId: string,
    status: Signer['status'],
    additionalData?: {
      signatureImage?: string
      declineReason?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        ...(status === 'signed' && { signed_at: new Date().toISOString() }),
        ...(status === 'declined' && {
          declined_at: new Date().toISOString(),
          decline_reason: additionalData?.declineReason
        }),
        ...(additionalData?.signatureImage && { signature_image: additionalData.signatureImage }),
        ...(additionalData?.ipAddress && { ip_address: additionalData.ipAddress }),
        ...(additionalData?.userAgent && { user_agent: additionalData.userAgent })
      }

      const { error } = await supabase
        .from(this.SIGNERS_TABLE)
        .update(updateData)
        .eq('id', signerId)

      if (error) {
        console.error('Error updating signer status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating signer status:', error)
      return false
    }
  }

  /**
   * Check if signature request is complete
   */
  static async checkRequestCompletion(requestId: string): Promise<boolean> {
    try {
      const request = await this.getSignatureRequest(requestId)
      if (!request) return false

      const allSignersCompleted = request.signers.every(signer =>
        signer.status === 'signed' || (!request.settings.requireAllSigners && signer.status === 'declined')
      )

      if (allSignersCompleted && request.status !== 'completed') {
        // Update request status to completed
        await supabase
          .from(this.SIGNATURE_REQUESTS_TABLE)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', requestId)

        return true
      }

      return allSignersCompleted
    } catch (error) {
      console.error('Error checking request completion:', error)
      return false
    }
  }

  /**
   * Get all signature requests for a user
   */
  static async getUserSignatureRequests(userId: string): Promise<SignatureRequest[]> {
    try {
      const { data: requests, error } = await supabase
        .from(this.SIGNATURE_REQUESTS_TABLE)
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user signature requests:', error)
        return []
      }

      // Get signers for each request
      const requestsWithSigners = await Promise.all(
        (requests || []).map(async (request: any) => {
          const { data: signers } = await supabase
            .from(this.SIGNERS_TABLE)
            .select('*')
            .eq('signature_request_id', request.id)
            .order('order')

          return {
            id: request.id,
            documentTemplateId: request.document_template_id,
            title: request.title,
            message: request.message,
            status: request.status,
            signers: signers?.map((signer: any) => ({
              id: signer.id,
              email: signer.email,
              name: signer.name,
              role: signer.role,
              order: signer.order,
              status: signer.status,
              signedAt: signer.signed_at,
              declinedAt: signer.declined_at,
              declineReason: signer.decline_reason,
              remindersSent: signer.reminders_sent || 0,
              lastReminderSent: signer.last_reminder_sent,
              accessCode: signer.access_code,
              ipAddress: signer.ip_address,
              userAgent: signer.user_agent,
              signatureImage: signer.signature_image,
              metadata: signer.metadata ? JSON.parse(signer.metadata) : {}
            })) || [],
            createdBy: request.created_by,
            createdAt: request.created_at,
            sentAt: request.sent_at,
            completedAt: request.completed_at,
            expiresAt: request.expires_at,
            settings: request.settings ? JSON.parse(request.settings) : {},
            auditTrail: request.audit_trail ? JSON.parse(request.audit_trail) : []
          }
        })
      )

      return requestsWithSigners
    } catch (error) {
      console.error('Error getting user signature requests:', error)
      return []
    }
  }
}

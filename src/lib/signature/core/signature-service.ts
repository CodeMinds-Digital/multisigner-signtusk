/**
 * Unified Signature Service
 * Consolidates all signature operations into a single, authoritative service
 * Replaces: signature-request-service.ts, unified-signature-service.ts,
 *           multi-signature-service.ts, signing-workflow-service.ts
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  SignatureRequest,
  Signer,
  SignatureAuditLog,
  Result,
  PaginatedResult,
  PaginationMetadata,
  CreateSignatureRequestInput,
  SignDocumentInput,
  UpdateSignerStatusInput,
  UpdateSignatureRequestInput,
  SignatureStatus,
  SignerStatus,
  SigningOrder,
  AuditAction,
  SignatureStats,
} from '../types/signature-types'
import {
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  ExpirationError,
  createValidationError,
  createAuthError,
  createNotFoundError,
  createConflictError,
  createExpirationError,
  createInternalError,
  serializeError,
} from '../errors/signature-errors'
import { SIGNATURE_CONFIG, getExpirationDate, isExpired } from '../config/signature-config'

/**
 * Core Signature Service
 * Provides all signature request operations with standardized error handling
 */
export class SignatureService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  // ============================================================================
  // Request Management
  // ============================================================================

  /**
   * Create a new signature request
   */
  async createRequest(
    userId: string,
    input: CreateSignatureRequestInput
  ): Promise<Result<SignatureRequest>> {
    try {
      // Validate expiration
      const expiresAt = getExpirationDate(input.expires_in_days)

      // Assign signing orders if not provided
      const signersWithOrder = input.signers.map((signer, index) => ({
        ...signer,
        signing_order: signer.signing_order ?? index + 1,
      }))

      // Create the signature request
      const { data: request, error: requestError } = await this.client
        .from('signing_requests')
        .insert({
          document_id: input.document_id,
          initiated_by: userId,
          title: input.title,
          description: input.description,
          signature_type: input.signature_type,
          signing_order: input.signing_order,
          status: SignatureStatus.INITIATED,
          total_signers: signersWithOrder.length,
          completed_signers: 0,
          viewed_signers: 0,
          require_totp: input.require_totp,
          expires_at: expiresAt,
          metadata: input.metadata || {},
        })
        .select()
        .single()

      if (requestError) {
        throw createInternalError('Failed to create signature request', requestError)
      }

      // Add signers
      const signersData = signersWithOrder.map((signer) => ({
        signing_request_id: request.id,
        signer_id: signer.signer_id,
        signer_email: signer.signer_email,
        signer_name: signer.signer_name,
        signing_order: signer.signing_order,
        status: SignerStatus.PENDING,
        signature_metadata: {},
      }))

      const { error: signersError } = await this.client
        .from('signing_request_signers')
        .insert(signersData)

      if (signersError) {
        // Cleanup: delete the request if signers failed
        await this.client.from('signing_requests').delete().eq('id', request.id)
        throw createInternalError('Failed to add signers', signersError)
      }

      // Log audit event
      await this.logAuditEvent(request.id, userId, AuditAction.CREATED, {
        signers_count: signersWithOrder.length,
        signing_order: input.signing_order,
      })

      return {
        success: true,
        data: request as SignatureRequest,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get a single signature request
   */
  async getRequest(
    requestId: string,
    authUserId: string,
    authUserEmail?: string
  ): Promise<Result<SignatureRequest & { signers: Signer[] }>> {
    try {
      const { data: request, error } = await this.client
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*)
        `)
        .eq('id', requestId)
        .single()

      if (error || !request) {
        throw createNotFoundError('Signature request', requestId)
      }

      // Check authorization
      const isInitiator = request.initiated_by === authUserId
      const isSigner = request.signers?.some(
        (s: any) => s.signer_id === authUserId || (authUserEmail && s.signer_email === authUserEmail)
      )

      if (!isInitiator && !isSigner) {
        throw createAuthError('You do not have access to this signature request', 'signature_request', 'read')
      }

      return {
        success: true,
        data: request as SignatureRequest & { signers: Signer[] },
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * List signature requests with pagination and filtering
   */
  async listRequests(
    authUserId: string,
    authUserEmail: string,
    options: {
      page?: number
      pageSize?: number
      status?: string[]
      view?: 'sent' | 'received'
      search?: string
    } = {}
  ): Promise<PaginatedResult<SignatureRequest>> {
    try {
      const page = options.page || 1
      const pageSize = Math.min(
        options.pageSize || SIGNATURE_CONFIG.pagination.DEFAULT_PAGE_SIZE,
        SIGNATURE_CONFIG.pagination.MAX_PAGE_SIZE
      )
      const offset = (page - 1) * pageSize

      let query = this.client
        .from('signing_requests')
        .select('*, signers:signing_request_signers(*)', { count: 'exact' })

      // Filter by view type
      if (options.view === 'sent') {
        query = query.eq('initiated_by', authUserId)
      } else if (options.view === 'received') {
        // For received view, we need to get request IDs where user is a signer
        // Using a two-step approach to avoid unsupported subquery pattern
        // Filter by email (primary) or signer_id (fallback)
        const { data: signerRecords, error: signerError } = await this.client
          .from('signing_request_signers')
          .select('signing_request_id')
          .or(`signer_email.eq.${authUserEmail},signer_id.eq.${authUserId}`)

        if (signerError) {
          throw createInternalError('Failed to fetch signer records', signerError)
        }

        const requestIds = signerRecords?.map((s) => s.signing_request_id) || []

        // If no requests found, return empty result early
        if (requestIds.length === 0) {
          return {
            success: true,
            data: [],
            pagination: {
              total: 0,
              page,
              pageSize,
              totalPages: 0,
              hasMore: false,
            },
          }
        }

        query = query.in('id', requestIds)
      }

      // Filter by status
      if (options.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      // Search by title
      if (options.search) {
        query = query.ilike('title', `%${options.search}%`)
      }

      // Apply pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      const { data, error, count } = await query

      if (error) {
        throw createInternalError('Failed to list signature requests', error)
      }

      const total = count || 0
      const totalPages = Math.ceil(total / pageSize)

      const pagination: PaginationMetadata = {
        total,
        page,
        pageSize,
        totalPages,
        hasMore: page < totalPages,
      }

      return {
        success: true,
        data: (data || []) as SignatureRequest[],
        pagination,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Update a signature request
   */
  async updateRequest(
    requestId: string,
    authUserId: string,
    authUserEmail: string,
    input: UpdateSignatureRequestInput
  ): Promise<Result<SignatureRequest>> {
    try {
      // Verify ownership
      const requestResult = await this.getRequest(requestId, authUserId, authUserEmail)
      if (!requestResult.success || !requestResult.data) {
        throw createNotFoundError('Signature request', requestId)
      }

      if (requestResult.data.initiated_by !== authUserId) {
        throw createAuthError('Only the initiator can update this request', 'signature_request', 'update')
      }

      // Update the request
      const { data, error } = await this.client
        .from('signing_requests')
        .update({
          title: input.title,
          description: input.description,
          expires_at: input.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to update signature request', error)
      }

      // Log audit event
      await this.logAuditEvent(requestId, authUserId, AuditAction.UPDATED, input as Record<string, unknown>)

      return {
        success: true,
        data: data as SignatureRequest,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Cancel a signature request
   */
  async cancelRequest(requestId: string, authUserId: string, authUserEmail: string): Promise<Result<SignatureRequest>> {
    try {
      // Verify ownership
      const requestResult = await this.getRequest(requestId, authUserId, authUserEmail)
      if (!requestResult.success || !requestResult.data) {
        throw createNotFoundError('Signature request', requestId)
      }

      if (requestResult.data.initiated_by !== authUserId) {
        throw createAuthError('Only the initiator can cancel this request', 'signature_request', 'cancel')
      }

      // Check if already completed
      if (requestResult.data.status === SignatureStatus.COMPLETED) {
        throw createConflictError('Cannot cancel a completed request', SignatureStatus.COMPLETED, SignatureStatus.CANCELLED)
      }

      // Update status
      const { data, error } = await this.client
        .from('signing_requests')
        .update({
          status: SignatureStatus.CANCELLED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to cancel signature request', error)
      }

      // Update all pending signers
      await this.client
        .from('signing_request_signers')
        .update({ status: SignerStatus.EXPIRED })
        .eq('signing_request_id', requestId)
        .in('status', [SignerStatus.PENDING, SignerStatus.SENT, SignerStatus.VIEWED])

      // Log audit event
      await this.logAuditEvent(requestId, authUserId, AuditAction.CANCELLED, {})

      return {
        success: true,
        data: data as SignatureRequest,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Delete a signature request
   */
  async deleteRequest(requestId: string, authUserId: string, authUserEmail: string): Promise<Result<void>> {
    try {
      // Verify ownership
      const requestResult = await this.getRequest(requestId, authUserId, authUserEmail)
      if (!requestResult.success || !requestResult.data) {
        throw createNotFoundError('Signature request', requestId)
      }

      if (requestResult.data.initiated_by !== authUserId) {
        throw createAuthError('Only the initiator can delete this request', 'signature_request', 'delete')
      }

      // Prevent deletion if partially signed
      if (requestResult.data.completed_signers > 0) {
        throw createConflictError('Cannot delete a request with signatures', requestResult.data.status, 'deleted')
      }

      // Soft delete (update status instead of hard delete)
      const { error } = await this.client
        .from('signing_requests')
        .update({
          status: SignatureStatus.CANCELLED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (error) {
        throw createInternalError('Failed to delete signature request', error)
      }

      // Log audit event
      await this.logAuditEvent(requestId, authUserId, AuditAction.DELETED, {})

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  // ============================================================================
  // Signer Management
  // ============================================================================

  /**
   * Get signer details
   */
  async getSignerDetails(signerId: string): Promise<Result<Signer>> {
    try {
      const { data, error } = await this.client
        .from('signing_request_signers')
        .select('*')
        .eq('id', signerId)
        .single()

      if (error || !data) {
        throw createNotFoundError('Signer', signerId)
      }

      return {
        success: true,
        data: data as Signer,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Update signer status
   */
  async updateSignerStatus(
    signerId: string,
    input: UpdateSignerStatusInput
  ): Promise<Result<Signer>> {
    try {
      const updateData: any = {
        status: input.status,
        updated_at: new Date().toISOString(),
      }

      // Set timestamps based on status
      if (input.status === SignerStatus.VIEWED) {
        updateData.viewed_at = new Date().toISOString()
      } else if (input.status === SignerStatus.SIGNED) {
        updateData.signed_at = new Date().toISOString()
      } else if (input.status === SignerStatus.DECLINED) {
        updateData.declined_at = new Date().toISOString()
        updateData.decline_reason = input.decline_reason
      }

      const { data, error } = await this.client
        .from('signing_request_signers')
        .update(updateData)
        .eq('id', signerId)
        .select()
        .single()

      if (error) {
        throw createInternalError('Failed to update signer status', error)
      }

      return {
        success: true,
        data: data as Signer,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  // ============================================================================
  // Signing Operations
  // ============================================================================

  /**
   * Sign a document
   */
  async signDocument(
    authUserId: string,
    authUserEmail: string,
    input: SignDocumentInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Result<{ request: SignatureRequest; signer: Signer }>> {
    try {
      // Get the request
      const requestResult = await this.getRequest(input.signature_request_id, authUserId, authUserEmail)
      if (!requestResult.success || !requestResult.data) {
        throw createNotFoundError('Signature request', input.signature_request_id)
      }

      const request = requestResult.data

      // Check if expired
      if (isExpired(request.expires_at)) {
        throw createExpirationError('Signature request', request.expires_at!)
      }

      // Find the signer
      const signer = request.signers.find((s) => s.id === input.signer_id)
      if (!signer) {
        throw createNotFoundError('Signer', input.signer_id)
      }

      // Enforce actor-to-signer mapping (Comment 13)
      const isAuthorizedSigner = signer.signer_id === authUserId || signer.signer_email === authUserEmail
      if (!isAuthorizedSigner) {
        throw createAuthError('You cannot sign on behalf of another user', 'signature', 'sign')
      }

      // Check if already signed
      if (signer.status === SignerStatus.SIGNED) {
        throw createConflictError('Document already signed', SignerStatus.SIGNED, SignerStatus.SIGNED)
      }

      // For sequential signing, check if it's this signer's turn
      if (request.signing_order === SigningOrder.SEQUENTIAL) {
        const canSign = await this.validateSigningPermission(input.signature_request_id, input.signer_id)
        if (!canSign) {
          throw createAuthError('It is not your turn to sign yet', 'signature', 'sign')
        }
      }

      // Verify TOTP if required (Comment 3)
      if (request.require_totp) {
        if (!input.totp_code) {
          throw createValidationError('TOTP code is required', 'totp_code')
        }

        // Import and verify TOTP
        const { TOTPService } = await import('../../totp-service')
        const verificationResult = await TOTPService.verifyTOTP(authUserId, input.totp_code, 'signing')

        if (!verificationResult.success) {
          throw createValidationError(
            verificationResult.error || 'Invalid TOTP code',
            'totp_code'
          )
        }
      }

      // Update signer with signature
      const { data: updatedSigner, error: signerError } = await this.client
        .from('signing_request_signers')
        .update({
          status: SignerStatus.SIGNED,
          signature_data: input.signature_data,
          signature_method: input.signature_method,
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.signer_id)
        .select()
        .single()

      if (signerError) {
        throw createInternalError('Failed to save signature', signerError)
      }

      // Update request completion count atomically to prevent race conditions
      // Uses PostgreSQL function to ensure atomic increment and status update
      const { data: completionResult, error: completionError } = await this.client
        .rpc('increment_completed_signers', {
          p_signing_request_id: input.signature_request_id,
          p_total_signers: request.total_signers,
        })

      if (completionError) {
        throw createInternalError('Failed to update completion counter', completionError)
      }

      // Get the updated request data
      const { data: updatedRequest, error: requestError } = await this.client
        .from('signing_requests')
        .select()
        .eq('id', input.signature_request_id)
        .single()

      if (requestError) {
        throw createInternalError('Failed to fetch updated request', requestError)
      }

      // Log audit event with IP and user agent (Comment 14)
      await this.logAuditEvent(
        input.signature_request_id,
        authUserId,
        AuditAction.SIGNED,
        {
          signer_id: input.signer_id,
          signature_method: input.signature_method,
        },
        ipAddress,
        userAgent
      )

      return {
        success: true,
        data: {
          request: updatedRequest as SignatureRequest,
          signer: updatedSigner as Signer,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Validate if a signer can sign (for sequential signing)
   */
  async validateSigningPermission(requestId: string, signerId: string): Promise<boolean> {
    try {
      const { data: signers, error } = await this.client
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order', { ascending: true })

      if (error || !signers) {
        return false
      }

      const currentSigner = signers.find((s) => s.id === signerId)
      if (!currentSigner) {
        return false
      }

      // Check if all previous signers have signed
      const previousSigners = signers.filter((s) => s.signing_order < currentSigner.signing_order)
      const allPreviousSigned = previousSigners.every((s) => s.status === SignerStatus.SIGNED)

      return allPreviousSigned
    } catch (error) {
      console.error('Error validating signing permission:', error)
      return false
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /**
   * Get signature request statistics
   */
  async getRequestStats(userId: string): Promise<Result<SignatureStats>> {
    try {
      const { data: requests, error } = await this.client
        .from('signing_requests')
        .select('*')
        .eq('initiated_by', userId)

      if (error) {
        throw createInternalError('Failed to fetch statistics', error)
      }

      const total = requests?.length || 0
      const completed = requests?.filter((r) => r.status === SignatureStatus.COMPLETED).length || 0
      const pending = requests?.filter((r) => r.status === SignatureStatus.IN_PROGRESS || r.status === SignatureStatus.INITIATED).length || 0
      const expired = requests?.filter((r) => r.status === SignatureStatus.EXPIRED).length || 0
      const cancelled = requests?.filter((r) => r.status === SignatureStatus.CANCELLED).length || 0

      const stats: SignatureStats = {
        total_requests: total,
        completed_requests: completed,
        pending_requests: pending,
        expired_requests: expired,
        cancelled_requests: cancelled,
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        average_time_to_complete: 0, // TODO: Calculate from completed requests
        total_signers: 0, // TODO: Calculate
        completed_signers: 0, // TODO: Calculate
      }

      return {
        success: true,
        data: stats,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Log an audit event
   */
  private async logAuditEvent(
    requestId: string,
    userId: string,
    action: AuditAction,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.client.from('signature_audit_log').insert({
        signature_request_id: requestId,
        signer_id: userId,
        action,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }
}

// Export singleton instance
export const signatureService = new SignatureService()


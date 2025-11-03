/**
 * Bulk Operations Service
 * Handles bulk operations on multiple signature requests
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  BulkOperationType,
  BulkOperationResult,
  Result,
  SignatureStatus,
  SignerStatus,
} from '../types/signature-types'
import {
  createValidationError,
  createAuthError,
  createInternalError,
  serializeError,
} from '../errors/signature-errors'
import { SIGNATURE_CONFIG } from '../config/signature-config'
import { signatureService } from '../core/signature-service'

/**
 * Bulk Operations Service
 */
export class BulkOperationsService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  /**
   * Execute bulk operation
   */
  async executeBulkOperation(
    userId: string,
    userEmail: string,
    operation: BulkOperationType,
    requestIds: string[],
    parameters?: Record<string, unknown>
  ): Promise<Result<BulkOperationResult>> {
    try {
      const startTime = Date.now()

      // Validate request count
      if (requestIds.length > SIGNATURE_CONFIG.limits.MAX_BULK_OPERATION_SIZE) {
        throw createValidationError(
          `Maximum ${SIGNATURE_CONFIG.limits.MAX_BULK_OPERATION_SIZE} requests allowed`,
          'request_ids'
        )
      }

      // Verify ownership of all requests
      const { data: requests, error: fetchError } = await this.client
        .from('signing_requests')
        .select('id, initiated_by, status')
        .in('id', requestIds)

      if (fetchError) {
        throw createInternalError('Failed to fetch requests', fetchError)
      }

      const unauthorizedRequests = requests?.filter((r) => r.initiated_by !== userId) || []
      if (unauthorizedRequests.length > 0) {
        throw createAuthError(
          `You do not own ${unauthorizedRequests.length} of the selected requests`,
          'signature_request',
          'bulk_operation'
        )
      }

      // Execute operation based on type
      let result: BulkOperationResult

      switch (operation) {
        case BulkOperationType.CANCEL:
          result = await this.bulkCancel(requestIds)
          break
        case BulkOperationType.DELETE:
          result = await this.bulkDelete(requestIds, userId, userEmail)
          break
        case BulkOperationType.REMIND:
          result = await this.bulkRemind(requestIds)
          break
        case BulkOperationType.EXTEND_EXPIRATION:
          result = await this.bulkExtendExpiration(requestIds, parameters?.days as number)
          break
        case BulkOperationType.EXPORT:
          result = await this.bulkExport(requestIds, parameters?.format as string)
          break
        default:
          throw createValidationError('Invalid bulk operation type', 'operation')
      }

      result.duration = Date.now() - startTime

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Bulk cancel requests
   */
  private async bulkCancel(requestIds: string[]): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        const { error } = await this.client
          .from('signing_requests')
          .update({
            status: SignatureStatus.CANCELLED,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .neq('status', SignatureStatus.COMPLETED)

        if (error) throw error

        // Update signers
        await this.client
          .from('signing_request_signers')
          .update({ status: SignerStatus.EXPIRED })
          .eq('signing_request_id', id)
          .in('status', [SignerStatus.PENDING, SignerStatus.SENT, SignerStatus.VIEWED])

        return id
      })
    )

    return this.aggregateResults(results, requestIds.length)
  }

  /**
   * Bulk delete requests
   */
  private async bulkDelete(requestIds: string[], userId: string, userEmail: string): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        const result = await signatureService.deleteRequest(id, userId, userEmail)
        if (!result.success) throw new Error(result.error?.message)
        return id
      })
    )

    return this.aggregateResults(results, requestIds.length)
  }

  /**
   * Bulk send reminders
   */
  private async bulkRemind(requestIds: string[]): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        // Get pending signers
        const { data: signers, error } = await this.client
          .from('signing_request_signers')
          .select('*')
          .eq('signing_request_id', id)
          .in('status', [SignerStatus.PENDING, SignerStatus.SENT, SignerStatus.VIEWED])

        if (error) throw error

        // Send reminders (would integrate with notification service)
        // For now, just update reminder_sent_at
        if (signers && signers.length > 0) {
          await this.client
            .from('signing_request_signers')
            .update({ reminder_sent_at: new Date().toISOString() })
            .in(
              'id',
              signers.map((s) => s.id)
            )
        }

        return id
      })
    )

    return this.aggregateResults(results, requestIds.length)
  }

  /**
   * Bulk extend expiration
   */
  private async bulkExtendExpiration(
    requestIds: string[],
    days: number = 30
  ): Promise<BulkOperationResult> {
    if (!days || days < 1 || days > SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS) {
      throw createValidationError(
        `Days must be between 1 and ${SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS}`,
        'days'
      )
    }

    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        const { data: request, error: fetchError } = await this.client
          .from('signing_requests')
          .select('expires_at')
          .eq('id', id)
          .single()

        if (fetchError) throw fetchError

        const currentExpiration = new Date(request.expires_at)
        const newExpiration = new Date(currentExpiration.getTime() + days * 24 * 60 * 60 * 1000)

        const { error } = await this.client
          .from('signing_requests')
          .update({
            expires_at: newExpiration.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) throw error

        return id
      })
    )

    return this.aggregateResults(results, requestIds.length)
  }

  /**
   * Bulk export requests
   */
  private async bulkExport(
    requestIds: string[],
    format: string = 'json'
  ): Promise<BulkOperationResult> {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        const { data, error } = await this.client
          .from('signing_requests')
          .select('*, signers:signing_request_signers(*)')
          .eq('id', id)
          .single()

        if (error) throw error

        return data
      })
    )

    const successful = results.filter((r) => r.status === 'fulfilled')
    const exportData = successful.map((r) => (r as PromiseFulfilledResult<any>).value)

    return {
      total: requestIds.length,
      successful: successful.length,
      failed: results.length - successful.length,
      errors: this.extractErrors(results),
      duration: 0,
      payload: {
        format,
        records: exportData,
        exported_at: new Date().toISOString(),
      },
    }
  }

  /**
   * Aggregate results from Promise.allSettled
   */
  private aggregateResults(
    results: PromiseSettledResult<string>[],
    total: number
  ): BulkOperationResult {
    const successful = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return {
      total,
      successful,
      failed,
      errors: this.extractErrors(results),
      duration: 0, // Will be set by caller
    }
  }

  /**
   * Extract errors from settled results (Comment 8)
   */
  private extractErrors(
    results: PromiseSettledResult<any>[]
  ): Array<{ id: string; error: string; code: string }> {
    return results
      .map((result, index) => {
        if (result.status === 'rejected') {
          const reason = result.reason
          // Map known error types to codes
          let code = 'UNKNOWN_ERROR'
          if (reason?.code) {
            code = reason.code
          } else if (reason?.message?.includes('not found')) {
            code = 'NOT_FOUND'
          } else if (reason?.message?.includes('permission')) {
            code = 'PERMISSION_DENIED'
          } else if (reason?.message?.includes('validation')) {
            code = 'VALIDATION_ERROR'
          }

          return {
            id: `item_${index}`,
            error: reason?.message || 'Unknown error',
            code,
          }
        }
        return null
      })
      .filter((e): e is { id: string; error: string; code: string } => e !== null)
  }
}

// Export singleton instance
export const bulkOperationsService = new BulkOperationsService()


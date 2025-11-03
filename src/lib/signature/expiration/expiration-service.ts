/**
 * Expiration Service
 * Manages document expiration and warnings
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../supabase'
import {
  Result,
  SignatureRequest,
  SignatureStatus,
  SignerStatus,
  ExpirationCheckResult,
} from '../types/signature-types'
import {
  createValidationError,
  createNotFoundError,
  createInternalError,
  serializeError,
} from '../errors/signature-errors'
import { SIGNATURE_CONFIG, isExpired } from '../config/signature-config'

/**
 * Expiration Service
 */
export class ExpirationService {
  private client: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.client = client || supabase
  }

  /**
   * Check for expiring and expired requests (cron job handler)
   */
  async checkExpirations(): Promise<Result<ExpirationCheckResult>> {
    try {
      const now = new Date()
      const results: ExpirationCheckResult = {
        checked: 0,
        expired: 0,
        warnings_sent: 0,
        errors: [],
      }

      // Find expired requests
      const { data: expiredRequests, error: expiredError } = await this.client
        .from('signing_requests')
        .select('id')
        .lte('expires_at', now.toISOString())
        .in('status', [SignatureStatus.INITIATED, SignatureStatus.IN_PROGRESS])
        .limit(100)

      if (expiredError) {
        throw createInternalError('Failed to fetch expired requests', expiredError)
      }

      // Expire requests
      if (expiredRequests && expiredRequests.length > 0) {
        for (const request of expiredRequests) {
          try {
            await this.expireRequest(request.id)
            results.expired++
          } catch (error) {
            results.errors.push({
              id: request.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }

      // Send expiration warnings
      for (const days of SIGNATURE_CONFIG.expiration.EXPIRATION_WARNING_DAYS) {
        const warningDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        const warningDateEnd = new Date(warningDate.getTime() + 24 * 60 * 60 * 1000)

        const { data: expiringRequests, error: expiringError } = await this.client
          .from('signing_requests')
          .select('id, title, expires_at')
          .gte('expires_at', warningDate.toISOString())
          .lt('expires_at', warningDateEnd.toISOString())
          .in('status', [SignatureStatus.INITIATED, SignatureStatus.IN_PROGRESS])
          .limit(100)

        if (expiringError) {
          console.error('Failed to fetch expiring requests:', expiringError)
          continue
        }

        if (expiringRequests && expiringRequests.length > 0) {
          for (const request of expiringRequests) {
            try {
              await this.sendExpirationWarning(request.id, days)
              results.warnings_sent++
            } catch (error) {
              results.errors.push({
                id: request.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        }
      }

      results.checked = expiredRequests?.length || 0

      return {
        success: true,
        data: results,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Expire a request
   */
  async expireRequest(requestId: string): Promise<Result<SignatureRequest>> {
    try {
      // Update request status
      const { data: request, error: requestError } = await this.client
        .from('signing_requests')
        .update({
          status: SignatureStatus.EXPIRED,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single()

      if (requestError) {
        throw createInternalError('Failed to expire request', requestError)
      }

      // Update all pending signers
      const { error: signersError } = await this.client
        .from('signing_request_signers')
        .update({
          status: SignerStatus.EXPIRED,
          updated_at: new Date().toISOString(),
        })
        .eq('signing_request_id', requestId)
        .in('status', [SignerStatus.PENDING, SignerStatus.SENT, SignerStatus.VIEWED])

      if (signersError) {
        console.error('Failed to update signers:', signersError)
      }

      // TODO: Send expiration notifications

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
   * Send expiration warning
   */
  async sendExpirationWarning(requestId: string, daysUntilExpiration: number): Promise<void> {
    try {
      // Get request details
      const { data: request, error } = await this.client
        .from('signing_requests')
        .select('*, signers:signing_request_signers(*)')
        .eq('id', requestId)
        .single()

      if (error || !request) {
        throw createNotFoundError('Signature request', requestId)
      }

      // TODO: Send warning notifications to pending signers
      // This would integrate with the notification service

      // Log the warning
      await this.client.from('signature_audit_log').insert({
        signature_request_id: requestId,
        action: 'expiration_warning_sent',
        details: {
          days_until_expiration: daysUntilExpiration,
          expires_at: request.expires_at,
        },
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to send expiration warning:', error)
      throw error
    }
  }

  /**
   * Extend expiration date
   */
  async extendExpiration(
    requestId: string,
    userId: string,
    days: number
  ): Promise<Result<SignatureRequest>> {
    try {
      // Validate days
      if (days < 1 || days > SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS) {
        throw createValidationError(
          `Days must be between 1 and ${SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS}`,
          'days'
        )
      }

      // Get current request
      const { data: request, error: fetchError } = await this.client
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError || !request) {
        throw createNotFoundError('Signature request', requestId)
      }

      // Calculate new expiration
      const currentExpiration = new Date(request.expires_at)
      const newExpiration = new Date(currentExpiration.getTime() + days * 24 * 60 * 60 * 1000)

      // Validate total expiration doesn't exceed max
      const createdAt = new Date(request.created_at)
      const totalDays = Math.ceil(
        (newExpiration.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (totalDays > SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS) {
        throw createValidationError(
          `Total expiration cannot exceed ${SIGNATURE_CONFIG.expiration.MAX_EXPIRATION_DAYS} days`,
          'days'
        )
      }

      // Update expiration
      const { data: updated, error: updateError } = await this.client
        .from('signing_requests')
        .update({
          expires_at: newExpiration.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single()

      if (updateError) {
        throw createInternalError('Failed to extend expiration', updateError)
      }

      // Log the extension
      await this.client.from('signature_audit_log').insert({
        signature_request_id: requestId,
        signer_id: userId,
        action: 'expiration_extended',
        details: {
          days_extended: days,
          new_expires_at: newExpiration.toISOString(),
          old_expires_at: request.expires_at,
        },
        created_at: new Date().toISOString(),
      })

      return {
        success: true,
        data: updated as SignatureRequest,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get expiring requests
   */
  async getExpiringRequests(
    userId: string,
    daysAhead: number = 7
  ): Promise<Result<SignatureRequest[]>> {
    try {
      const now = new Date()
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

      const { data, error } = await this.client
        .from('signing_requests')
        .select('*')
        .eq('initiated_by', userId)
        .gte('expires_at', now.toISOString())
        .lte('expires_at', futureDate.toISOString())
        .in('status', [SignatureStatus.INITIATED, SignatureStatus.IN_PROGRESS])
        .order('expires_at', { ascending: true })

      if (error) {
        throw createInternalError('Failed to fetch expiring requests', error)
      }

      return {
        success: true,
        data: (data || []) as SignatureRequest[],
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }
}

// Export singleton instance
export const expirationService = new ExpirationService()


/**
 * QR Code Verification Service
 * Handles QR code generation and verification for both single and multi-signature documents
 * Integrates with the unified signature system
 */

import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

export interface QRVerificationData {
  document_id: string
  signature_request_id: string
  document_hash: string
  signature_type: 'single' | 'multi'
  verification_url: string
  created_at: string
  expires_at?: string
}

export interface VerificationResult {
  success: boolean
  data?: {
    document: {
      id: string
      title: string
      file_name: string
      created_at: string
    }
    signature_request: {
      id: string
      title: string
      signature_type: 'single' | 'multi'
      status: string
      required_signers: number
      completed_signers: number
      created_at: string
      completed_at?: string
    }
    signers: Array<{
      id: string
      signer_id: string
      signer_name?: string
      status: string
      signed_at?: string
      signature_method?: string
    }>
    verification: {
      is_authentic: boolean
      is_complete: boolean
      is_expired: boolean
      verification_timestamp: string
    }
  }
  error?: string
}

export class QRVerificationService {
  private supabase: any
  private baseUrl: string

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Generate QR code for a signature request
   */
  async generateQRCode(
    signature_request_id: string,
    options?: {
      size?: number
      errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
      type?: 'image/png' | 'image/jpeg' | 'image/webp'
      quality?: number
    }
  ): Promise<{ success: boolean; qr_code?: string; verification_url?: string; error?: string }> {
    try {
      // Get signature request details
      const { data: request, error: requestError } = await this.supabase
        .from('signature_requests')
        .select(`
          id,
          document_id,
          signature_type,
          status,
          documents (
            id,
            title,
            file_name
          )
        `)
        .eq('id', signature_request_id)
        .single()

      if (requestError || !request) {
        return { success: false, error: 'Signature request not found' }
      }

      // Create verification URL
      const verification_url = `${this.baseUrl}/verify/${signature_request_id}`

      // Generate QR code
      const qrOptions = {
        errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
        type: options?.type || 'image/png',
        quality: options?.quality || 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: options?.size || 256
      }

      const qr_code = await QRCode.toDataURL(verification_url, qrOptions)

      return {
        success: true,
        qr_code,
        verification_url
      }

    } catch (error) {
      console.error('Error generating QR code:', error)
      return { success: false, error: 'Failed to generate QR code' }
    }
  }

  /**
   * Verify a signature request by ID
   */
  async verifySignatureRequest(signature_request_id: string): Promise<VerificationResult> {
    try {
      // Get signature request with all related data
      const { data: request, error: requestError } = await this.supabase
        .from('signature_requests')
        .select(`
          id,
          document_id,
          title,
          signature_type,
          status,
          required_signers,
          completed_signers,
          created_at,
          completed_at,
          expires_at,
          documents (
            id,
            title,
            file_name,
            created_at
          ),
          signature_signers (
            id,
            signer_id,
            signer_name,
            status,
            signed_at,
            signature_method,
            signature_metadata
          )
        `)
        .eq('id', signature_request_id)
        .single()

      if (requestError || !request) {
        return { success: false, error: 'Signature request not found' }
      }

      // Check if request is expired
      const now = new Date()
      const expiresAt = request.expires_at ? new Date(request.expires_at) : null
      const is_expired = expiresAt ? now > expiresAt : false

      // Determine authenticity
      const is_authentic = request.status !== 'cancelled' && !is_expired

      // Determine completion status
      const is_complete = request.status === 'completed'

      // Format signers data
      const signers = request.signature_signers.map((signer: any) => ({
        id: signer.id,
        signer_id: signer.signer_id,
        signer_name: signer.signer_name,
        status: signer.status,
        signed_at: signer.signed_at,
        signature_method: signer.signature_method
      }))

      return {
        success: true,
        data: {
          document: {
            id: request.documents.id,
            title: request.documents.title,
            file_name: request.documents.file_name,
            created_at: request.documents.created_at
          },
          signature_request: {
            id: request.id,
            title: request.title,
            signature_type: request.signature_type,
            status: request.status,
            required_signers: request.required_signers,
            completed_signers: request.completed_signers,
            created_at: request.created_at,
            completed_at: request.completed_at
          },
          signers,
          verification: {
            is_authentic,
            is_complete,
            is_expired,
            verification_timestamp: new Date().toISOString()
          }
        }
      }

    } catch (error) {
      console.error('Error verifying signature request:', error)
      return { success: false, error: 'Failed to verify signature request' }
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(
    user_id?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      let query = this.supabase
        .from('signature_requests')
        .select('id, status, signature_type, created_at, completed_at')

      if (user_id) {
        query = query.eq('initiator_id', user_id)
      }

      const { data: requests, error } = await query

      if (error) {
        return { success: false, error: error.message }
      }

      const stats = {
        total_requests: requests.length,
        by_status: {
          pending: requests.filter((r: any) => r.status === 'pending').length,
          in_progress: requests.filter((r: any) => r.status === 'in_progress').length,
          completed: requests.filter((r: any) => r.status === 'completed').length,
          expired: requests.filter((r: any) => r.status === 'expired').length,
          cancelled: requests.filter((r: any) => r.status === 'cancelled').length
        },
        by_type: {
          single: requests.filter((r: any) => r.signature_type === 'single').length,
          multi: requests.filter((r: any) => r.signature_type === 'multi').length
        },
        completion_rate: requests.length > 0
          ? Math.round((requests.filter((r: any) => r.status === 'completed').length / requests.length) * 100)
          : 0
      }

      return { success: true, data: stats }

    } catch (error) {
      console.error('Error getting verification stats:', error)
      return { success: false, error: 'Failed to get verification stats' }
    }
  }

  /**
   * Generate verification report
   */
  async generateVerificationReport(
    signature_request_id: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const verificationResult = await this.verifySignatureRequest(signature_request_id)

      if (!verificationResult.success || !verificationResult.data) {
        return { success: false, error: verificationResult.error }
      }

      const { data } = verificationResult

      // Get audit trail
      const { data: auditLog, error: auditError } = await this.supabase
        .from('signature_audit_log')
        .select('*')
        .eq('signature_request_id', signature_request_id)
        .order('created_at', { ascending: true })

      if (auditError) {
        console.warn('Could not fetch audit log:', auditError)
      }

      // Generate comprehensive report
      const report = {
        verification_summary: {
          document_title: data.document.title,
          signature_type: data.signature_request.signature_type,
          status: data.signature_request.status,
          is_authentic: data.verification.is_authentic,
          is_complete: data.verification.is_complete,
          is_expired: data.verification.is_expired,
          verification_date: data.verification.verification_timestamp
        },
        document_details: data.document,
        signature_details: data.signature_request,
        signers_summary: data.signers.map((signer: any) => ({
          signer_id: signer.signer_id,
          name: signer.signer_name || 'Unknown',
          status: signer.status,
          signed_date: signer.signed_at,
          signature_method: signer.signature_method || 'Unknown'
        })),
        audit_trail: auditLog || [],
        verification_metadata: {
          total_signers: data.signature_request.required_signers,
          completed_signers: data.signature_request.completed_signers,
          completion_percentage: Math.round(
            (data.signature_request.completed_signers / data.signature_request.required_signers) * 100
          ),
          created_date: data.signature_request.created_at,
          completed_date: data.signature_request.completed_at
        }
      }

      return { success: true, data: report }

    } catch (error) {
      console.error('Error generating verification report:', error)
      return { success: false, error: 'Failed to generate verification report' }
    }
  }

  /**
   * Validate QR code format and extract signature request ID
   */
  static parseQRCode(qr_data: string): { success: boolean; signature_request_id?: string; error?: string } {
    try {
      // Handle different QR code formats
      if (qr_data.includes('/verify/')) {
        // Extract signature request ID from URL
        const matches = qr_data.match(/\/verify\/([a-f0-9-]{36})/i)
        if (matches && matches[1]) {
          return { success: true, signature_request_id: matches[1] }
        }
      }

      // Handle direct UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (uuidRegex.test(qr_data)) {
        return { success: true, signature_request_id: qr_data }
      }

      return { success: false, error: 'Invalid QR code format' }

    } catch (_error) {
      return { success: false, error: 'Failed to parse QR code' }
    }
  }
}

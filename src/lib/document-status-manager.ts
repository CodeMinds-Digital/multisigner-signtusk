import { supabase } from './supabase'

export type DocumentStatus = 
  | 'draft'           // Template being created/edited
  | 'ready'           // Template complete, ready for signatures
  | 'sent'            // Signature request active
  | 'in_progress'     // Some signatures collected
  | 'completed'       // All signatures collected
  | 'cancelled'       // Request cancelled
  | 'expired'         // Request expired
  | 'declined'        // Request declined by recipient

export type SignerStatus = 
  | 'pending'         // Waiting for signature
  | 'signed'          // Successfully signed
  | 'declined'        // Declined to sign
  | 'expired'         // Signature deadline passed

export interface DocumentStatusInfo {
  status: DocumentStatus
  progress?: {
    signed: number
    total: number
    percentage: number
  }
  nextAction?: string
  canTransition?: DocumentStatus[]
  timeline?: StatusTimelineEvent[]
  urgency?: 'low' | 'medium' | 'high' | 'critical'
}

export interface StatusTimelineEvent {
  id: string
  type: 'created' | 'sent' | 'viewed' | 'signed' | 'declined' | 'completed' | 'cancelled' | 'expired'
  timestamp: string
  actor?: string
  description: string
  metadata?: any
}

export class DocumentStatusManager {
  /**
   * Get comprehensive status information for a document
   */
  static async getDocumentStatus(documentId: string, documentType: 'template' | 'signature_request'): Promise<DocumentStatusInfo> {
    try {
      if (documentType === 'template') {
        return await this.getTemplateStatus(documentId)
      } else {
        return await this.getSignatureRequestStatus(documentId)
      }
    } catch (error) {
      console.error('Error getting document status:', error)
      return {
        status: 'draft',
        nextAction: 'Unknown status',
        urgency: 'low'
      }
    }
  }

  /**
   * Get status for document template
   */
  private static async getTemplateStatus(templateId: string): Promise<DocumentStatusInfo> {
    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error || !template) {
      throw new Error('Template not found')
    }

    const hasSchemas = template.template_data?.schemas?.length > 0
    const hasPdf = template.template_data?.pdf_url

    let status: DocumentStatus = 'draft'
    let nextAction = 'Complete template setup'
    let canTransition: DocumentStatus[] = ['ready']

    if (hasSchemas && hasPdf) {
      status = 'ready'
      nextAction = 'Request signatures'
      canTransition = ['sent']
    }

    return {
      status,
      nextAction,
      canTransition,
      urgency: 'low',
      timeline: [
        {
          id: '1',
          type: 'created',
          timestamp: template.created_at,
          description: 'Template created',
          actor: 'You'
        }
      ]
    }
  }

  /**
   * Get status for signature request
   */
  private static async getSignatureRequestStatus(requestId: string): Promise<DocumentStatusInfo> {
    const { data: request, error } = await supabase
      .from('signature_requests')
      .select(`
        *,
        signature_request_signers (
          id,
          email,
          status,
          order_index,
          signed_at,
          created_at
        )
      `)
      .eq('id', requestId)
      .single()

    if (error || !request) {
      throw new Error('Signature request not found')
    }

    const signers = request.signature_request_signers || []
    const totalSigners = signers.length
    const signedCount = signers.filter((s: any) => s.status === 'signed').length
    const declinedCount = signers.filter((s: any) => s.status === 'declined').length

    let status: DocumentStatus = request.status
    let nextAction = 'Waiting for signatures'
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium'

    // Check if expired
    if (request.expires_at && new Date(request.expires_at) < new Date()) {
      status = 'expired'
      nextAction = 'Request has expired'
      urgency = 'critical'
    }

    // Check if declined
    if (declinedCount > 0) {
      status = 'declined'
      nextAction = 'Request was declined'
      urgency = 'high'
    }

    // Check if completed
    if (signedCount === totalSigners && totalSigners > 0) {
      status = 'completed'
      nextAction = 'All signatures collected'
      urgency = 'low'
    }

    // Check urgency based on time remaining
    if (request.expires_at && status === 'sent' || status === 'in_progress') {
      const timeRemaining = new Date(request.expires_at).getTime() - new Date().getTime()
      const daysRemaining = timeRemaining / (1000 * 60 * 60 * 24)
      
      if (daysRemaining < 1) {
        urgency = 'critical'
      } else if (daysRemaining < 3) {
        urgency = 'high'
      } else if (daysRemaining < 7) {
        urgency = 'medium'
      }
    }

    // Build timeline
    const timeline: StatusTimelineEvent[] = [
      {
        id: '1',
        type: 'created',
        timestamp: request.created_at,
        description: 'Signature request created',
        actor: 'You'
      },
      {
        id: '2',
        type: 'sent',
        timestamp: request.created_at,
        description: `Sent to ${totalSigners} recipient${totalSigners > 1 ? 's' : ''}`,
        actor: 'You'
      }
    ]

    // Add signer events
    signers.forEach((signer: any, index: number) => {
      if (signer.status === 'signed' && signer.signed_at) {
        timeline.push({
          id: `signer-${index}`,
          type: 'signed',
          timestamp: signer.signed_at,
          description: `Signed by ${signer.email}`,
          actor: signer.email
        })
      } else if (signer.status === 'declined') {
        timeline.push({
          id: `signer-${index}`,
          type: 'declined',
          timestamp: signer.signed_at || new Date().toISOString(),
          description: `Declined by ${signer.email}`,
          actor: signer.email
        })
      }
    })

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      status,
      progress: {
        signed: signedCount,
        total: totalSigners,
        percentage: totalSigners > 0 ? Math.round((signedCount / totalSigners) * 100) : 0
      },
      nextAction,
      urgency,
      timeline
    }
  }

  /**
   * Get status badge configuration
   */
  static getStatusBadgeConfig(status: DocumentStatus) {
    const configs = {
      draft: {
        variant: 'outline' as const,
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: '📝',
        label: 'Draft'
      },
      ready: {
        variant: 'default' as const,
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '✅',
        label: 'Ready'
      },
      sent: {
        variant: 'secondary' as const,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '📤',
        label: 'Sent'
      },
      in_progress: {
        variant: 'secondary' as const,
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: '⏳',
        label: 'In Progress'
      },
      completed: {
        variant: 'default' as const,
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅',
        label: 'Completed'
      },
      cancelled: {
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '❌',
        label: 'Cancelled'
      },
      expired: {
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '⏰',
        label: 'Expired'
      },
      declined: {
        variant: 'destructive' as const,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '❌',
        label: 'Declined'
      }
    }

    return configs[status] || configs.draft
  }

  /**
   * Get urgency indicator configuration
   */
  static getUrgencyConfig(urgency: 'low' | 'medium' | 'high' | 'critical') {
    const configs = {
      low: {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: '🟢',
        label: 'Low Priority'
      },
      medium: {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: '🟡',
        label: 'Medium Priority'
      },
      high: {
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: '🟠',
        label: 'High Priority'
      },
      critical: {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: '🔴',
        label: 'Critical'
      }
    }

    return configs[urgency]
  }

  /**
   * Format time remaining until expiration
   */
  static formatTimeRemaining(expiresAt: string): string {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()

    if (diffMs <= 0) {
      return 'Expired'
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} remaining`
    }
  }

  /**
   * Get next recommended actions for a document
   */
  static getRecommendedActions(statusInfo: DocumentStatusInfo): Array<{
    id: string
    label: string
    type: 'primary' | 'secondary' | 'danger'
    icon: string
  }> {
    const actions = []

    switch (statusInfo.status) {
      case 'draft':
        actions.push(
          { id: 'edit', label: 'Complete Template', type: 'primary' as const, icon: '✏️' },
          { id: 'preview', label: 'Preview', type: 'secondary' as const, icon: '👁️' }
        )
        break

      case 'ready':
        actions.push(
          { id: 'request_signature', label: 'Request Signature', type: 'primary' as const, icon: '📤' },
          { id: 'edit', label: 'Edit Template', type: 'secondary' as const, icon: '✏️' },
          { id: 'preview', label: 'Preview', type: 'secondary' as const, icon: '👁️' }
        )
        break

      case 'sent':
      case 'in_progress':
        actions.push(
          { id: 'view_progress', label: 'View Progress', type: 'primary' as const, icon: '📊' },
          { id: 'send_reminder', label: 'Send Reminder', type: 'secondary' as const, icon: '🔔' },
          { id: 'cancel', label: 'Cancel Request', type: 'danger' as const, icon: '❌' }
        )
        break

      case 'completed':
        actions.push(
          { id: 'view_signed', label: 'View Signed Document', type: 'primary' as const, icon: '📄' },
          { id: 'download', label: 'Download', type: 'secondary' as const, icon: '⬇️' },
          { id: 'share', label: 'Share', type: 'secondary' as const, icon: '🔗' }
        )
        break

      case 'expired':
      case 'cancelled':
      case 'declined':
        actions.push(
          { id: 'resend', label: 'Send New Request', type: 'primary' as const, icon: '🔄' },
          { id: 'archive', label: 'Archive', type: 'secondary' as const, icon: '📦' }
        )
        break
    }

    return actions
  }
}

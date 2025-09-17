// Data retention service - standalone implementation for compliance

export interface RetentionPolicy {
  id: string
  name: string
  description: string
  data_type: string
  retention_period_days: number
  auto_delete: boolean
  legal_basis: string
  jurisdiction: string
  created_at: string
  updated_at: string
}

export interface RetentionSchedule {
  id: string
  policy_id: string
  data_identifier: string
  created_date: string
  expiry_date: string
  status: 'active' | 'expired' | 'deleted' | 'on_hold'
  deletion_date?: string
  hold_reason?: string
}

export interface DataDeletionRequest {
  id: string
  user_id: string
  request_type: 'user_request' | 'retention_policy' | 'legal_hold' | 'admin_request'
  data_types: string[]
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_at: string
  processed_at?: string
  processed_by?: string
  notes?: string
}

export class DataRetentionService {
  private static retentionPolicies: RetentionPolicy[] = []
  private static retentionSchedules: RetentionSchedule[] = []
  private static deletionRequests: DataDeletionRequest[] = []

  /**
   * Initialize default retention policies
   */
  static initializeDefaultPolicies(): void {
    this.retentionPolicies = [
      {
        id: 'policy-audit-logs',
        name: 'Audit Logs Retention',
        description: 'Retention policy for audit trail logs',
        data_type: 'audit_logs',
        retention_period_days: 2555, // 7 years
        auto_delete: false, // Manual review required
        legal_basis: 'Legal compliance and security monitoring',
        jurisdiction: 'Global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'policy-signatures',
        name: 'Digital Signatures Retention',
        description: 'Retention policy for digital signatures and signed documents',
        data_type: 'signatures',
        retention_period_days: 3650, // 10 years
        auto_delete: false,
        legal_basis: 'Legal evidence preservation',
        jurisdiction: 'Global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'policy-user-data',
        name: 'User Personal Data Retention',
        description: 'Retention policy for user personal information',
        data_type: 'user_data',
        retention_period_days: 2555, // 7 years after account closure
        auto_delete: false,
        legal_basis: 'GDPR Article 6(1)(f) - Legitimate interests',
        jurisdiction: 'EU',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'policy-session-logs',
        name: 'Session Logs Retention',
        description: 'Retention policy for user session logs',
        data_type: 'session_logs',
        retention_period_days: 90, // 3 months
        auto_delete: true,
        legal_basis: 'Security monitoring',
        jurisdiction: 'Global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'policy-temp-files',
        name: 'Temporary Files Retention',
        description: 'Retention policy for temporary files and cache',
        data_type: 'temp_files',
        retention_period_days: 30, // 1 month
        auto_delete: true,
        legal_basis: 'System maintenance',
        jurisdiction: 'Global',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  }

  /**
   * Create retention schedule for data
   */
  static createRetentionSchedule(
    policyId: string,
    dataIdentifier: string,
    createdDate: string
  ): RetentionSchedule | null {
    try {
      const policy = this.retentionPolicies.find(p => p.id === policyId)
      if (!policy) {
        console.error('Retention policy not found:', policyId)
        return null
      }

      const expiryDate = new Date(createdDate)
      expiryDate.setDate(expiryDate.getDate() + policy.retention_period_days)

      const schedule: RetentionSchedule = {
        id: this.generateId(),
        policy_id: policyId,
        data_identifier: dataIdentifier,
        created_date: createdDate,
        expiry_date: expiryDate.toISOString(),
        status: 'active'
      }

      this.retentionSchedules.push(schedule)
      return schedule
    } catch (error) {
      console.error('Error creating retention schedule:', error)
      return null
    }
  }

  /**
   * Check for expired data
   */
  static checkExpiredData(): {
    expired_schedules: RetentionSchedule[]
    auto_delete_candidates: RetentionSchedule[]
    manual_review_required: RetentionSchedule[]
  } {
    const now = new Date()
    const expiredSchedules = this.retentionSchedules.filter(
      schedule => schedule.status === 'active' && new Date(schedule.expiry_date) <= now
    )

    const autoDeleteCandidates: RetentionSchedule[] = []
    const manualReviewRequired: RetentionSchedule[] = []

    expiredSchedules.forEach(schedule => {
      const policy = this.retentionPolicies.find(p => p.id === schedule.policy_id)
      if (policy?.auto_delete) {
        autoDeleteCandidates.push(schedule)
      } else {
        manualReviewRequired.push(schedule)
      }
    })

    return {
      expired_schedules: expiredSchedules,
      auto_delete_candidates: autoDeleteCandidates,
      manual_review_required: manualReviewRequired
    }
  }

  /**
   * Process data deletion request
   */
  static createDeletionRequest(
    userId: string,
    requestType: DataDeletionRequest['request_type'],
    dataTypes: string[],
    reason: string
  ): DataDeletionRequest {
    const request: DataDeletionRequest = {
      id: this.generateId(),
      user_id: userId,
      request_type: requestType,
      data_types: dataTypes,
      reason,
      status: 'pending',
      requested_at: new Date().toISOString()
    }

    this.deletionRequests.push(request)
    return request
  }

  /**
   * Process GDPR right to be forgotten request
   */
  static processRightToBeForgotten(
    userId: string,
    reason: string = 'User requested data deletion under GDPR Article 17'
  ): DataDeletionRequest {
    const dataTypes = [
      'user_data',
      'session_logs',
      'preferences',
      'activity_logs'
    ]

    return this.createDeletionRequest(userId, 'user_request', dataTypes, reason)
  }

  /**
   * Approve deletion request
   */
  static approveDeletionRequest(
    requestId: string,
    processedBy: string,
    notes?: string
  ): boolean {
    try {
      const request = this.deletionRequests.find(r => r.id === requestId)
      if (!request) {
        return false
      }

      request.status = 'approved'
      request.processed_at = new Date().toISOString()
      request.processed_by = processedBy
      request.notes = notes

      // In a real implementation, this would trigger actual data deletion
      console.log(`Data deletion approved for request ${requestId}`)
      
      return true
    } catch (error) {
      console.error('Error approving deletion request:', error)
      return false
    }
  }

  /**
   * Mark data as deleted
   */
  static markDataDeleted(scheduleId: string): boolean {
    try {
      const schedule = this.retentionSchedules.find(s => s.id === scheduleId)
      if (!schedule) {
        return false
      }

      schedule.status = 'deleted'
      schedule.deletion_date = new Date().toISOString()
      
      return true
    } catch (error) {
      console.error('Error marking data as deleted:', error)
      return false
    }
  }

  /**
   * Put data on legal hold
   */
  static putOnLegalHold(scheduleId: string, reason: string): boolean {
    try {
      const schedule = this.retentionSchedules.find(s => s.id === scheduleId)
      if (!schedule) {
        return false
      }

      schedule.status = 'on_hold'
      schedule.hold_reason = reason
      
      return true
    } catch (error) {
      console.error('Error putting data on legal hold:', error)
      return false
    }
  }

  /**
   * Release from legal hold
   */
  static releaseFromLegalHold(scheduleId: string): boolean {
    try {
      const schedule = this.retentionSchedules.find(s => s.id === scheduleId)
      if (!schedule) {
        return false
      }

      schedule.status = 'active'
      schedule.hold_reason = undefined
      
      return true
    } catch (error) {
      console.error('Error releasing from legal hold:', error)
      return false
    }
  }

  /**
   * Get retention report
   */
  static getRetentionReport(): {
    policies: RetentionPolicy[]
    active_schedules: number
    expired_schedules: number
    deleted_data: number
    pending_deletions: number
    legal_holds: number
  } {
    const activeSchedules = this.retentionSchedules.filter(s => s.status === 'active').length
    const expiredSchedules = this.retentionSchedules.filter(s => s.status === 'expired').length
    const deletedData = this.retentionSchedules.filter(s => s.status === 'deleted').length
    const pendingDeletions = this.deletionRequests.filter(r => r.status === 'pending').length
    const legalHolds = this.retentionSchedules.filter(s => s.status === 'on_hold').length

    return {
      policies: this.retentionPolicies,
      active_schedules: activeSchedules,
      expired_schedules: expiredSchedules,
      deleted_data: deletedData,
      pending_deletions: pendingDeletions,
      legal_holds: legalHolds
    }
  }

  /**
   * Get user data for deletion
   */
  static getUserDataForDeletion(userId: string): {
    data_types: string[]
    retention_schedules: RetentionSchedule[]
    estimated_deletion_date: string
  } {
    const userSchedules = this.retentionSchedules.filter(
      s => s.data_identifier.includes(userId) && s.status === 'active'
    )

    const dataTypes = [...new Set(userSchedules.map(s => {
      const policy = this.retentionPolicies.find(p => p.id === s.policy_id)
      return policy?.data_type || 'unknown'
    }))]

    // Find the latest expiry date
    const latestExpiry = userSchedules.reduce((latest, schedule) => {
      const expiryDate = new Date(schedule.expiry_date)
      return expiryDate > latest ? expiryDate : latest
    }, new Date())

    return {
      data_types: dataTypes,
      retention_schedules: userSchedules,
      estimated_deletion_date: latestExpiry.toISOString()
    }
  }

  /**
   * Helper method to generate IDs
   */
  private static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Get all retention policies
   */
  static getRetentionPolicies(): RetentionPolicy[] {
    return this.retentionPolicies
  }

  /**
   * Get deletion requests
   */
  static getDeletionRequests(status?: DataDeletionRequest['status']): DataDeletionRequest[] {
    if (status) {
      return this.deletionRequests.filter(r => r.status === status)
    }
    return this.deletionRequests
  }
}

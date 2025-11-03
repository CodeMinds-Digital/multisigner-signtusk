/**
 * Audit Log Service
 * Tamper-evident audit logging for sensitive actions
 * Uses hash chaining to detect tampering
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { createHash } from 'crypto'

export interface AuditLogEntry {
  id?: string
  user_id?: string
  user_email?: string
  action: string
  resource_type: string
  resource_id?: string
  ip_address?: string
  user_agent?: string
  before_state?: any
  after_state?: any
  metadata?: any
  previous_hash?: string
  current_hash?: string
  created_at?: string
}

export interface AuditLogFilter {
  userId?: string
  userEmail?: string
  action?: string
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export class AuditLogService {
  /**
   * Log an audit event with hash chaining for tamper evidence
   */
  static async log(entry: Omit<AuditLogEntry, 'id' | 'previous_hash' | 'current_hash' | 'created_at'>): Promise<void> {
    try {
      // Get the most recent audit log entry to get previous hash
      const { data: lastEntry } = await supabaseAdmin
        .from('send_audit_logs')
        .select('current_hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const previousHash = lastEntry?.current_hash || 'genesis'

      // Create current hash from entry data + previous hash
      const currentHash = this.createHash({
        ...entry,
        previous_hash: previousHash,
        timestamp: new Date().toISOString()
      })

      // Insert audit log entry
      const { error } = await supabaseAdmin
        .from('send_audit_logs')
        .insert({
          user_id: entry.user_id,
          user_email: entry.user_email,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          before_state: entry.before_state,
          after_state: entry.after_state,
          metadata: entry.metadata,
          previous_hash: previousHash,
          current_hash: currentHash,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Failed to create audit log:', error)
      }
    } catch (error) {
      console.error('Audit log error:', error)
      // Don't throw - audit logging failure shouldn't break the main flow
    }
  }

  /**
   * Create hash from audit log data
   */
  private static createHash(data: any): string {
    const hashInput = JSON.stringify(data, Object.keys(data).sort())
    return createHash('sha256').update(hashInput).digest('hex')
  }

  /**
   * Verify integrity of audit log chain
   */
  static async verifyIntegrity(startDate?: Date, endDate?: Date): Promise<{
    valid: boolean
    totalChecked: number
    errors: Array<{ id: string; reason: string }>
  }> {
    try {
      let query = supabaseAdmin
        .from('send_audit_logs')
        .select('*')
        .order('created_at', { ascending: true })

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString())
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString())
      }

      const { data: logs, error } = await query

      if (error || !logs) {
        return { valid: false, totalChecked: 0, errors: [{ id: 'query', reason: 'Failed to fetch logs' }] }
      }

      const errors: Array<{ id: string; reason: string }> = []
      let previousHash = 'genesis'

      for (const log of logs) {
        // Check if previous hash matches
        if (log.previous_hash !== previousHash) {
          errors.push({
            id: log.id,
            reason: `Previous hash mismatch. Expected: ${previousHash}, Got: ${log.previous_hash}`
          })
        }

        // Verify current hash
        const expectedHash = this.createHash({
          user_id: log.user_id,
          user_email: log.user_email,
          action: log.action,
          resource_type: log.resource_type,
          resource_id: log.resource_id,
          ip_address: log.ip_address,
          user_agent: log.user_agent,
          before_state: log.before_state,
          after_state: log.after_state,
          metadata: log.metadata,
          previous_hash: log.previous_hash,
          timestamp: log.created_at
        })

        if (log.current_hash !== expectedHash) {
          errors.push({
            id: log.id,
            reason: `Current hash mismatch. Expected: ${expectedHash}, Got: ${log.current_hash}`
          })
        }

        previousHash = log.current_hash
      }

      return {
        valid: errors.length === 0,
        totalChecked: logs.length,
        errors
      }
    } catch (error) {
      console.error('Integrity verification error:', error)
      return { valid: false, totalChecked: 0, errors: [{ id: 'system', reason: 'Verification failed' }] }
    }
  }

  /**
   * Query audit logs with filters
   */
  static async query(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    try {
      let query = supabaseAdmin
        .from('send_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter.userId) {
        query = query.eq('user_id', filter.userId)
      }
      if (filter.userEmail) {
        query = query.eq('user_email', filter.userEmail)
      }
      if (filter.action) {
        query = query.eq('action', filter.action)
      }
      if (filter.resourceType) {
        query = query.eq('resource_type', filter.resourceType)
      }
      if (filter.resourceId) {
        query = query.eq('resource_id', filter.resourceId)
      }
      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString())
      }
      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString())
      }
      if (filter.limit) {
        query = query.limit(filter.limit)
      }
      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('Failed to query audit logs:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Audit log query error:', error)
      return []
    }
  }

  /**
   * Export audit logs to JSON
   */
  static async export(filter: AuditLogFilter = {}): Promise<string> {
    const logs = await this.query(filter)
    return JSON.stringify(logs, null, 2)
  }

  /**
   * Export audit logs to CSV
   */
  static async exportCSV(filter: AuditLogFilter = {}): Promise<string> {
    const logs = await this.query(filter)
    
    if (logs.length === 0) {
      return 'No audit logs found'
    }

    // CSV headers
    const headers = [
      'ID',
      'Timestamp',
      'User ID',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Previous Hash',
      'Current Hash'
    ]

    // CSV rows
    const rows = logs.map(log => [
      log.id,
      log.created_at,
      log.user_id || '',
      log.user_email || '',
      log.action,
      log.resource_type,
      log.resource_id || '',
      log.ip_address || '',
      log.user_agent || '',
      log.previous_hash || '',
      log.current_hash || ''
    ])

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csv
  }

  /**
   * Common audit actions
   */
  static readonly Actions = {
    // Authentication
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    PASSWORD_CHANGE: 'auth.password_change',
    MFA_ENABLE: 'auth.mfa_enable',
    MFA_DISABLE: 'auth.mfa_disable',
    
    // SSO
    SSO_LOGIN: 'sso.login',
    SSO_CONFIG_UPDATE: 'sso.config_update',
    
    // Documents
    DOCUMENT_CREATE: 'document.create',
    DOCUMENT_UPDATE: 'document.update',
    DOCUMENT_DELETE: 'document.delete',
    DOCUMENT_SHARE: 'document.share',
    DOCUMENT_ACCESS: 'document.access',
    
    // Links
    LINK_CREATE: 'link.create',
    LINK_UPDATE: 'link.update',
    LINK_DELETE: 'link.delete',
    LINK_ACCESS: 'link.access',
    
    // Access Controls
    ACCESS_CONTROL_UPDATE: 'access_control.update',
    ACCESS_DENIED: 'access_control.denied',
    
    // NDA
    NDA_ACCEPT: 'nda.accept',
    NDA_DECLINE: 'nda.decline',
    
    // Permissions
    PERMISSION_GRANT: 'permission.grant',
    PERMISSION_REVOKE: 'permission.revoke',
    
    // Settings
    SETTINGS_UPDATE: 'settings.update'
  } as const
}


// Legal compliance service - standalone implementation without external dependencies
import { supabaseAdmin } from './supabase-admin'

export interface ComplianceFramework {
  id: string
  name: string
  region: string
  requirements: ComplianceRequirement[]
  active: boolean
}

export interface ComplianceRequirement {
  id: string
  name: string
  description: string
  mandatory: boolean
  implementation_status: 'not_implemented' | 'partial' | 'implemented' | 'verified'
  evidence_required: string[]
  last_audit_date?: string
  next_audit_date?: string
}

export interface AuditTrail {
  id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string
  details: any
  ip_address: string
  user_agent: string
  timestamp: string
  compliance_frameworks: string[]
}

export interface LegalDocument {
  id: string
  type: 'terms_of_service' | 'privacy_policy' | 'consent_form' | 'disclosure' | 'other'
  title: string
  content: string
  version: string
  effective_date: string
  jurisdiction: string
  language: string
  status: 'draft' | 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface ConsentRecord {
  id: string
  user_id: string
  document_id: string
  consent_type: string
  consent_given: boolean
  consent_date: string
  ip_address: string
  user_agent: string
  withdrawal_date?: string
  evidence: any
}

export class LegalComplianceService {
  private static complianceFrameworks: ComplianceFramework[] = []
  private static auditTrails: AuditTrail[] = []
  private static consentRecords: ConsentRecord[] = []
  private static legalDocuments: LegalDocument[] = []

  /**
   * Initialize compliance frameworks
   */
  static initializeComplianceFrameworks(): void {
    this.complianceFrameworks = [
      {
        id: 'eidas-eu',
        name: 'eIDAS (EU)',
        region: 'EU',
        active: true,
        requirements: [
          {
            id: 'eidas-1',
            name: 'Qualified Electronic Signatures',
            description: 'Support for qualified electronic signatures with qualified certificates',
            mandatory: true,
            implementation_status: 'partial',
            evidence_required: ['certificate_validation', 'signature_verification', 'timestamp_authority']
          },
          {
            id: 'eidas-2',
            name: 'Identity Verification',
            description: 'Strong identity verification for signers',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['identity_verification_logs', 'authentication_records']
          },
          {
            id: 'eidas-3',
            name: 'Audit Trail',
            description: 'Comprehensive audit trail for all signature activities',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['audit_logs', 'integrity_verification']
          }
        ]
      },
      {
        id: 'esign-us',
        name: 'ESIGN Act (US)',
        region: 'US',
        active: true,
        requirements: [
          {
            id: 'esign-1',
            name: 'Intent to Sign',
            description: 'Clear indication of intent to sign electronically',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['consent_records', 'signature_intent_logs']
          },
          {
            id: 'esign-2',
            name: 'Record Retention',
            description: 'Proper retention of electronic records and signatures',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['retention_policies', 'backup_procedures']
          },
          {
            id: 'esign-3',
            name: 'Consumer Consent',
            description: 'Proper consumer consent for electronic transactions',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['consent_forms', 'disclosure_records']
          }
        ]
      },
      {
        id: 'gdpr-eu',
        name: 'GDPR (EU)',
        region: 'EU',
        active: true,
        requirements: [
          {
            id: 'gdpr-1',
            name: 'Data Protection by Design',
            description: 'Privacy protection built into system design',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['privacy_impact_assessment', 'data_protection_measures']
          },
          {
            id: 'gdpr-2',
            name: 'Right to be Forgotten',
            description: 'Ability to delete personal data upon request',
            mandatory: true,
            implementation_status: 'implemented',
            evidence_required: ['data_deletion_procedures', 'deletion_logs']
          },
          {
            id: 'gdpr-3',
            name: 'Data Breach Notification',
            description: '72-hour breach notification requirement',
            mandatory: true,
            implementation_status: 'partial',
            evidence_required: ['incident_response_plan', 'notification_procedures']
          }
        ]
      }
    ]
  }

  /**
   * Log audit trail entry
   */
  static logAuditTrail(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: any,
    ipAddress: string,
    userAgent: string,
    complianceFrameworks: string[] = []
  ): void {
    try {
      const auditEntry: AuditTrail = {
        id: crypto.randomUUID(),
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString(),
        compliance_frameworks: complianceFrameworks
      }

      this.auditTrails.push(auditEntry)

      // Keep only last 10000 entries to prevent memory issues
      if (this.auditTrails.length > 10000) {
        this.auditTrails = this.auditTrails.slice(-10000)
      }
    } catch (error) {
      console.error('Error logging audit trail:', error)
    }
  }

  /**
   * Record user consent
   */
  static recordConsent(
    userId: string,
    documentId: string,
    consentType: string,
    consentGiven: boolean,
    ipAddress: string,
    userAgent: string,
    evidence?: any
  ): ConsentRecord | null {
    try {
      const consentRecord: ConsentRecord = {
        id: crypto.randomUUID(),
        user_id: userId,
        document_id: documentId,
        consent_type: consentType,
        consent_given: consentGiven,
        consent_date: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        evidence: evidence || {}
      }

      this.consentRecords.push(consentRecord)

      // Log audit trail
      this.logAuditTrail(
        userId,
        'consent_recorded',
        'consent',
        consentRecord.id,
        { consent_type: consentType, consent_given: consentGiven },
        ipAddress,
        userAgent,
        ['GDPR', 'ESIGN']
      )

      return consentRecord
    } catch (error) {
      console.error('Error recording consent:', error)
      return null
    }
  }

  /**
   * Withdraw consent
   */
  static async withdrawConsent(
    consentId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('consent_records')
        .update({
          consent_given: false,
          withdrawal_date: new Date().toISOString()
        })
        .eq('id', consentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error withdrawing consent:', error)
        return false
      }

      // Log audit trail
      await this.logAuditTrail(
        userId,
        'consent_withdrawn',
        'consent',
        consentId,
        {},
        ipAddress,
        userAgent,
        ['GDPR']
      )

      return true
    } catch (error) {
      console.error('Error withdrawing consent:', error)
      return false
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    frameworkName: string,
    startDate: string,
    endDate: string
  ): Promise<any> {
    try {
      // Get framework
      const { data: framework } = await supabaseAdmin
        .from('compliance_frameworks')
        .select('*')
        .eq('name', frameworkName)
        .single()

      if (!framework) {
        throw new Error('Framework not found')
      }

      // Get audit trails for the period
      const { data: auditTrails } = await supabaseAdmin
        .from('audit_trails')
        .select('*')
        .contains('compliance_frameworks', [frameworkName])
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: false })

      // Get consent records
      const { data: consentRecords } = await supabaseAdmin
        .from('consent_records')
        .select('*')
        .gte('consent_date', startDate)
        .lte('consent_date', endDate)

      // Generate statistics
      const stats = {
        total_audit_entries: auditTrails?.length || 0,
        total_consents: consentRecords?.length || 0,
        consent_withdrawals: consentRecords?.filter(c => c.withdrawal_date).length || 0,
        signature_activities: auditTrails?.filter(a => a.action.includes('sign')).length || 0,
        document_activities: auditTrails?.filter(a => a.resource_type === 'document').length || 0
      }

      return {
        framework: framework.name,
        region: framework.region,
        period: { start: startDate, end: endDate },
        statistics: stats,
        requirements: framework.requirements,
        audit_trails: auditTrails,
        consent_records: consentRecords,
        generated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error generating compliance report:', error)
      return null
    }
  }

  /**
   * Validate signature compliance
   */
  static async validateSignatureCompliance(
    signatureId: string,
    jurisdiction: string
  ): Promise<{ compliant: boolean; issues: string[] }> {
    try {
      const issues: string[] = []

      // Get signature details
      const { data: signature } = await supabaseAdmin
        .from('signatures')
        .select(`
          *,
          signing_requests (*),
          digital_signatures (*)
        `)
        .eq('id', signatureId)
        .single()

      if (!signature) {
        return { compliant: false, issues: ['Signature not found'] }
      }

      // Check based on jurisdiction
      switch (jurisdiction.toUpperCase()) {
        case 'EU':
          // eIDAS compliance checks
          if (!signature.digital_signatures || signature.digital_signatures.length === 0) {
            issues.push('No digital signature found - required for eIDAS compliance')
          }

          if (!signature.signing_requests?.audit_trail) {
            issues.push('No audit trail found - required for eIDAS compliance')
          }

          // Check for qualified certificate (if required)
          if (signature.digital_signatures?.[0]?.certificate_type !== 'qualified') {
            issues.push('Non-qualified certificate used - may not meet eIDAS requirements for qualified signatures')
          }
          break

        case 'US':
          // ESIGN Act compliance checks
          if (!signature.consent_to_electronic_signature) {
            issues.push('No consent to electronic signature - required for ESIGN Act compliance')
          }

          if (!signature.intent_to_sign_evidence) {
            issues.push('No evidence of intent to sign - required for ESIGN Act compliance')
          }

          if (!signature.signing_requests?.retention_policy_accepted) {
            issues.push('No retention policy acceptance - required for ESIGN Act compliance')
          }
          break

        default:
          issues.push(`Unknown jurisdiction: ${jurisdiction}`)
      }

      // Common checks
      if (!signature.ip_address) {
        issues.push('No IP address recorded')
      }

      if (!signature.timestamp) {
        issues.push('No timestamp recorded')
      }

      if (!signature.user_agent) {
        issues.push('No user agent recorded')
      }

      return {
        compliant: issues.length === 0,
        issues
      }
    } catch (error) {
      console.error('Error validating signature compliance:', error)
      return {
        compliant: false,
        issues: ['Error during compliance validation']
      }
    }
  }

  /**
   * Create legal document
   */
  static async createLegalDocument(
    type: LegalDocument['type'],
    title: string,
    content: string,
    jurisdiction: string,
    language: string = 'en'
  ): Promise<LegalDocument | null> {
    try {
      const version = this.generateVersion()

      const { data, error } = await supabaseAdmin
        .from('legal_documents')
        .insert([{
          type,
          title,
          content,
          version,
          effective_date: new Date().toISOString(),
          jurisdiction,
          language,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating legal document:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating legal document:', error)
      return null
    }
  }

  /**
   * Activate legal document
   */
  static async activateLegalDocument(documentId: string): Promise<boolean> {
    try {
      // Archive current active document of same type
      const { data: currentDoc } = await supabaseAdmin
        .from('legal_documents')
        .select('type')
        .eq('id', documentId)
        .single()

      if (currentDoc) {
        await supabaseAdmin
          .from('legal_documents')
          .update({ status: 'archived' })
          .eq('type', currentDoc.type)
          .eq('status', 'active')
      }

      // Activate new document
      const { error } = await supabaseAdmin
        .from('legal_documents')
        .update({
          status: 'active',
          effective_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)

      return !error
    } catch (error) {
      console.error('Error activating legal document:', error)
      return false
    }
  }

  /**
   * Get active legal documents
   */
  static async getActiveLegalDocuments(jurisdiction?: string): Promise<LegalDocument[]> {
    try {
      let query = supabaseAdmin
        .from('legal_documents')
        .select('*')
        .eq('status', 'active')

      if (jurisdiction) {
        query = query.eq('jurisdiction', jurisdiction)
      }

      const { data, error } = await query.order('effective_date', { ascending: false })

      if (error) {
        console.error('Error fetching legal documents:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching legal documents:', error)
      return []
    }
  }

  /**
   * Check data retention requirements
   */
  static async checkDataRetention(): Promise<{
    expired_records: any[]
    action_required: boolean
  }> {
    try {
      const retentionPeriods = {
        audit_trails: 7 * 365, // 7 years
        consent_records: 7 * 365, // 7 years
        signatures: 10 * 365, // 10 years
        documents: 10 * 365 // 10 years
      }

      const expiredRecords = []

      // Check each table for expired records
      for (const [table, days] of Object.entries(retentionPeriods)) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        const { data } = await supabaseAdmin
          .from(table)
          .select('id, created_at')
          .lt('created_at', cutoffDate.toISOString())

        if (data && data.length > 0) {
          expiredRecords.push({
            table,
            count: data.length,
            records: data
          })
        }
      }

      return {
        expired_records: expiredRecords,
        action_required: expiredRecords.length > 0
      }
    } catch (error) {
      console.error('Error checking data retention:', error)
      return {
        expired_records: [],
        action_required: false
      }
    }
  }

  /**
   * Helper methods
   */
  private static generateVersion(): string {
    const now = new Date()
    return `v${now.getFullYear()}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`
  }

  /**
   * Initialize default legal documents
   */
  static async initializeDefaultLegalDocuments(): Promise<void> {
    const documents = [
      {
        type: 'terms_of_service' as const,
        title: 'Terms of Service',
        content: 'Default Terms of Service content...',
        jurisdiction: 'US',
        language: 'en'
      },
      {
        type: 'privacy_policy' as const,
        title: 'Privacy Policy',
        content: 'Default Privacy Policy content...',
        jurisdiction: 'US',
        language: 'en'
      },
      {
        type: 'consent_form' as const,
        title: 'Electronic Signature Consent',
        content: 'Default Electronic Signature Consent content...',
        jurisdiction: 'US',
        language: 'en'
      }
    ]

    for (const doc of documents) {
      await this.createLegalDocument(
        doc.type,
        doc.title,
        doc.content,
        doc.jurisdiction,
        doc.language
      )
    }
  }
}

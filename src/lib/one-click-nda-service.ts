// One-Click NDA Service
// Streamlined NDA acceptance and management system

export interface NDATemplate {
  id: string
  name: string
  title: string
  content: string
  variables: string[] // Placeholders like {{company_name}}, {{document_title}}
  category: 'basic' | 'mutual' | 'employee' | 'vendor' | 'custom'
  isDefault: boolean
  requiresSignature: boolean
  legallyBinding: boolean
  createdAt: string
  updatedAt: string
}

export interface NDAAcceptance {
  id: string
  linkId: string
  documentId: string
  acceptorEmail: string
  acceptorName?: string
  ndaTemplateId: string
  ndaContent: string
  acceptedAt: string
  ipAddress: string
  userAgent: string
  signature?: string
  fingerprint: string
  legallyBinding: boolean
  witnessEmail?: string
  metadata: Record<string, any>
}

export interface OneClickNDAConfig {
  enabled: boolean
  templateId: string
  requireSignature: boolean
  requireFullName: boolean
  requireWitness: boolean
  autoAcceptDomains: string[]
  customVariables: Record<string, string>
  acceptanceMessage: string
  redirectAfterAcceptance?: string
  emailNotifications: {
    notifyOwner: boolean
    notifyAcceptor: boolean
    notifyWitness: boolean
  }
}

export class OneClickNDAService {
  /**
   * Get default NDA templates
   */
  static getDefaultTemplates(): NDATemplate[] {
    return [
      {
        id: 'basic-nda',
        name: 'Basic NDA',
        title: 'Non-Disclosure Agreement',
        content: `
**NON-DISCLOSURE AGREEMENT**

This Non-Disclosure Agreement ("Agreement") is entered into on {{date}} between {{company_name}} ("Disclosing Party") and the undersigned ("Receiving Party").

**1. CONFIDENTIAL INFORMATION**
The Receiving Party acknowledges that they may have access to confidential information related to {{document_title}} and other proprietary materials.

**2. OBLIGATIONS**
The Receiving Party agrees to:
- Keep all information strictly confidential
- Not disclose information to third parties
- Use information solely for the intended purpose
- Return or destroy information upon request

**3. TERM**
This agreement remains in effect for 2 years from the date of acceptance.

**4. LEGAL BINDING**
By clicking "I Accept" below, the Receiving Party agrees to be legally bound by this agreement.

**Accepted by:** {{acceptor_name}}
**Email:** {{acceptor_email}}
**Date:** {{acceptance_date}}
**IP Address:** {{ip_address}}
        `,
        variables: ['company_name', 'document_title', 'acceptor_name', 'acceptor_email', 'acceptance_date', 'ip_address', 'date'],
        category: 'basic',
        isDefault: true,
        requiresSignature: false,
        legallyBinding: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'mutual-nda',
        name: 'Mutual NDA',
        title: 'Mutual Non-Disclosure Agreement',
        content: `
**MUTUAL NON-DISCLOSURE AGREEMENT**

This Mutual Non-Disclosure Agreement is entered into between {{company_name}} and the undersigned party for the purpose of evaluating {{document_title}}.

**MUTUAL OBLIGATIONS:**
Both parties agree to maintain confidentiality of all shared information and use it solely for evaluation purposes.

**Accepted by:** {{acceptor_name}}
**Date:** {{acceptance_date}}
        `,
        variables: ['company_name', 'document_title', 'acceptor_name', 'acceptance_date'],
        category: 'mutual',
        isDefault: true,
        requiresSignature: true,
        legallyBinding: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'simple-confidentiality',
        name: 'Simple Confidentiality',
        title: 'Confidentiality Agreement',
        content: `
**CONFIDENTIALITY AGREEMENT**

By accessing {{document_title}}, I agree to keep all information confidential and not share it with unauthorized parties.

**Accepted by:** {{acceptor_email}}
**Date:** {{acceptance_date}}
        `,
        variables: ['document_title', 'acceptor_email', 'acceptance_date'],
        category: 'basic',
        isDefault: true,
        requiresSignature: false,
        legallyBinding: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  /**
   * Process NDA template with variables
   */
  static processNDATemplate(
    template: NDATemplate,
    variables: Record<string, string>,
    acceptorInfo: {
      email: string
      name?: string
      ipAddress: string
    }
  ): string {
    let content = template.content

    // Default variables
    const defaultVars = {
      date: new Date().toLocaleDateString(),
      acceptance_date: new Date().toLocaleDateString(),
      acceptor_email: acceptorInfo.email,
      acceptor_name: acceptorInfo.name || acceptorInfo.email,
      ip_address: acceptorInfo.ipAddress,
      timestamp: new Date().toISOString()
    }

    // Merge with custom variables
    const allVariables = { ...defaultVars, ...variables }

    // Replace all variables
    Object.entries(allVariables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      content = content.replace(regex, value)
    })

    return content
  }

  /**
   * Generate one-click NDA acceptance URL
   */
  static generateOneClickURL(
    linkId: string,
    templateId: string,
    prefilledData?: {
      email?: string
      name?: string
      returnUrl?: string
    }
  ): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const params = new URLSearchParams({
      template: templateId,
      ...(prefilledData?.email && { email: prefilledData.email }),
      ...(prefilledData?.name && { name: prefilledData.name }),
      ...(prefilledData?.returnUrl && { return: prefilledData.returnUrl })
    })

    return `${baseUrl}/nda/${linkId}?${params.toString()}`
  }

  /**
   * Validate NDA acceptance
   */
  static validateAcceptance(acceptance: Partial<NDAAcceptance>): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!acceptance.acceptorEmail) {
      errors.push('Email is required')
    }

    if (!acceptance.ndaContent) {
      errors.push('NDA content is required')
    }

    if (!acceptance.ipAddress) {
      errors.push('IP address is required for legal binding')
    }

    if (!acceptance.userAgent) {
      errors.push('User agent is required for legal binding')
    }

    // Email validation
    if (acceptance.acceptorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acceptance.acceptorEmail)) {
      errors.push('Invalid email format')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Check if domain is auto-approved
   */
  static isAutoApprovedDomain(email: string, autoApprovedDomains: string[]): boolean {
    if (!autoApprovedDomains.length) return false

    const domain = email.split('@')[1]?.toLowerCase()
    return autoApprovedDomains.some(approvedDomain => 
      domain === approvedDomain.toLowerCase() ||
      domain.endsWith('.' + approvedDomain.toLowerCase())
    )
  }

  /**
   * Generate digital signature
   */
  static generateDigitalSignature(
    acceptorInfo: {
      email: string
      name?: string
      ipAddress: string
      userAgent: string
    },
    ndaContent: string
  ): string {
    const signatureData = {
      acceptor: acceptorInfo.email,
      name: acceptorInfo.name,
      content_hash: this.hashContent(ndaContent),
      timestamp: new Date().toISOString(),
      ip: acceptorInfo.ipAddress,
      user_agent: acceptorInfo.userAgent
    }

    // In production, this would use proper cryptographic signing
    return btoa(JSON.stringify(signatureData))
  }

  /**
   * Hash content for signature verification
   */
  private static hashContent(content: string): string {
    // Simple hash for demo - in production use proper cryptographic hash
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  /**
   * Verify digital signature
   */
  static verifyDigitalSignature(
    signature: string,
    expectedContent: string,
    expectedAcceptor: string
  ): boolean {
    try {
      const signatureData = JSON.parse(atob(signature))
      const contentHash = this.hashContent(expectedContent)
      
      return (
        signatureData.acceptor === expectedAcceptor &&
        signatureData.content_hash === contentHash
      )
    } catch {
      return false
    }
  }

  /**
   * Generate NDA acceptance certificate
   */
  static generateAcceptanceCertificate(acceptance: NDAAcceptance): string {
    return `
**NDA ACCEPTANCE CERTIFICATE**

Certificate ID: ${acceptance.id}
Document: ${acceptance.documentId}
Acceptor: ${acceptance.acceptorName || acceptance.acceptorEmail}
Email: ${acceptance.acceptorEmail}
Accepted: ${new Date(acceptance.acceptedAt).toLocaleString()}
IP Address: ${acceptance.ipAddress}
Legally Binding: ${acceptance.legallyBinding ? 'Yes' : 'No'}

${acceptance.signature ? `Digital Signature: ${acceptance.signature}` : ''}

This certificate serves as proof of NDA acceptance and is legally binding.
    `.trim()
  }

  /**
   * Send NDA acceptance notifications
   */
  static async sendAcceptanceNotifications(
    acceptance: NDAAcceptance,
    config: OneClickNDAConfig,
    documentTitle: string,
    ownerEmail: string
  ): Promise<void> {
    const notifications = []

    // Notify document owner
    if (config.emailNotifications.notifyOwner) {
      notifications.push(
        fetch('/api/send/nda/notify-owner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail,
            acceptorEmail: acceptance.acceptorEmail,
            acceptorName: acceptance.acceptorName,
            documentTitle,
            acceptedAt: acceptance.acceptedAt
          })
        })
      )
    }

    // Notify acceptor
    if (config.emailNotifications.notifyAcceptor) {
      notifications.push(
        fetch('/api/send/nda/notify-acceptor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acceptorEmail: acceptance.acceptorEmail,
            acceptorName: acceptance.acceptorName,
            documentTitle,
            certificate: this.generateAcceptanceCertificate(acceptance)
          })
        })
      )
    }

    // Send all notifications
    await Promise.allSettled(notifications)
  }

  /**
   * Get NDA acceptance statistics
   */
  static async getNDAStats(linkId: string): Promise<{
    totalAcceptances: number
    uniqueAcceptors: number
    acceptanceRate: number
    recentAcceptances: NDAAcceptance[]
  }> {
    // This would query the database in a real implementation
    return {
      totalAcceptances: 0,
      uniqueAcceptors: 0,
      acceptanceRate: 0,
      recentAcceptances: []
    }
  }

  /**
   * Export NDA acceptances for legal compliance
   */
  static async exportAcceptances(
    linkId: string,
    format: 'csv' | 'pdf' | 'json' = 'csv'
  ): Promise<string> {
    // This would generate the export in the specified format
    return `NDA acceptances export for link ${linkId} in ${format} format`
  }
}

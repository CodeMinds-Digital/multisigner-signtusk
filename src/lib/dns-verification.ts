import dns from 'dns'
import { promisify } from 'util'

// Promisify DNS functions
const resolveTxt = promisify(dns.resolveTxt)
const resolveCname = promisify(dns.resolveCname)
const resolveA = promisify(dns.resolveA)

export interface DNSVerificationResult {
  success: boolean
  error?: string
  records?: {
    txt?: string[][]
    cname?: string[]
    a?: string[]
  }
}

export interface DomainVerificationConfig {
  domain: string
  verificationToken: string
  expectedCname?: string
  expectedA?: string
}

/**
 * Verify domain ownership using TXT record
 */
export async function verifyDomainOwnership(
  domain: string,
  verificationToken: string
): Promise<DNSVerificationResult> {
  try {
    // Check for TXT record at _signtusk-verification.domain.com
    const verificationDomain = `_signtusk-verification.${domain}`
    
    const txtRecords = await resolveTxt(verificationDomain)
    
    // Look for our verification token in the TXT records
    const hasValidToken = txtRecords.some(record => 
      record.join('').includes(`signtusk-verification=${verificationToken}`)
    )

    if (hasValidToken) {
      return {
        success: true,
        records: { txt: txtRecords }
      }
    } else {
      return {
        success: false,
        error: `Verification token not found in TXT record for ${verificationDomain}`,
        records: { txt: txtRecords }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: `DNS lookup failed: ${error.message}`
    }
  }
}

/**
 * Verify CNAME record points to our service
 */
export async function verifyCnameRecord(
  domain: string,
  expectedTarget: string = 'signtusk.vercel.app'
): Promise<DNSVerificationResult> {
  try {
    const cnameRecords = await resolveCname(domain)
    
    const hasValidCname = cnameRecords.some(record => 
      record.toLowerCase() === expectedTarget.toLowerCase()
    )

    if (hasValidCname) {
      return {
        success: true,
        records: { cname: cnameRecords }
      }
    } else {
      return {
        success: false,
        error: `CNAME record does not point to ${expectedTarget}. Found: ${cnameRecords.join(', ')}`,
        records: { cname: cnameRecords }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: `CNAME lookup failed: ${error.message}`
    }
  }
}

/**
 * Verify A record points to our IP addresses
 */
export async function verifyARecord(
  domain: string,
  expectedIPs: string[] = ['76.76.19.61', '76.223.126.88'] // Vercel IPs
): Promise<DNSVerificationResult> {
  try {
    const aRecords = await resolveA(domain)
    
    const hasValidA = aRecords.some(ip => expectedIPs.includes(ip))

    if (hasValidA) {
      return {
        success: true,
        records: { a: aRecords }
      }
    } else {
      return {
        success: false,
        error: `A record does not point to expected IPs. Expected: ${expectedIPs.join(', ')}, Found: ${aRecords.join(', ')}`,
        records: { a: aRecords }
      }
    }
  } catch (error: any) {
    return {
      success: false,
      error: `A record lookup failed: ${error.message}`
    }
  }
}

/**
 * Comprehensive domain verification
 */
export async function verifyDomainConfiguration(
  config: DomainVerificationConfig
): Promise<{
  ownershipVerified: boolean
  dnsConfigured: boolean
  details: {
    ownership: DNSVerificationResult
    cname?: DNSVerificationResult
    aRecord?: DNSVerificationResult
  }
}> {
  const { domain, verificationToken, expectedCname, expectedA } = config

  // Step 1: Verify ownership via TXT record
  const ownershipResult = await verifyDomainOwnership(domain, verificationToken)

  // Step 2: Check DNS configuration
  let cnameResult: DNSVerificationResult | undefined
  let aRecordResult: DNSVerificationResult | undefined

  if (expectedCname) {
    cnameResult = await verifyCnameRecord(domain, expectedCname)
  }

  if (expectedA) {
    aRecordResult = await verifyARecord(domain, [expectedA])
  } else {
    // Default Vercel IPs
    aRecordResult = await verifyARecord(domain)
  }

  const dnsConfigured = cnameResult?.success || aRecordResult?.success || false

  return {
    ownershipVerified: ownershipResult.success,
    dnsConfigured,
    details: {
      ownership: ownershipResult,
      cname: cnameResult,
      aRecord: aRecordResult
    }
  }
}

/**
 * Get DNS setup instructions for a domain
 */
export function getDNSInstructions(domain: string, verificationToken: string) {
  return {
    ownership: {
      type: 'TXT',
      name: `_signtusk-verification.${domain}`,
      value: `signtusk-verification=${verificationToken}`,
      description: 'Add this TXT record to verify domain ownership'
    },
    routing: [
      {
        type: 'CNAME',
        name: domain,
        value: 'signtusk.vercel.app',
        description: 'Point your domain to our service (recommended)'
      },
      {
        type: 'A',
        name: domain,
        value: '76.76.19.61',
        description: 'Alternative: Point to our IP address'
      }
    ]
  }
}

/**
 * Validate domain format
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
  return domainRegex.test(domain)
}

/**
 * Extract apex domain from subdomain
 */
export function getApexDomain(domain: string): string {
  const parts = domain.split('.')
  if (parts.length > 2) {
    return parts.slice(-2).join('.')
  }
  return domain
}

/**
 * Check if domain is a subdomain
 */
export function isSubdomain(domain: string): boolean {
  const parts = domain.split('.')
  return parts.length > 2
}

/**
 * Get subdomain part
 */
export function getSubdomain(domain: string): string | null {
  const parts = domain.split('.')
  if (parts.length > 2) {
    return parts.slice(0, -2).join('.')
  }
  return null
}

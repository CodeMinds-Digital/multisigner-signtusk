/**
 * Access Control Enforcer
 * Centralized service for enforcing access controls on shared links
 * Supports email, domain, IP, and country-based restrictions with wildcard support
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

export interface AccessControlConfig {
  allowedEmails?: string[]
  blockedEmails?: string[]
  allowedDomains?: string[]
  blockedDomains?: string[]
  allowedIPs?: string[]
  blockedIPs?: string[]
  allowedCountries?: string[]
  blockedCountries?: string[]
}

export interface AccessCheckResult {
  allowed: boolean
  reason?: string
  errorCode?: string
  details?: any
}

export class AccessControlEnforcer {
  /**
   * Check if access should be granted based on all configured controls
   */
  static async checkAccess(
    linkId: number,
    email?: string,
    ipAddress?: string,
    country?: string
  ): Promise<AccessCheckResult> {
    try {
      // Fetch access controls for the link
      const { data: controls, error } = await supabaseAdmin
        .from('send_link_access_controls')
        .select('*')
        .eq('link_id', linkId)
        .single()

      if (error || !controls) {
        // No controls configured - allow access
        return { allowed: true }
      }

      // Check email controls
      if (email) {
        const emailCheck = this.checkEmail(email, controls)
        if (!emailCheck.allowed) {
          await this.logDenial(linkId, 'email', email, emailCheck.reason)
          return emailCheck
        }
      }

      // Check domain controls (extracted from email)
      if (email) {
        const domain = this.extractDomain(email)
        const domainCheck = this.checkDomain(domain, controls)
        if (!domainCheck.allowed) {
          await this.logDenial(linkId, 'domain', domain, domainCheck.reason)
          return domainCheck
        }
      }

      // Check IP controls
      if (ipAddress) {
        const ipCheck = this.checkIP(ipAddress, controls)
        if (!ipCheck.allowed) {
          await this.logDenial(linkId, 'ip', ipAddress, ipCheck.reason)
          return ipCheck
        }
      }

      // Check country controls
      if (country) {
        const countryCheck = this.checkCountry(country, controls)
        if (!countryCheck.allowed) {
          await this.logDenial(linkId, 'country', country, countryCheck.reason)
          return countryCheck
        }
      }

      // All checks passed
      return { allowed: true }
    } catch (error) {
      console.error('Access control check error:', error)
      // Fail open - allow access if there's an error checking controls
      return { allowed: true }
    }
  }

  /**
   * Check email-based access controls
   */
  private static checkEmail(email: string, controls: any): AccessCheckResult {
    const normalizedEmail = email.toLowerCase().trim()

    // Check blocked emails first (blocklist takes precedence)
    if (controls.blocked_emails && Array.isArray(controls.blocked_emails)) {
      for (const blockedEmail of controls.blocked_emails) {
        if (this.matchesPattern(normalizedEmail, blockedEmail.toLowerCase())) {
          return {
            allowed: false,
            reason: 'Email address is blocked',
            errorCode: 'BLOCKED_EMAIL'
          }
        }
      }
    }

    // Check allowed emails (if configured, must match)
    if (controls.allowed_emails && Array.isArray(controls.allowed_emails) && controls.allowed_emails.length > 0) {
      let matched = false
      for (const allowedEmail of controls.allowed_emails) {
        if (this.matchesPattern(normalizedEmail, allowedEmail.toLowerCase())) {
          matched = true
          break
        }
      }
      if (!matched) {
        return {
          allowed: false,
          reason: 'Email address is not in the allowed list',
          errorCode: 'EMAIL_NOT_ALLOWED'
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check domain-based access controls
   */
  private static checkDomain(domain: string, controls: any): AccessCheckResult {
    const normalizedDomain = domain.toLowerCase().trim()

    // Check blocked domains first
    if (controls.blocked_domains && Array.isArray(controls.blocked_domains)) {
      for (const blockedDomain of controls.blocked_domains) {
        if (this.matchesPattern(normalizedDomain, blockedDomain.toLowerCase())) {
          return {
            allowed: false,
            reason: 'Domain is blocked',
            errorCode: 'BLOCKED_DOMAIN'
          }
        }
      }
    }

    // Check allowed domains
    if (controls.allowed_domains && Array.isArray(controls.allowed_domains) && controls.allowed_domains.length > 0) {
      let matched = false
      for (const allowedDomain of controls.allowed_domains) {
        if (this.matchesPattern(normalizedDomain, allowedDomain.toLowerCase())) {
          matched = true
          break
        }
      }
      if (!matched) {
        return {
          allowed: false,
          reason: 'Domain is not in the allowed list',
          errorCode: 'DOMAIN_NOT_ALLOWED'
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check IP-based access controls
   */
  private static checkIP(ipAddress: string, controls: any): AccessCheckResult {
    const normalizedIP = ipAddress.trim()

    // Check blocked IPs first
    if (controls.blocked_ips && Array.isArray(controls.blocked_ips)) {
      for (const blockedIP of controls.blocked_ips) {
        if (this.matchesIPPattern(normalizedIP, blockedIP)) {
          return {
            allowed: false,
            reason: 'IP address is blocked',
            errorCode: 'BLOCKED_IP'
          }
        }
      }
    }

    // Check allowed IPs
    if (controls.allowed_ips && Array.isArray(controls.allowed_ips) && controls.allowed_ips.length > 0) {
      let matched = false
      for (const allowedIP of controls.allowed_ips) {
        if (this.matchesIPPattern(normalizedIP, allowedIP)) {
          matched = true
          break
        }
      }
      if (!matched) {
        return {
          allowed: false,
          reason: 'IP address is not in the allowed list',
          errorCode: 'IP_NOT_ALLOWED'
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Check country-based access controls
   */
  private static checkCountry(country: string, controls: any): AccessCheckResult {
    const normalizedCountry = country.toUpperCase().trim()

    // Check blocked countries first
    if (controls.blocked_countries && Array.isArray(controls.blocked_countries)) {
      if (controls.blocked_countries.map((c: string) => c.toUpperCase()).includes(normalizedCountry)) {
        return {
          allowed: false,
          reason: 'Access from this country is blocked',
          errorCode: 'BLOCKED_COUNTRY'
        }
      }
    }

    // Check allowed countries
    if (controls.allowed_countries && Array.isArray(controls.allowed_countries) && controls.allowed_countries.length > 0) {
      if (!controls.allowed_countries.map((c: string) => c.toUpperCase()).includes(normalizedCountry)) {
        return {
          allowed: false,
          reason: 'Access from this country is not allowed',
          errorCode: 'COUNTRY_NOT_ALLOWED'
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Match a value against a pattern (supports wildcards)
   */
  private static matchesPattern(value: string, pattern: string): boolean {
    // Exact match
    if (value === pattern) {
      return true
    }

    // Wildcard support: * matches any characters
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*/g, '.*') // Replace * with .*
      const regex = new RegExp(`^${regexPattern}$`, 'i')
      return regex.test(value)
    }

    return false
  }

  /**
   * Match IP address against pattern (supports CIDR and wildcards)
   */
  private static matchesIPPattern(ip: string, pattern: string): boolean {
    // Exact match
    if (ip === pattern) {
      return true
    }

    // Wildcard support: 192.168.*.* or 192.168.1.*
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\./g, '\\.') // Escape dots
        .replace(/\*/g, '\\d+') // Replace * with \d+
      const regex = new RegExp(`^${regexPattern}$`)
      return regex.test(ip)
    }

    // CIDR notation support (basic implementation)
    if (pattern.includes('/')) {
      return this.matchesCIDR(ip, pattern)
    }

    return false
  }

  /**
   * Check if IP matches CIDR notation
   */
  private static matchesCIDR(ip: string, cidr: string): boolean {
    try {
      const [range, bits] = cidr.split('/')
      const mask = ~(2 ** (32 - parseInt(bits)) - 1)
      
      const ipNum = this.ipToNumber(ip)
      const rangeNum = this.ipToNumber(range)
      
      return (ipNum & mask) === (rangeNum & mask)
    } catch (error) {
      return false
    }
  }

  /**
   * Convert IP address to number
   */
  private static ipToNumber(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0
  }

  /**
   * Extract domain from email address
   */
  private static extractDomain(email: string): string {
    const parts = email.split('@')
    return parts.length === 2 ? parts[1] : ''
  }

  /**
   * Log access denial for audit purposes
   */
  private static async logDenial(
    linkId: number,
    type: string,
    value: string,
    reason?: string
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('send_access_denials')
        .insert({
          link_id: linkId,
          denial_type: type,
          denied_value: value,
          reason: reason || 'Access denied',
          denied_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log access denial:', error)
      // Don't throw - logging failure shouldn't block the denial
    }
  }
}


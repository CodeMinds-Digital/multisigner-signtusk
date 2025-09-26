import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import forge from 'node-forge'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface DigitalCertificate {
  id: string
  user_id: string
  certificate_type: 'self_signed' | 'ca_issued' | 'qualified'
  certificate_pem: string
  private_key_pem: string
  public_key_pem: string
  subject: CertificateSubject
  issuer: CertificateIssuer
  serial_number: string
  valid_from: string
  valid_to: string
  fingerprint: string
  status: 'active' | 'expired' | 'revoked' | 'suspended'
  created_at: string
  updated_at: string
}

export interface CertificateSubject {
  common_name: string
  organization?: string
  organizational_unit?: string
  country: string
  state?: string
  locality?: string
  email: string
}

export interface CertificateIssuer {
  common_name: string
  organization: string
  country: string
}

export interface DigitalSignature {
  id: string
  document_id: string
  signer_id: string
  certificate_id: string
  signature_data: string
  signature_algorithm: string
  timestamp: string
  tsa_timestamp?: string
  signature_hash: string
  verification_status: 'valid' | 'invalid' | 'unknown'
  created_at: string
}

export class DigitalCertificateService {
  /**
   * Generate a self-signed certificate for a user
   */
  static async generateSelfSignedCertificate(
    userId: string,
    subject: CertificateSubject,
    validityDays: number = 365
  ): Promise<DigitalCertificate | null> {
    try {
      // Generate key pair
      const keys = forge.pki.rsa.generateKeyPair(2048)
      const privateKey = keys.privateKey
      const publicKey = keys.publicKey

      // Create certificate
      const cert = forge.pki.createCertificate()
      cert.publicKey = publicKey
      cert.serialNumber = this.generateSerialNumber()
      cert.validity.notBefore = new Date()
      cert.validity.notAfter = new Date()
      cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays)

      // Set subject
      const subjectAttrs = [
        { name: 'commonName', value: subject.common_name },
        { name: 'countryName', value: subject.country },
        { name: 'emailAddress', value: subject.email }
      ]

      if (subject.organization) {
        subjectAttrs.push({ name: 'organizationName', value: subject.organization })
      }
      if (subject.organizational_unit) {
        subjectAttrs.push({ name: 'organizationalUnitName', value: subject.organizational_unit })
      }
      if (subject.state) {
        subjectAttrs.push({ name: 'stateOrProvinceName', value: subject.state })
      }
      if (subject.locality) {
        subjectAttrs.push({ name: 'localityName', value: subject.locality })
      }

      cert.setSubject(subjectAttrs)

      // Set issuer (same as subject for self-signed)
      cert.setIssuer(subjectAttrs)

      // Add extensions
      cert.setExtensions([
        {
          name: 'basicConstraints',
          cA: false
        },
        {
          name: 'keyUsage',
          keyCertSign: false,
          digitalSignature: true,
          nonRepudiation: true,
          keyEncipherment: false,
          dataEncipherment: false
        },
        {
          name: 'extKeyUsage',
          serverAuth: false,
          clientAuth: true,
          codeSigning: false,
          emailProtection: true,
          timeStamping: false
        },
        {
          name: 'subjectAltName',
          altNames: [{
            type: 1, // email
            value: subject.email
          }]
        }
      ])

      // Self-sign certificate
      cert.sign(privateKey, forge.md.sha256.create())

      // Convert to PEM format
      const certificatePem = forge.pki.certificateToPem(cert)
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey)
      const publicKeyPem = forge.pki.publicKeyToPem(publicKey)

      // Calculate fingerprint
      const fingerprint = this.calculateFingerprint(certificatePem)

      // Store in database
      const { data, error } = await supabase
        .from('digital_certificates')
        .insert([{
          user_id: userId,
          certificate_type: 'self_signed',
          certificate_pem: certificatePem,
          private_key_pem: privateKeyPem,
          public_key_pem: publicKeyPem,
          subject,
          issuer: {
            common_name: subject.common_name,
            organization: subject.organization || 'Self-Signed',
            country: subject.country
          },
          serial_number: cert.serialNumber,
          valid_from: cert.validity.notBefore.toISOString(),
          valid_to: cert.validity.notAfter.toISOString(),
          fingerprint,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error storing certificate:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error generating certificate:', error)
      return null
    }
  }

  /**
   * Create digital signature for a document
   */
  static async createDigitalSignature(
    documentId: string,
    signerId: string,
    certificateId: string,
    documentHash: string
  ): Promise<DigitalSignature | null> {
    try {
      // Get certificate
      const { data: certificate } = await supabase
        .from('digital_certificates')
        .select('*')
        .eq('id', certificateId)
        .eq('status', 'active')
        .single()

      if (!certificate) {
        throw new Error('Certificate not found or inactive')
      }

      // Parse private key
      const privateKey = forge.pki.privateKeyFromPem(certificate.private_key_pem)

      // Create signature
      const md = forge.md.sha256.create()
      md.update(documentHash, 'utf8')
      const signature = privateKey.sign(md)
      const signatureBase64 = forge.util.encode64(signature)

      // Get timestamp from TSA (Time Stamping Authority) if available
      const tsaTimestamp = await this.getTSATimestamp(documentHash)

      // Store signature
      const { data, error } = await supabase
        .from('digital_signatures')
        .insert([{
          document_id: documentId,
          signer_id: signerId,
          certificate_id: certificateId,
          signature_data: signatureBase64,
          signature_algorithm: 'SHA256withRSA',
          timestamp: new Date().toISOString(),
          tsa_timestamp: tsaTimestamp,
          signature_hash: documentHash,
          verification_status: 'valid',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error storing signature:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating digital signature:', error)
      return null
    }
  }

  /**
   * Verify digital signature
   */
  static async verifyDigitalSignature(signatureId: string): Promise<boolean> {
    try {
      // Get signature and certificate
      const { data: signature } = await supabase
        .from('digital_signatures')
        .select(`
          *,
          digital_certificates (*)
        `)
        .eq('id', signatureId)
        .single()

      if (!signature) {
        return false
      }

      const certificate = signature.digital_certificates

      // Parse certificate and signature
      const cert = forge.pki.certificateFromPem(certificate.certificate_pem)
      const publicKey = cert.publicKey
      const signatureBytes = forge.util.decode64(signature.signature_data)

      // Verify signature
      const md = forge.md.sha256.create()
      md.update(signature.signature_hash, 'utf8')
      const verified = (publicKey as any).verify(md.digest().bytes(), signatureBytes)

      // Check certificate validity
      const now = new Date()
      const validFrom = new Date(certificate.valid_from)
      const validTo = new Date(certificate.valid_to)
      const certificateValid = now >= validFrom && now <= validTo

      // Update verification status
      const verificationStatus = verified && certificateValid ? 'valid' : 'invalid'

      await supabase
        .from('digital_signatures')
        .update({ verification_status: verificationStatus })
        .eq('id', signatureId)

      return verified && certificateValid
    } catch (error) {
      console.error('Error verifying signature:', error)
      return false
    }
  }

  /**
   * Get user certificates
   */
  static async getUserCertificates(userId: string): Promise<DigitalCertificate[]> {
    try {
      const { data, error } = await supabase
        .from('digital_certificates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching certificates:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching certificates:', error)
      return []
    }
  }

  /**
   * Revoke certificate
   */
  static async revokeCertificate(certificateId: string, reason: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('digital_certificates')
        .update({
          status: 'revoked',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificateId)

      if (error) {
        console.error('Error revoking certificate:', error)
        return false
      }

      // Log revocation
      await supabase
        .from('certificate_revocations')
        .insert([{
          certificate_id: certificateId,
          reason,
          revoked_at: new Date().toISOString()
        }])

      return true
    } catch (error) {
      console.error('Error revoking certificate:', error)
      return false
    }
  }

  /**
   * Generate certificate signing request (CSR)
   */
  static async generateCSR(
    userId: string,
    subject: CertificateSubject
  ): Promise<{ csr: string; privateKey: string } | null> {
    try {
      // Generate key pair
      const keys = forge.pki.rsa.generateKeyPair(2048)
      const privateKey = keys.privateKey

      // Create CSR
      const csr = forge.pki.createCertificationRequest()
      csr.publicKey = keys.publicKey

      // Set subject
      const subjectAttrs = [
        { name: 'commonName', value: subject.common_name },
        { name: 'countryName', value: subject.country },
        { name: 'emailAddress', value: subject.email }
      ]

      if (subject.organization) {
        subjectAttrs.push({ name: 'organizationName', value: subject.organization })
      }

      csr.setSubject(subjectAttrs)

      // Sign CSR
      csr.sign(privateKey, forge.md.sha256.create())

      // Convert to PEM
      const csrPem = forge.pki.certificationRequestToPem(csr)
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey)

      return {
        csr: csrPem,
        privateKey: privateKeyPem
      }
    } catch (error) {
      console.error('Error generating CSR:', error)
      return null
    }
  }

  /**
   * Import CA-issued certificate
   */
  static async importCACertificate(
    userId: string,
    certificatePem: string,
    privateKeyPem: string,
    _caCertificatePem?: string
  ): Promise<DigitalCertificate | null> {
    try {
      // Parse certificate
      const cert = forge.pki.certificateFromPem(certificatePem)
      const _privateKey = forge.pki.privateKeyFromPem(privateKeyPem)
      const publicKey = cert.publicKey

      // Extract subject and issuer
      const subject = this.extractSubjectFromCertificate(cert)
      const issuer = this.extractIssuerFromCertificate(cert)

      // Calculate fingerprint
      const fingerprint = this.calculateFingerprint(certificatePem)

      // Store in database
      const { data, error } = await supabase
        .from('digital_certificates')
        .insert([{
          user_id: userId,
          certificate_type: 'ca_issued',
          certificate_pem: certificatePem,
          private_key_pem: privateKeyPem,
          public_key_pem: forge.pki.publicKeyToPem(publicKey),
          subject,
          issuer,
          serial_number: cert.serialNumber,
          valid_from: cert.validity.notBefore.toISOString(),
          valid_to: cert.validity.notAfter.toISOString(),
          fingerprint,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) {
        console.error('Error importing certificate:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error importing certificate:', error)
      return null
    }
  }

  /**
   * Helper methods
   */
  private static generateSerialNumber(): string {
    return crypto.randomBytes(16).toString('hex')
  }

  private static calculateFingerprint(certificatePem: string): string {
    const cert = forge.pki.certificateFromPem(certificatePem)
    const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes()
    const md = forge.md.sha256.create()
    md.update(der)
    return md.digest().toHex().toUpperCase().match(/.{2}/g)?.join(':') || ''
  }

  private static extractSubjectFromCertificate(cert: forge.pki.Certificate): CertificateSubject {
    const subject = cert.subject.attributes
    return {
      common_name: this.getAttributeValue(subject, 'commonName') || '',
      organization: this.getAttributeValue(subject, 'organizationName'),
      organizational_unit: this.getAttributeValue(subject, 'organizationalUnitName'),
      country: this.getAttributeValue(subject, 'countryName') || '',
      state: this.getAttributeValue(subject, 'stateOrProvinceName'),
      locality: this.getAttributeValue(subject, 'localityName'),
      email: this.getAttributeValue(subject, 'emailAddress') || ''
    }
  }

  private static extractIssuerFromCertificate(cert: forge.pki.Certificate): CertificateIssuer {
    const issuer = cert.issuer.attributes
    return {
      common_name: this.getAttributeValue(issuer, 'commonName') || '',
      organization: this.getAttributeValue(issuer, 'organizationName') || '',
      country: this.getAttributeValue(issuer, 'countryName') || ''
    }
  }

  private static getAttributeValue(attributes: any[], name: string): string | undefined {
    const attr = attributes.find(a => a.name === name)
    return attr?.value
  }

  private static async getTSATimestamp(_documentHash: string): Promise<string | undefined> {
    try {
      // This would integrate with a Time Stamping Authority
      // For now, return undefined as TSA integration requires specific setup
      return undefined
    } catch (error) {
      console.error('Error getting TSA timestamp:', error)
      return undefined
    }
  }
}

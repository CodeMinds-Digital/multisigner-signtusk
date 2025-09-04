import { Signer } from '@/types/document-management'

/**
 * Utility functions for managing signature fields and signers
 */

export interface SignatureField {
  type: string
  name?: string
  role?: string
  page?: number
  fieldIndex?: number
  [key: string]: any
}

/**
 * Extract signature fields from document schemas
 * Handles both array-based schemas and flat schema arrays
 */
export function extractSignatureFields(schemas: any[]): SignatureField[] {
  const signatureFields: SignatureField[] = []

  if (!schemas || !Array.isArray(schemas)) {
    return signatureFields
  }

  // Handle flat array of schema objects (current database structure)
  if (schemas.length > 0 && schemas[0].id && schemas[0].type) {
    schemas.forEach((field, fieldIndex) => {
      if (field.type === 'signature' || field.type === 'initial') {
        signatureFields.push({
          ...field,
          page: field.position?.page || 1,
          fieldIndex
        })
      }
    })
  } else {
    // Handle nested array structure (page-based schemas)
    schemas.forEach((pageSchemas, pageIndex) => {
      if (Array.isArray(pageSchemas)) {
        pageSchemas.forEach((field, fieldIndex) => {
          if (field.type === 'signature' || field.type === 'initial') {
            signatureFields.push({
              ...field,
              page: pageIndex + 1,
              fieldIndex
            })
          }
        })
      }
    })
  }

  return signatureFields
}

/**
 * Generate signers from signature fields
 */
export function generateSignersFromFields(signatureFields: SignatureField[]): Signer[] {
  const signers: Signer[] = []

  signatureFields.forEach((field, index) => {
    signers.push({
      id: `signer-${Date.now()}-${index}`,
      order: index + 1,
      name: field.name || `Signer ${index + 1}`,
      email: '',
      role: field.role || 'Signer',
      is_required: true
    })
  })

  return signers
}

/**
 * Generate signers from document schemas
 */
export function generateSignersFromSchemas(schemas: any[]): Signer[] {
  console.log('🔍 generateSignersFromSchemas called with:', schemas?.length, 'schemas')

  const signatureFields = extractSignatureFields(schemas)
  console.log('🔍 Extracted signature fields:', signatureFields.length, signatureFields)

  // Group fields by unique signer ID
  const signerMap = new Map<string, SignatureField[]>()

  signatureFields.forEach((field, index) => {
    const signerId = field.properties?._originalConfig?.signerId ||
      field.properties?.signerId ||
      field.signerId ||
      `signer_${index + 1}` // Use field index instead of defaulting to signer_1

    console.log(`🔍 Field ${index}:`, {
      name: field.name,
      type: field.type,
      signerId: signerId,
      properties: field.properties
    })

    if (!signerMap.has(signerId)) {
      signerMap.set(signerId, [])
    }
    signerMap.get(signerId)!.push(field)
  })

  console.log('🔍 Signer map:', Array.from(signerMap.entries()))

  // Create signers based on unique signer IDs
  const signers: Signer[] = []
  let order = 1

  signerMap.forEach((fields, signerId) => {
    const firstField = fields[0]
    const signer = {
      id: `signer-${Date.now()}-${order}`,
      order: order,
      name: firstField.name || `Signer ${order}`,
      email: '',
      role: firstField.role || 'Signer',
      is_required: true
    }
    console.log(`🔍 Created signer ${order}:`, signer)
    signers.push(signer)
    order++
  })

  console.log('🔍 Final generated signers:', signers.length, signers)
  return signers
}

/**
 * Determine signature type based on signature fields count
 */
export function determineSignatureType(schemas: any[]): 'single' | 'multi' {
  const signatureFields = extractSignatureFields(schemas)
  return signatureFields.length > 1 ? 'multi' : 'single'
}

/**
 * Sync signers with signature fields
 * This ensures that the number of signers matches the number of signature fields
 */
export function syncSignersWithFields(
  currentSigners: Signer[],
  schemas: any[]
): Signer[] {
  const signatureFields = extractSignatureFields(schemas)

  // If no signature fields, return empty signers
  if (signatureFields.length === 0) {
    return []
  }

  // If signers count matches signature fields count, keep existing signers
  if (currentSigners.length === signatureFields.length) {
    return currentSigners
  }

  // If more signature fields than signers, add new signers
  if (signatureFields.length > currentSigners.length) {
    const newSigners = [...currentSigners]

    for (let i = currentSigners.length; i < signatureFields.length; i++) {
      const field = signatureFields[i]
      newSigners.push({
        id: `signer-${Date.now()}-${i}`,
        order: i + 1,
        name: field.name || `Signer ${i + 1}`,
        email: '',
        role: field.role || 'Signer',
        is_required: true
      })
    }

    return newSigners
  }

  // If fewer signature fields than signers, remove excess signers
  return currentSigners.slice(0, signatureFields.length)
}

/**
 * Validate that all signature fields have corresponding signers
 */
export function validateSignerFieldMapping(
  signers: Signer[],
  schemas: any[]
): {
  isValid: boolean
  missingSigners: number
  excessSigners: number
  signatureFieldsCount: number
  signersCount: number
} {
  const signatureFields = extractSignatureFields(schemas)

  return {
    isValid: signers.length === signatureFields.length,
    missingSigners: Math.max(0, signatureFields.length - signers.length),
    excessSigners: Math.max(0, signers.length - signatureFields.length),
    signatureFieldsCount: signatureFields.length,
    signersCount: signers.length
  }
}

/**
 * Get signature type display text
 */
export function getSignatureTypeDisplay(signers: Signer[], schemas?: any[]): string {
  let count = signers.length

  // If signers is empty but we have schemas, check signature fields
  if (count === 0 && schemas) {
    const signatureFields = extractSignatureFields(schemas)

    // Count unique signers based on signerId in field properties
    const uniqueSignerIds = new Set<string>()
    signatureFields.forEach(field => {
      const signerId = field.properties?._originalConfig?.signerId ||
        field.properties?.signerId ||
        field.signerId ||
        'signer_1' // default
      uniqueSignerIds.add(signerId)
    })

    count = uniqueSignerIds.size
  }

  if (count === 0) return 'No signatures'
  if (count === 1) return 'Single signature'
  return 'Multi signature'
}

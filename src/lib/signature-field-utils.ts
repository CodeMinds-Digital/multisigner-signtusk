// Define Signer interface locally
interface Signer {
  id: string
  name: string
  email: string
  order?: number
  role?: string
  is_required?: boolean
}

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

  signerMap.forEach((fields, _signerId) => {
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
 * Count total signature fields in schemas
 */
export function countSignatureFields(schemas: any[]): number {
  const signatureFields = extractSignatureFields(schemas)
  return signatureFields.length
}

/**
 * Analyze document template and determine signature type from schemas
 * This is the main function to use for determining signature type from PDFme template data
 */
export function analyzeDocumentSignatureType(templateData: any): {
  signatureType: 'single' | 'multi'
  signatureFieldsCount: number
  uniqueSignersCount: number
  analysis: string
} {
  console.log('🔍 Analyzing document signature type from template data:', templateData)

  let schemas: any[] = []

  // Extract schemas from different possible structures
  if (templateData?.schemas) {
    schemas = Array.isArray(templateData.schemas) ? templateData.schemas : []
  } else if (templateData?.template_data?.schemas) {
    schemas = Array.isArray(templateData.template_data.schemas) ? templateData.template_data.schemas : []
  } else if (Array.isArray(templateData)) {
    schemas = templateData
  }

  const signatureFields = extractSignatureFields(schemas)
  const signatureFieldsCount = signatureFields.length

  // Count unique signers based on field assignments
  const uniqueSignerIds = new Set<string>()
  signatureFields.forEach(field => {
    const signerId = field.properties?._originalConfig?.signerId ||
      field.properties?.signerId ||
      field.signerId ||
      field.assignedTo?.signerIds?.[0] ||
      'signer_1' // default
    uniqueSignerIds.add(signerId)
  })

  const uniqueSignersCount = uniqueSignerIds.size
  const signatureType = signatureFieldsCount > 1 ? 'multi' : 'single'

  let analysis = ''
  if (signatureFieldsCount === 0) {
    analysis = 'No signature fields found'
  } else if (signatureFieldsCount === 1) {
    analysis = 'Single signature field detected'
  } else {
    analysis = `${signatureFieldsCount} signature fields detected (${uniqueSignersCount} unique signers)`
  }

  console.log('🔍 Signature analysis result:', {
    signatureType,
    signatureFieldsCount,
    uniqueSignersCount,
    analysis
  })

  return {
    signatureType,
    signatureFieldsCount,
    uniqueSignersCount,
    analysis
  }
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
 * Validate document completion status based on schemas and signers
 * For template creation: only validates schemas and signature fields
 * For signature requests: validates signers and email requirements
 */
export function validateDocumentCompletion(
  schemas: any[],
  signers: Signer[],
  isTemplateMode: boolean = true
): {
  status: 'draft' | 'ready'
  completion_percentage: number
  isValid: boolean
  issues: string[]
  signatureFieldsCount: number
  validSignersCount: number
} {
  const issues: string[] = []

  // Check if schemas exist
  if (!schemas || !Array.isArray(schemas) || schemas.length === 0) {
    return {
      status: 'draft',
      completion_percentage: 0,
      isValid: false,
      issues: ['No schemas defined'],
      signatureFieldsCount: 0,
      validSignersCount: 0
    }
  }

  // Extract signature fields
  const signatureFields = extractSignatureFields(schemas)

  if (signatureFields.length === 0) {
    return {
      status: 'draft',
      completion_percentage: 0,
      isValid: false,
      issues: ['No signature fields defined'],
      signatureFieldsCount: 0,
      validSignersCount: 0
    }
  }

  // For template mode: only validate schemas and signature fields
  if (isTemplateMode) {
    // Template is ready if it has schemas and signature fields
    const completion = 100 // Templates with signature fields are complete

    return {
      status: 'ready',
      completion_percentage: completion,
      isValid: true,
      issues: [],
      signatureFieldsCount: signatureFields.length,
      validSignersCount: signatureFields.length // Count signature fields as potential signers
    }
  }

  // For signature request mode: validate signers and emails
  const validSigners = signers.filter(signer =>
    signer.name && signer.name.trim() !== '' &&
    signer.email && signer.email.trim() !== ''
  )

  // Validate signer-field mapping
  const validation = validateSignerFieldMapping(validSigners, schemas)

  if (validation.missingSigners > 0) {
    issues.push(`${validation.missingSigners} signature field(s) missing signer assignment`)
  }

  if (validation.excessSigners > 0) {
    issues.push(`${validation.excessSigners} excess signer(s) without signature fields`)
  }

  // Check if all signers have required information
  const invalidSigners = signers.filter(signer =>
    !signer.name || signer.name.trim() === '' ||
    !signer.email || signer.email.trim() === ''
  )

  if (invalidSigners.length > 0) {
    issues.push(`${invalidSigners.length} signer(s) missing name or email`)
  }

  // Calculate completion percentage for signature request mode
  let completion = 0
  if (schemas.length > 0) completion += 40 // Has schemas
  if (signatureFields.length > 0) completion += 30 // Has signature fields
  if (validSigners.length > 0) completion += 20 // Has valid signers
  if (validation.isValid && issues.length === 0) completion += 10 // Perfect mapping

  // Determine status (only 'draft' and 'ready' allowed by database constraint)
  let status: 'draft' | 'ready' = 'draft'
  if (completion >= 100 && issues.length === 0) {
    status = 'ready'
  }

  return {
    status,
    completion_percentage: completion,
    isValid: validation.isValid && issues.length === 0,
    issues,
    signatureFieldsCount: signatureFields.length,
    validSignersCount: validSigners.length
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

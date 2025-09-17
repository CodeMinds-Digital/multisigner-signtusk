import { supabaseAdmin } from './supabase-admin'

export interface AdvancedFieldConfig {
  id: string
  type: 'signature' | 'initials' | 'date' | 'text' | 'checkbox' | 'dropdown'
  label: string
  required: boolean
  position: {
    x: number
    y: number
    width: number
    height: number
    page?: number
  }
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    options?: string[] // For dropdown
  }
  defaultValue?: any
  signerEmail?: string
  signerOrder?: number
}

export interface FieldValue {
  fieldId: string
  type: string
  value: any
  signedAt: string
  signerEmail: string
  metadata?: {
    ipAddress?: string
    userAgent?: string
    timestamp?: string
  }
}

export class AdvancedSignatureFieldsService {
  /**
   * Validate field value based on field configuration
   */
  static validateFieldValue(field: AdvancedFieldConfig, value: any): {
    isValid: boolean
    error?: string
  } {
    // Required field validation
    if (field.required && (value === null || value === undefined || value === '')) {
      return { isValid: false, error: `${field.label} is required` }
    }

    // Skip validation for empty optional fields
    if (!field.required && (value === null || value === undefined || value === '')) {
      return { isValid: true }
    }

    // Type-specific validation
    switch (field.type) {
      case 'signature':
        return this.validateSignatureField(value)
      
      case 'initials':
        return this.validateInitialsField(value)
      
      case 'date':
        return this.validateDateField(value)
      
      case 'text':
        return this.validateTextField(field, value)
      
      case 'checkbox':
        return this.validateCheckboxField(value)
      
      case 'dropdown':
        return this.validateDropdownField(field, value)
      
      default:
        return { isValid: false, error: `Unknown field type: ${field.type}` }
    }
  }

  /**
   * Validate signature field
   */
  private static validateSignatureField(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'object' || !value) {
      return { isValid: false, error: 'Signature must be an object' }
    }

    if (!value.signature && !value.signatureDataUrl) {
      return { isValid: false, error: 'Signature data is required' }
    }

    // Validate signature data URL format
    if (value.signatureDataUrl && !value.signatureDataUrl.startsWith('data:image/')) {
      return { isValid: false, error: 'Invalid signature data format' }
    }

    return { isValid: true }
  }

  /**
   * Validate initials field
   */
  private static validateInitialsField(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'object' || !value) {
      return { isValid: false, error: 'Initials must be an object' }
    }

    if (!value.initials && !value.initialsDataUrl) {
      return { isValid: false, error: 'Initials data is required' }
    }

    // Validate initials data URL format
    if (value.initialsDataUrl && !value.initialsDataUrl.startsWith('data:image/')) {
      return { isValid: false, error: 'Invalid initials data format' }
    }

    return { isValid: true }
  }

  /**
   * Validate date field
   */
  private static validateDateField(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'string') {
      return { isValid: false, error: 'Date must be a string' }
    }

    // Validate date format (ISO 8601)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(value)) {
      return { isValid: false, error: 'Date must be in YYYY-MM-DD format' }
    }

    // Validate that it's a valid date
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date' }
    }

    return { isValid: true }
  }

  /**
   * Validate text field
   */
  private static validateTextField(field: AdvancedFieldConfig, value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'string') {
      return { isValid: false, error: 'Text field must be a string' }
    }

    // Length validation
    if (field.validation?.minLength && value.length < field.validation.minLength) {
      return { isValid: false, error: `${field.label} must be at least ${field.validation.minLength} characters` }
    }

    if (field.validation?.maxLength && value.length > field.validation.maxLength) {
      return { isValid: false, error: `${field.label} must be no more than ${field.validation.maxLength} characters` }
    }

    // Pattern validation
    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(value)) {
        return { isValid: false, error: `${field.label} format is invalid` }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate checkbox field
   */
  private static validateCheckboxField(value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'boolean') {
      return { isValid: false, error: 'Checkbox field must be a boolean' }
    }

    return { isValid: true }
  }

  /**
   * Validate dropdown field
   */
  private static validateDropdownField(field: AdvancedFieldConfig, value: any): { isValid: boolean; error?: string } {
    if (typeof value !== 'string') {
      return { isValid: false, error: 'Dropdown field must be a string' }
    }

    // Validate against allowed options
    if (field.validation?.options && !field.validation.options.includes(value)) {
      return { isValid: false, error: `${field.label} must be one of: ${field.validation.options.join(', ')}` }
    }

    return { isValid: true }
  }

  /**
   * Process and save field values for a signer
   */
  static async saveSignerFieldValues(
    requestId: string,
    signerEmail: string,
    fieldValues: FieldValue[],
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`💾 Saving ${fieldValues.length} field values for signer:`, signerEmail)

      // Get document fields configuration
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, error: 'Signing request not found' }
      }

      // Parse document schema to get field configurations
      let documentSchema: AdvancedFieldConfig[] = []
      try {
        if (signingRequest.document?.schema) {
          const schema = typeof signingRequest.document.schema === 'string'
            ? JSON.parse(signingRequest.document.schema)
            : signingRequest.document.schema

          documentSchema = Array.isArray(schema) ? schema.flat() : []
        }
      } catch (error) {
        console.error('❌ Error parsing document schema:', error)
        return { success: false, error: 'Invalid document schema' }
      }

      // Validate all field values
      const validationErrors: string[] = []
      for (const fieldValue of fieldValues) {
        const fieldConfig = documentSchema.find(f => f.id === fieldValue.fieldId)
        if (!fieldConfig) {
          validationErrors.push(`Field ${fieldValue.fieldId} not found in document schema`)
          continue
        }

        const validation = this.validateFieldValue(fieldConfig, fieldValue.value)
        if (!validation.isValid) {
          validationErrors.push(validation.error || `Invalid value for ${fieldConfig.label}`)
        }
      }

      if (validationErrors.length > 0) {
        return { success: false, error: validationErrors.join('; ') }
      }

      // Prepare field values for storage
      const enrichedFieldValues = fieldValues.map(fv => ({
        ...fv,
        signedAt: new Date().toISOString(),
        signerEmail,
        metadata: {
          ...fv.metadata,
          ...metadata,
          timestamp: new Date().toISOString()
        }
      }))

      // Update signer with field values
      const { error: updateError } = await supabaseAdmin
        .from('signing_request_signers')
        .update({
          field_values: JSON.stringify(enrichedFieldValues),
          status: 'signed',
          signer_status: 'signed',
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)

      if (updateError) {
        console.error('❌ Error updating signer field values:', updateError)
        return { success: false, error: 'Failed to save field values' }
      }

      console.log('✅ Field values saved successfully')
      return { success: true }
    } catch (error) {
      console.error('❌ Error saving signer field values:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get field values for a specific signer
   */
  static async getSignerFieldValues(requestId: string, signerEmail: string): Promise<{
    success: boolean
    fieldValues?: FieldValue[]
    error?: string
  }> {
    try {
      const { data: signer, error } = await supabaseAdmin
        .from('signing_request_signers')
        .select('field_values')
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)
        .single()

      if (error || !signer) {
        return { success: false, error: 'Signer not found' }
      }

      let fieldValues: FieldValue[] = []
      if (signer.field_values) {
        try {
          fieldValues = typeof signer.field_values === 'string'
            ? JSON.parse(signer.field_values)
            : signer.field_values
        } catch (parseError) {
          console.error('❌ Error parsing field values:', parseError)
          return { success: false, error: 'Invalid field values format' }
        }
      }

      return { success: true, fieldValues }
    } catch (error) {
      console.error('❌ Error getting signer field values:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Generate default values for auto-fill fields
   */
  static generateDefaultFieldValues(
    fields: AdvancedFieldConfig[],
    signerInfo: { name?: string; email: string }
  ): Partial<Record<string, any>> {
    const defaultValues: Record<string, any> = {}

    fields.forEach(field => {
      switch (field.type) {
        case 'date':
          if (field.defaultValue === 'today' || field.label.toLowerCase().includes('date')) {
            defaultValues[field.id] = new Date().toISOString().split('T')[0] // YYYY-MM-DD
          }
          break

        case 'text':
          if (field.label.toLowerCase().includes('name') && signerInfo.name) {
            defaultValues[field.id] = signerInfo.name
          } else if (field.label.toLowerCase().includes('email')) {
            defaultValues[field.id] = signerInfo.email
          } else if (field.defaultValue) {
            defaultValues[field.id] = field.defaultValue
          }
          break

        case 'checkbox':
          if (field.defaultValue !== undefined) {
            defaultValues[field.id] = field.defaultValue
          }
          break

        case 'dropdown':
          if (field.defaultValue && field.validation?.options?.includes(field.defaultValue)) {
            defaultValues[field.id] = field.defaultValue
          }
          break
      }
    })

    return defaultValues
  }
}

// Define Signer interface locally
interface Signer {
  id: string
  name: string
  email: string
}

/**
 * Custom PDFme plugin to add signer assignment functionality
 */
export class PDFmeSignerPlugin {
  private signers: Signer[] = []
  private onFieldUpdate?: (fieldName: string, signerId: string) => void

  constructor(signers: Signer[], onFieldUpdate?: (fieldName: string, signerId: string) => void) {
    this.signers = signers
    this.onFieldUpdate = onFieldUpdate
  }

  /**
   * Add signer assignment to PDFme field properties
   */
  addSignerPropertyToSchema(schema: any) {
    if (!schema.properties) {
      schema.properties = {}
    }

    // Add signer assignment property
    schema.properties.assignedSigner = {
      title: 'Assigned Signer',
      type: 'string',
      widget: 'select',
      props: {
        options: [
          { label: 'No Assignment', value: '' },
          ...this.signers.map((signer, index) => ({
            label: `Signer ${index + 1}: ${signer.name}`,
            value: signer.id
          }))
        ]
      },
      span: 12
    }

    return schema
  }

  /**
   * Create enhanced plugins with signer assignment - CORRECT APPROACH
   */
  createEnhancedPlugins(builtInPlugins: any) {
    console.log('🔌 PLUGIN STEP 1: Creating enhanced plugins with signers:', this.signers.length)
    console.log('🔌 PLUGIN STEP 2: Signers data:', this.signers)
    console.log('🔌 PLUGIN STEP 3: Built-in plugins received:', Object.keys(builtInPlugins))

    if (this.signers.length === 0) {
      console.log('❌ PLUGIN STEP 4: No signers available, returning original plugins')
      return builtInPlugins
    }

    console.log('✅ PLUGIN STEP 4: Signers available, creating enhanced plugins')

    // Create signer options for dropdown
    const signerOptions = [
      { label: 'Select Signer', value: '' },
      ...this.signers.map((signer, index) => ({
        label: `Signer ${index + 1}: ${signer.name}`,
        value: signer.id
      }))
    ]

    console.log('🎯 PLUGIN STEP 5: Created signer options:', signerOptions)

    // Clone the plugins to avoid modifying the original
    const enhancedPlugins = { ...builtInPlugins }

    // Create enhanced signature plugin with signer assignment
    if (enhancedPlugins.signature) {
      console.log('✅ PLUGIN STEP 6: Found signature plugin, creating enhanced version')
      const originalPlugin = enhancedPlugins.signature

      // Create a new signature plugin with signer assignment
      enhancedPlugins.signature = {
        // Keep all original plugin properties
        pdf: originalPlugin.pdf,
        ui: originalPlugin.ui,
        icon: originalPlugin.icon,

        // Create enhanced propPanel
        propPanel: {
          // Keep original defaultSchema
          defaultSchema: originalPlugin.propPanel.defaultSchema,

          // Create enhanced schema function
          schema: (args: any) => {
            console.log('🎯 PLUGIN STEP 7: Enhanced signature schema function called')

            // Get original schema
            const originalSchema = typeof originalPlugin.propPanel.schema === 'function'
              ? originalPlugin.propPanel.schema(args)
              : originalPlugin.propPanel.schema

            console.log('🎯 PLUGIN STEP 8: Original schema keys:', Object.keys(originalSchema))

            // Add signer assignment field
            const enhancedSchema = {
              ...originalSchema,
              assignedSigner: {
                title: 'Assigned Signer',
                type: 'string',
                widget: 'select',
                props: {
                  options: signerOptions
                },
                span: 12
              }
            }

            console.log('🎯 PLUGIN STEP 9: Enhanced schema created with keys:', Object.keys(enhancedSchema))
            return enhancedSchema
          },

          // Keep original widgets if they exist
          widgets: originalPlugin.propPanel.widgets
        }
      }

      console.log('✅ PLUGIN STEP 10: Signature plugin enhanced successfully')
    } else {
      console.log('❌ PLUGIN STEP 6: No signature plugin found in builtInPlugins')
      console.log('❌ Available plugins:', Object.keys(enhancedPlugins))
    }

    // Also enhance text plugin for optional signer assignment
    if (enhancedPlugins.text) {
      console.log('✅ PLUGIN STEP 11: Found text plugin, creating enhanced version')
      const originalPlugin = enhancedPlugins.text

      const textSignerOptions = [
        { label: 'No Assignment', value: '' },
        ...this.signers.map((signer, index) => ({
          label: `Signer ${index + 1}: ${signer.name}`,
          value: signer.id
        }))
      ]

      enhancedPlugins.text = {
        pdf: originalPlugin.pdf,
        ui: originalPlugin.ui,
        icon: originalPlugin.icon,

        propPanel: {
          defaultSchema: originalPlugin.propPanel.defaultSchema,

          schema: (args: any) => {
            const originalSchema = typeof originalPlugin.propPanel.schema === 'function'
              ? originalPlugin.propPanel.schema(args)
              : originalPlugin.propPanel.schema

            return {
              ...originalSchema,
              assignedSigner: {
                title: 'Assigned Signer (Optional)',
                type: 'string',
                widget: 'select',
                props: {
                  options: textSignerOptions
                },
                span: 12
              }
            }
          },

          widgets: originalPlugin.propPanel.widgets
        }
      }

      console.log('✅ PLUGIN STEP 12: Text plugin enhanced successfully')
    }

    console.log('🎉 PLUGIN STEP FINAL: Enhanced plugins created successfully')
    console.log('🎉 PLUGIN FINAL RESULT: Returning enhanced plugins with keys:', Object.keys(enhancedPlugins))
    return enhancedPlugins

    return enhancedPlugins
  }

  /**
   * Extract signer assignments from template
   */
  extractSignerAssignments(template: any): { [fieldName: string]: string } {
    const assignments: { [fieldName: string]: string } = {}

    if (template.schemas && Array.isArray(template.schemas)) {
      template.schemas.forEach((pageSchemas: any[]) => {
        if (Array.isArray(pageSchemas)) {
          pageSchemas.forEach((field: any) => {
            if (field.assignedSigner) {
              assignments[field.name] = field.assignedSigner
            }
          })
        }
      })
    }

    return assignments
  }

  /**
   * Apply signer assignments to template
   */
  applySignerAssignments(template: any, assignments: { [fieldName: string]: string }) {
    if (template.schemas && Array.isArray(template.schemas)) {
      template.schemas.forEach((pageSchemas: any[]) => {
        if (Array.isArray(pageSchemas)) {
          pageSchemas.forEach((field: any) => {
            if (assignments[field.name]) {
              field.assignedSigner = assignments[field.name]

              // Also add signer info for backward compatibility
              const signer = this.signers.find(s => s.id === assignments[field.name])
              if (signer) {
                field.signer_id = signer.id
                field.signer_name = signer.name
                field.signer_email = signer.email
              }
            }
          })
        }
      })
    }

    return template
  }

  /**
   * Get signer display name
   */
  getSignerDisplayName(signerId: string): string {
    const signer = this.signers.find(s => s.id === signerId)
    if (!signer) return 'Unassigned'

    const index = this.signers.findIndex(s => s.id === signerId)
    return `Signer ${index + 1}: ${signer.name}`
  }

  /**
   * Validate signer assignments
   */
  validateSignerAssignments(template: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const signatureFields: any[] = []

    // Collect all signature fields
    if (template.schemas && Array.isArray(template.schemas)) {
      template.schemas.forEach((pageSchemas: any[]) => {
        if (Array.isArray(pageSchemas)) {
          pageSchemas.forEach((field: any) => {
            if (field.type === 'signature') {
              signatureFields.push(field)
            }
          })
        }
      })
    }

    // Check if signature fields have signer assignments
    signatureFields.forEach((field, index) => {
      if (!field.assignedSigner) {
        errors.push(`Signature field "${field.name || `Field ${index + 1}`}" is not assigned to any signer`)
      }
    })

    // Check for duplicate assignments (if needed)
    const assignments = this.extractSignerAssignments(template)
    const signerFieldCounts: { [signerId: string]: number } = {}

    Object.values(assignments).forEach(signerId => {
      if (signerId) {
        signerFieldCounts[signerId] = (signerFieldCounts[signerId] || 0) + 1
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Update signers list
   */
  updateSigners(newSigners: Signer[]) {
    this.signers = newSigners
  }
}

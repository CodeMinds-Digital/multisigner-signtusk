/**
 * Migration utility to update signature_type based on actual signature fields in schemas
 */

import { createClient } from '@supabase/supabase-js'
import { analyzeDocumentSignatureType } from './signature-field-utils'

export class SignatureTypeMigration {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Update all documents to have correct signature_type based on their schemas
   */
  static async migrateAllDocuments(): Promise<{
    success: boolean
    updated: number
    errors: string[]
    details: Array<{
      id: string
      name: string
      oldSignatureType: string
      newSignatureType: string
      signatureFieldsCount: number
    }>
  }> {
    const errors: string[] = []
    const details: Array<{
      id: string
      name: string
      oldSignatureType: string
      newSignatureType: string
      signatureFieldsCount: number
    }> = []
    let updated = 0

    try {
      console.log('🔄 Starting signature type migration...')

      // Fetch all documents from document_templates table
      const { data: documents, error: fetchError } = await this.supabase
        .from('document_templates')
        .select('id, name, signature_type, schemas')

      if (fetchError) {
        errors.push(`Failed to fetch documents: ${fetchError.message}`)
        return { success: false, updated: 0, errors, details }
      }

      if (!documents || documents.length === 0) {
        console.log('📝 No documents found to migrate')
        return { success: true, updated: 0, errors, details }
      }

      console.log(`📊 Found ${documents.length} documents to analyze`)

      // Process each document
      for (const document of documents) {
        try {
          const oldSignatureType = document.signature_type || 'single'
          
          // Analyze the document's schemas
          const analysis = analyzeDocumentSignatureType(document)
          const newSignatureType = analysis.signatureType

          // Record the analysis
          details.push({
            id: document.id,
            name: document.name,
            oldSignatureType,
            newSignatureType,
            signatureFieldsCount: analysis.signatureFieldsCount
          })

          // Update if signature type has changed
          if (oldSignatureType !== newSignatureType) {
            console.log(`🔄 Updating document ${document.name}: ${oldSignatureType} → ${newSignatureType}`)

            const { error: updateError } = await this.supabase
              .from('document_templates')
              .update({ 
                signature_type: newSignatureType,
                updated_at: new Date().toISOString()
              })
              .eq('id', document.id)

            if (updateError) {
              errors.push(`Failed to update document ${document.name}: ${updateError.message}`)
            } else {
              updated++
            }
          } else {
            console.log(`✅ Document ${document.name} already has correct signature type: ${newSignatureType}`)
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Error processing document ${document.name}: ${errorMessage}`)
        }
      }

      console.log(`✅ Migration completed. Updated ${updated} documents.`)
      
      return {
        success: errors.length === 0,
        updated,
        errors,
        details
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Migration failed: ${errorMessage}`)
      return { success: false, updated: 0, errors, details }
    }
  }

  /**
   * Update a single document's signature type
   */
  static async migrateDocument(documentId: string): Promise<{
    success: boolean
    oldSignatureType: string
    newSignatureType: string
    signatureFieldsCount: number
    error?: string
  }> {
    try {
      // Fetch the document
      const { data: document, error: fetchError } = await this.supabase
        .from('document_templates')
        .select('id, name, signature_type, schemas')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        return {
          success: false,
          oldSignatureType: '',
          newSignatureType: '',
          signatureFieldsCount: 0,
          error: `Failed to fetch document: ${fetchError.message}`
        }
      }

      const oldSignatureType = document.signature_type || 'single'
      
      // Analyze the document's schemas
      const analysis = analyzeDocumentSignatureType(document)
      const newSignatureType = analysis.signatureType

      // Update if signature type has changed
      if (oldSignatureType !== newSignatureType) {
        const { error: updateError } = await this.supabase
          .from('document_templates')
          .update({ 
            signature_type: newSignatureType,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)

        if (updateError) {
          return {
            success: false,
            oldSignatureType,
            newSignatureType,
            signatureFieldsCount: analysis.signatureFieldsCount,
            error: `Failed to update document: ${updateError.message}`
          }
        }
      }

      return {
        success: true,
        oldSignatureType,
        newSignatureType,
        signatureFieldsCount: analysis.signatureFieldsCount
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        oldSignatureType: '',
        newSignatureType: '',
        signatureFieldsCount: 0,
        error: errorMessage
      }
    }
  }

  /**
   * Get migration preview without making changes
   */
  static async previewMigration(): Promise<{
    totalDocuments: number
    documentsToUpdate: number
    preview: Array<{
      id: string
      name: string
      currentSignatureType: string
      calculatedSignatureType: string
      signatureFieldsCount: number
      needsUpdate: boolean
    }>
  }> {
    try {
      // Fetch all documents
      const { data: documents, error: fetchError } = await this.supabase
        .from('document_templates')
        .select('id, name, signature_type, schemas')

      if (fetchError) {
        throw new Error(`Failed to fetch documents: ${fetchError.message}`)
      }

      const preview = documents?.map(document => {
        const currentSignatureType = document.signature_type || 'single'
        const analysis = analyzeDocumentSignatureType(document)
        const calculatedSignatureType = analysis.signatureType
        
        return {
          id: document.id,
          name: document.name,
          currentSignatureType,
          calculatedSignatureType,
          signatureFieldsCount: analysis.signatureFieldsCount,
          needsUpdate: currentSignatureType !== calculatedSignatureType
        }
      }) || []

      const documentsToUpdate = preview.filter(doc => doc.needsUpdate).length

      return {
        totalDocuments: preview.length,
        documentsToUpdate,
        preview
      }

    } catch (error) {
      console.error('Error previewing migration:', error)
      return {
        totalDocuments: 0,
        documentsToUpdate: 0,
        preview: []
      }
    }
  }
}

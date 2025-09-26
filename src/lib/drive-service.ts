/**
 * Drive Service
 * Handles document template operations for the unified signature system
 */

import { DocumentTemplate, DocumentUploadData } from '@/types/drive'

/**
 * Analyze document schemas to determine signature type
 */

export class DriveService {
  // Note: Admin operations moved to API routes for security
  // WARNING: Methods below that use 'this.supabase' are SERVER-SIDE ONLY
  // They should only be used in API routes, not in client components

  // Server-side only supabase instance (will be null on client)
  private static get supabase() {
    if (typeof window !== 'undefined') {
      throw new Error('Server-side DriveService methods cannot be used on the client side. Use API endpoints instead.')
    }
    // Only import on server side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { supabaseAdmin } = require('./supabase-admin')
    return supabaseAdmin
  }

  /**
   * Get document templates for a user (client-side function that calls API)
   */
  static async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    try {
      const response = await fetch('/api/drive/templates', {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data || []
      } else {
        throw new Error(result.error || 'Failed to fetch document templates')
      }
    } catch (error) {
      console.warn('Failed to fetch document templates from API, using mock data:', error)
      return this.getMockDocuments()
    }
  }

  /**
   * Upload document to Supabase storage (client-side function that calls API)
   */
  static async uploadDocument(file: File): Promise<{ data?: { path: string }, error?: any }> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return { data: result.data }
      } else {
        return { error: result.error || 'Upload failed' }
      }
    } catch (error) {
      console.error('Upload error:', error)
      return { error }
    }
  }



  /**
   * Create a new document template with upload data (client-side function that calls API)
   */
  static async createDocumentTemplate(
    documentData: DocumentUploadData,
    pdfPath: string,
    _userId: string,
    userEmail?: string
  ): Promise<DocumentTemplate> {
    try {
      const response = await fetch('/api/drive/templates/create', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentData,
          pdfPath,
          userEmail
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create document template')
      }
    } catch (error) {
      console.error('Error creating document template with upload data:', error)
      throw error
    }
  }

  /**
   * Update a document template with partial updates
   */
  static async updateDocumentTemplateFields(
    documentId: string,
    userId: string,
    updates: Partial<DocumentTemplate>
  ): Promise<DocumentTemplate> {
    try {
      const { data: document, error } = await this.supabase
        .from('documents')
        .update({
          title: updates.name,
          status: updates.status,
          description: updates.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        id: document.id,
        name: document.title,
        type: document.type || 'document',
        status: document.status,
        schemas: document.schemas || [],
        created_at: document.created_at,
        updated_at: document.updated_at,
        user_id: document.user_id,
        description: document.description,
        pdf_url: document.pdf_url,
        template_url: document.template_url,
        signature_type: document.signature_type,
        category: document.category,
        is_public: document.is_public,
        is_system_template: document.is_system_template,
        usage_count: document.usage_count
      }

    } catch {
      console.error('Error updating document template')
      throw new Error('Update failed')
    }
  }

  /**
   * Save a template JSON to storage (templates bucket) and return its path
   */
  static async saveTemplate(template: any, userId: string, documentId: string): Promise<{ data?: { path: string }, error?: any }> {
    try {
      // Use API call instead of direct Supabase access for authentication compatibility
      const response = await fetch('/api/drive/save-template', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template,
          userId,
          documentId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { error: errorData.error || `HTTP error! status: ${response.status}` }
      }

      const result = await response.json()

      if (result.success) {
        return { data: result.data }
      } else {
        return { error: result.error || 'Template save failed' }
      }
    } catch (error) {
      console.error('Error saving template JSON to storage:', error)
      return { error }
    }
  }

  /**
   * Quick storage access test: upload and delete a tiny file under the user folder in files bucket
   */
  static async testStorageAccess(_userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testPath = `test/${_userId}/${Date.now()}.json`
      const payload = new Blob([JSON.stringify({ ok: true, t: Date.now() })], { type: 'application/json' })

      const upload = await this.supabase.storage
        .from('files')
        .upload(testPath, payload, { upsert: true })

      if (upload.error) {
        return { success: false, error: upload.error.message }
      }

      // Clean up
      await this.supabase.storage.from('files').remove([testPath])
      return { success: true }
    } catch {
      return { success: false, error: 'Unknown storage error' }
    }
  }

  /**
   * Validate template completion and return status
   */
  static validateTemplateCompletion(document: any): { status: string; completion_percentage: number } {
    const hasSchemas = document.schemas && document.schemas.length > 0
    const hasPdf = !!document.file_url || !!document.pdf_url

    console.log('🔍 Validating template completion:', {
      hasSchemas,
      hasPdf,
      schemasLength: document.schemas?.length,
      signatureType: document.signature_type
    })

    if (!hasPdf) {
      return { status: 'draft', completion_percentage: 0 }
    }

    if (!hasSchemas) {
      return { status: 'draft', completion_percentage: 25 }
    }

    // Check for required signature fields
    const hasSignatureField = document.schemas.some((schema: any) =>
      schema.type === 'signature' || schema.properties?.type === 'signature'
    )

    console.log('🔍 Has signature field:', hasSignatureField)

    if (!hasSignatureField) {
      return { status: 'draft', completion_percentage: 75 }
    }

    // For single signature, having schemas + signature field = ready
    if (document.signature_type === 'single') {
      return { status: 'ready', completion_percentage: 100 }
    }

    // For multi-signature, for now just check if we have schemas and signature fields
    // TODO: Later enhance to check signer assignments
    if (document.signature_type === 'multi') {
      // Count signature fields - should have at least 2 for multi-signature
      const signatureFields = document.schemas.filter((schema: any) =>
        schema.type === 'signature' || schema.properties?.type === 'signature'
      )

      console.log('🔍 Multi-signature validation:', {
        signatureFieldsCount: signatureFields.length,
        totalSchemas: document.schemas.length
      })

      if (signatureFields.length >= 2) {
        return { status: 'ready', completion_percentage: 100 }
      } else {
        return { status: 'draft', completion_percentage: 85 }
      }
    }

    return { status: 'ready', completion_percentage: 100 }
  }

  /**
   * Analyze document schemas to determine signature type
   */
  private static analyzeDocumentSignatureType({ schemas }: { schemas: any[] }): { signatureType: 'single' | 'multi' } {
    if (!Array.isArray(schemas) || schemas.length === 0) {
      return { signatureType: 'single' }
    }

    // Count signature fields across all pages/schemas
    let signatureCount = 0
    schemas.forEach(pageSchemas => {
      if (Array.isArray(pageSchemas)) {
        pageSchemas.forEach(field => {
          if (field.type === 'signature' || field.properties?.type === 'signature') {
            signatureCount++
          }
        })
      }
    })

    const signatureType = signatureCount > 1 ? 'multi' : 'single'
    return { signatureType }
  }

  /**
   * Generate signers from signature fields in schemas
   */
  private static generateSignersFromSchemas(schemas: any[]): any[] {
    const signatureFields: any[] = []

    // Extract all signature fields from schemas
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

    // Create signers based on unique signature fields
    const signers: any[] = []
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
   * Update document template with schemas and template path (overload for wrapper compatibility)
   */
  static async updateDocumentTemplate(
    documentId: string,
    schemas: any[],
    templatePath?: string
  ): Promise<DocumentTemplate> {
    try {
      const response = await fetch('/api/drive/templates/update', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          schemas,
          templatePath
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Document update failed')
      }
    } catch (error) {
      console.error('Error updating document template:', error)
      throw error
    }
  }

  /**
   * Update document with schemas, signers, and template path
   */
  static async updateDocumentWithSchemas(
    documentId: string,
    schemas: any[],
    templatePath?: string,
    signers?: any[]
  ): Promise<DocumentTemplate> {
    try {
      // Get current document to validate completion
      const { data: currentDoc } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (!currentDoc) {
        throw new Error('Document not found')
      }

      // Validate completion and determine status
      const documentWithSchemas = { ...currentDoc, schemas }
      const { status, completion_percentage } = DriveService.validateTemplateCompletion(documentWithSchemas)

      console.log('🔍 Status validation result:', {
        documentId,
        currentStatus: currentDoc.status,
        newStatus: status,
        currentCompletion: currentDoc.completion_percentage,
        newCompletion: completion_percentage,
        schemasCount: schemas.length
      })

      // Ensure schemas is properly serialized for JSONB column
      console.log('🔍 Raw schemas input:', schemas)
      console.log('🔍 Schemas type:', typeof schemas)
      console.log('🔍 Schemas is array:', Array.isArray(schemas))
      console.log('🔍 Schemas length:', schemas?.length)

      const serializedSchemas = Array.isArray(schemas) ? schemas : []
      console.log('🔍 Serialized schemas:', serializedSchemas)

      const updatePayload: any = {
        schemas: serializedSchemas,
        status,
        completion_percentage,
        updated_at: new Date().toISOString()
      }

      if (templatePath) {
        updatePayload.template_url = templatePath
      }

      // Analyze signature fields and determine signature type automatically
      const signatureAnalysis = DriveService.analyzeDocumentSignatureType({ schemas: serializedSchemas })
      console.log('🔍 Signature analysis for document update:', signatureAnalysis)

      // Always update signature_type based on actual signature fields in schemas
      updatePayload.signature_type = signatureAnalysis.signatureType

      // Auto-generate signers from signature fields if not provided
      let finalSigners = signers
      if (!signers || signers.length === 0) {
        finalSigners = this.generateSignersFromSchemas(schemas)
      }

      if (finalSigners && Array.isArray(finalSigners)) {
        updatePayload.signers = finalSigners
      }

      console.log('🔍 Updating document with payload:', updatePayload)

      const { data: document, error } = await this.supabase
        .from('documents')
        .update(updatePayload)
        .eq('id', documentId)
        .select('*')
        .single()

      console.log('🔍 Database update result:', { document, error })

      if (error) {
        console.error('🔍 Database update error:', error)
        throw new Error(error.message)
      }

      // Ensure schemas is always an array
      let documentSchemas = []
      if (Array.isArray(document.schemas)) {
        documentSchemas = document.schemas
      } else if (document.schemas && typeof document.schemas === 'string') {
        try {
          const parsed = JSON.parse(document.schemas)
          documentSchemas = Array.isArray(parsed) ? parsed : []
        } catch (_error) {
          console.warn('Failed to parse schemas as JSON:', document.schemas)
          documentSchemas = []
        }
      } else if (document.schemas && typeof document.schemas === 'object') {
        // If it's an object but not an array, wrap it in an array
        documentSchemas = [document.schemas]
      }

      console.log('🔍 DriveService - Document schemas transformation:', {
        documentId: document.id,
        originalSchemas: document.schemas,
        originalType: typeof document.schemas,
        isArray: Array.isArray(document.schemas),
        transformedSchemas: documentSchemas,
        transformedLength: documentSchemas.length
      })

      return {
        id: document.id,
        name: document.title || document.file_name || 'Untitled Document',
        type: document.document_type || 'template',
        signature_type: document.signature_type || 'single',
        status: document.status,
        pdf_url: document.file_url || document.pdf_url,
        template_url: document.template_url,
        schemas: documentSchemas, // Use the safely transformed schemas
        created_at: document.created_at,
        updated_at: document.updated_at,
        user_id: document.user_id,
        description: document.description,
        template_data: document.template_data,
        category: document.category,
        is_public: document.is_public || false,
        is_system_template: document.is_system_template || false,
        usage_count: document.usage_count || 0
      }

    } catch (error) {
      console.error('Error updating document with schemas:', error)
      throw error
    }
  }

  /**
   * Delete a document template
   */
  static async deleteDocumentTemplate(documentId: string, userId: string): Promise<void> {
    try {
      // Try deleting from documents first
      const { error } = await this.supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        // If not found in documents, try document_templates
        const templateDelete = await this.supabase
          .from('document_templates')
          .delete()
          .eq('id', documentId)
          .eq('user_id', userId)

        if (templateDelete.error) {
          throw new Error(templateDelete.error.message)
        }
      }

    } catch (error) {
      console.error('Error deleting document template:', error)
      throw error
    }
  }

  /**
   * Archive a document template
   */
  static async archiveDocumentTemplate(documentId: string, userId: string): Promise<void> {
    try {
      // Try updating in documents first
      const { error } = await this.supabase
        .from('documents')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        // If not found in documents, try document_templates
        const templateUpdate = await this.supabase
          .from('document_templates')
          .update({
            status: 'archived',
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
          .eq('user_id', userId)

        if (templateUpdate.error) {
          throw new Error(templateUpdate.error.message)
        }
      }
    } catch {
      console.error('Error archiving document template')
      throw new Error('Archive failed')
    }
  }

  /**
   * Unarchive a document template (restore from archive)
   */
  static async unarchiveDocumentTemplate(documentId: string, userId: string): Promise<void> {
    try {
      // Get the document to determine what status to restore it to
      let document = null
      let isFromDocuments = false

      // Try documents table first
      const { data: docData, error: docError } = await this.supabase
        .from('documents')
        .select('schemas')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single()

      if (!docError && docData) {
        document = docData
        isFromDocuments = true
      } else {
        // Try document_templates table
        const { data: templateData, error: templateError } = await this.supabase
          .from('document_templates')
          .select('schemas')
          .eq('id', documentId)
          .eq('user_id', userId)
          .single()

        if (templateError) {
          throw new Error(templateError.message)
        }
        document = templateData
      }

      // Determine the appropriate status based on schemas
      const hasSchemas = document.schemas && Array.isArray(document.schemas) && document.schemas.length > 0
      const newStatus = hasSchemas ? 'ready' : 'draft'

      // Update the appropriate table
      if (isFromDocuments) {
        const { error } = await this.supabase
          .from('documents')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
          .eq('user_id', userId)

        if (error) {
          throw new Error(error.message)
        }
      } else {
        const { error } = await this.supabase
          .from('document_templates')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
          .eq('user_id', userId)

        if (error) {
          throw new Error(error.message)
        }
      }
    } catch {
      console.error('Error unarchiving document template')
      throw new Error('Unarchive failed')
    }
  }

  /**
   * Get a single document template (client-side function that calls API)
   */
  static async getDocumentTemplate(documentId: string): Promise<DocumentTemplate | null> {
    try {
      const response = await fetch(`/api/drive/templates/${documentId}`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch document template')
      }

    } catch (error) {
      console.error('Error fetching document template:', error)
      return null
    }
  }

  /**
   * Mock documents for development/fallback
   */
  private static getMockDocuments(): DocumentTemplate[] {
    return [
      {
        id: 'mock-1',
        name: 'Employment Contract',
        type: 'contract',
        signature_type: 'single',
        status: 'ready',
        pdf_url: '/mock/employment-contract.pdf',
        template_url: undefined,
        schemas: [
          {
            id: 'sig-1',
            type: 'signature',
            name: 'Employee Signature',
            position: {
              x: 100,
              y: 200,
              width: 200,
              height: 50,
              page: 1
            },
            properties: {
              signerId: 'signer_1'
            },
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        user_id: 'mock-user',
        description: 'Employment contract ready for signature'
      },
      {
        id: 'mock-2',
        name: 'Partnership Agreement',
        type: 'partnership',
        signature_type: 'multi',
        status: 'ready',
        pdf_url: '/mock/partnership-agreement.pdf',
        template_url: undefined,
        schemas: [
          {
            id: 'sig-1',
            type: 'signature',
            name: 'Partner 1 Signature',
            position: {
              x: 100,
              y: 200,
              width: 200,
              height: 50,
              page: 1
            },
            properties: {
              signerId: 'signer_1'
            },
            created_at: new Date().toISOString()
          },
          {
            id: 'sig-2',
            type: 'signature',
            name: 'Partner 2 Signature',
            position: {
              x: 100,
              y: 300,
              width: 200,
              height: 50,
              page: 1
            },
            properties: {
              signerId: 'signer_2'
            },
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        user_id: 'mock-user',
        description: 'Partnership agreement requiring multiple signatures'
      },
      {
        id: 'mock-3',
        name: 'NDA Template',
        type: 'nda',
        signature_type: 'single',
        status: 'ready',
        pdf_url: '/mock/nda-template.pdf',
        template_url: undefined,
        schemas: [
          {
            id: 'sig-1',
            type: 'signature',
            name: 'Signatory',
            position: {
              x: 100,
              y: 250,
              width: 200,
              height: 50,
              page: 1
            },
            properties: {
              signerId: 'signer_1'
            },
            created_at: new Date().toISOString()
          }
        ],
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 259200000).toISOString(),
        user_id: 'mock-user',
        description: 'Non-disclosure agreement ready for signature'
      },
      {
        id: 'mock-4',
        name: 'Service Agreement Draft',
        type: 'service_agreement',
        signature_type: undefined as any, // No signature type set
        status: 'draft',
        pdf_url: '/mock/service-agreement.pdf',
        template_url: undefined,
        schemas: [],
        created_at: new Date(Date.now() - 345600000).toISOString(),
        updated_at: new Date(Date.now() - 345600000).toISOString(),
        user_id: 'mock-user',
        description: 'Service agreement template in progress'
      },
      {
        id: 'mock-5',
        name: 'Agreement Template',
        type: 'agreement',
        signature_type: undefined as any, // No signature type set
        status: 'draft',
        pdf_url: '/mock/agreement.pdf',
        template_url: undefined,
        schemas: [],
        created_at: new Date(Date.now() - 432000000).toISOString(),
        updated_at: new Date(Date.now() - 432000000).toISOString(),
        user_id: 'mock-user',
        description: 'Agreement template without signatures configured'
      }
    ]
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(_userId: string): Promise<{
    total: number
    completed: number
    draft: number
    pending: number
    expired: number
    cancelled: number
  }> {
    try {
      const documents = await DriveService.getDocumentTemplates()

      return {
        total: documents.length,
        completed: documents.filter(doc => doc.status === 'completed').length,
        draft: documents.filter(doc => doc.status === 'draft').length,
        pending: documents.filter(doc => doc.status === 'pending').length,
        expired: documents.filter(doc => doc.status === 'expired').length,
        cancelled: documents.filter(doc => doc.status === 'cancelled').length
      }

    } catch (error) {
      console.error('Error getting document stats:', error)
      return { total: 0, completed: 0, draft: 0, pending: 0, expired: 0, cancelled: 0 }
    }
  }

  /**
   * Get document URL from path (client-side function that calls API)
   */
  static async getDocumentUrl(pdfPath: string): Promise<string | null> {
    try {
      if (!pdfPath) return null

      console.log('🔍 DriveService.getDocumentUrl called with path:', pdfPath)

      // If it's an absolute HTTP(S) URL, return as is
      if (pdfPath.startsWith('http')) {
        console.log('✅ Path is already HTTP URL, returning as-is')
        return pdfPath
      }

      // If it's an app-relative path like "/mock/sample.pdf", build a full URL
      if (pdfPath.startsWith('/')) {
        if (typeof window !== 'undefined') {
          const fullUrl = `${window.location.origin}${pdfPath}`
          console.log('✅ Built full URL from relative path:', fullUrl)
          return fullUrl
        }
        return null
      }

      console.log('🔍 Trying to get signed URL via API for path:', pdfPath)

      // Try the documents preview API (PDFs are stored in 'documents' bucket)
      try {
        const previewResponse = await fetch(`/api/documents/preview?bucket=documents&path=${pdfPath}`)
        console.log('📡 Preview API response:', previewResponse.status, previewResponse.statusText)

        if (previewResponse.ok) {
          const result = await previewResponse.json()
          console.log('📋 Preview API result:', result)
          if (result.success && result.url) {
            console.log('✅ Got signed URL from preview API:', result.url)
            return result.url
          }
        }
      } catch (previewError) {
        console.log('❌ Preview API failed:', previewError)
      }

      // Fallback to the original drive document-url API
      const response = await fetch('/api/drive/document-url', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfUrl: pdfPath })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data.url
      } else {
        throw new Error(result.error || 'Failed to get document URL')
      }
    } catch (error) {
      console.error('Error getting document URL:', error)
      return null
    }
  }

  /**
   * Get PDF data as ArrayBuffer for PDFme (client-side function that calls API)
   */
  static async getPdfData(pdfPath: string): Promise<ArrayBuffer | null> {
    try {
      if (!pdfPath) throw new Error('Empty PDF path')

      console.log('🔍 Getting PDF data for path:', pdfPath)

      const response = await fetch('/api/drive/pdf-data', {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdfPath })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data.base64) {
        // Convert base64 back to ArrayBuffer
        const binaryString = atob(result.data.base64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return bytes.buffer
      } else {
        throw new Error(result.error || 'Failed to get PDF data')
      }

    } catch (error) {
      console.error('Error getting PDF data for path:', pdfPath, error)
      return null
    }
  }

  /**
   * Get template JSON from URL
   */
  static async getTemplateJson(templateUrl: string): Promise<any> {
    try {
      if (!templateUrl) {
        console.log('No template URL provided, returning null')
        return null
      }

      console.log('Fetching template from URL:', templateUrl)
      console.log('Template URL type:', typeof templateUrl)
      console.log('Template URL length:', templateUrl?.length)
      console.log('Template URL starts with templates/:', templateUrl?.startsWith('templates/'))

      // Convert the template URL to use our API route
      // Get the current origin (handles different ports dynamically)
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'

      // Handle both relative and absolute URLs
      let apiUrl = templateUrl
      if (templateUrl.startsWith('http://localhost:3000/') || templateUrl.startsWith('http://localhost:3001/')) {
        // Absolute URL: http://localhost:XXXX/user_id/doc_id/template.json
        const pathPart = templateUrl.replace(/^http:\/\/localhost:\d+\//, '')
        apiUrl = `${currentOrigin}/api/templates/${pathPart}`
      } else {
        // templateUrl is like: "templates/userId/documentId/template.json"
        // API route expects: "/api/templates/templates/userId/documentId/template.json"
        // So we need to pass the templateUrl as-is to the API route
        apiUrl = `${currentOrigin}/api/templates/${templateUrl}`
      }

      // Add cache busting to ensure fresh template loading
      const cacheBuster = `?t=${Date.now()}&r=${Math.random()}`
      const finalUrl = `${apiUrl}${cacheBuster}`

      console.log('Using API route with cache busting:', finalUrl)
      const response = await fetch(finalUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('Template not found (404), this is normal for new documents')
          return null
        }
        if (response.status === 400) {
          console.log('Template request failed (400 Bad Request), likely storage issue - falling back to database schemas')
          return null
        }
        console.warn(`Template fetch failed with status ${response.status}: ${response.statusText}`)
        return null
      }

      const templateData = await response.json()
      console.log('Successfully loaded template JSON:', templateData)
      return templateData

    } catch (error) {
      console.error('Error getting template JSON:', error)
      return null
    }
  }
}

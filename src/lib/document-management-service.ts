/**
 * Document Management Service
 * Handles document template operations for the unified signature system
 */

import { createClient } from '@supabase/supabase-js'
import { DocumentTemplate, DocumentUploadData } from '@/types/document-management'
import { generateSignersFromSchemas, analyzeDocumentSignatureType } from './signature-field-utils'

export class DocumentManagementService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  /**
   * Get document templates for a user
   */
  static async getDocumentTemplates(userId: string): Promise<DocumentTemplate[]> {
    try {
      // Get from both documents and document_templates tables
      const [documentsResult, templatesResult] = await Promise.all([
        this.supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        this.supabase
          .from('document_templates')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      ])

      const documents = documentsResult.data || []
      const templates = templatesResult.data || []

      if (documentsResult.error && templatesResult.error) {
        console.warn('Database queries failed, using mock data:', documentsResult.error, templatesResult.error)
        return this.getMockDocuments()
      }

      // Transform both documents and templates to DocumentTemplate format
      const allDocuments = [...documents, ...templates]

      return allDocuments?.map(doc => {
        // Calculate status based on schema availability
        const metadata = doc.metadata || {}
        const schemas = metadata.schemas || doc.schemas || []
        const hasSchemas = Array.isArray(schemas) && schemas.length > 0

        // For multi-signature documents, check if all signers have schemas
        let isComplete = hasSchemas
        if (metadata.signatureType === 'multi' && metadata.signers) {
          const signers = metadata.signers || []
          isComplete = hasSchemas && signers.every((signer: any, index: number) => {
            const signerId = `signer_${index + 1}`
            return schemas.some((s: any) => s.signerId === signerId)
          })
        }

        // Normalize status to our allowed set
        const rawStatus: string = doc.status || (isComplete ? 'ready' : 'draft')
        const allowedStatuses = ['draft', 'ready', 'published', 'archived'] as const
        const normalizedStatus = rawStatus === 'complete'
          ? 'ready'
          : rawStatus === 'completed'
            ? 'ready'
            : rawStatus === 'incomplete'
              ? 'draft'
              : (allowedStatuses as readonly string[]).includes(rawStatus)
                ? (rawStatus as typeof allowedStatuses[number])
                : 'draft'

        return {
          id: doc.id,
          name: doc.name || doc.title || doc.file_name || 'Untitled Document',
          type: doc.type || doc.document_type || 'template',
          signature_type: doc.signature_type || 'single',
          status: normalizedStatus,
          pdf_url: doc.pdf_url || doc.file_url, // Handle both table structures
          template_url: doc.template_url,
          schemas: schemas,
          signers: doc.signers || [],
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          user_id: doc.user_id,
          // Additional fields
          description: doc.description,
          template_data: doc.template_data,
          category: doc.category,
          is_public: doc.is_public || false,
          is_system_template: doc.is_system_template || false,
          usage_count: doc.usage_count || 0,
          completion_percentage: doc.completion_percentage || 0
        }
      }) || []

    } catch (error) {
      console.error('Error fetching document templates:', error)
      return this.getMockDocuments()
    }
  }

  /**
   * Upload document to Supabase storage
   */
  static async uploadDocument(file: File, userId: string): Promise<{ data?: { path: string }, error?: any }> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { data, error } = await this.supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (error) {
        console.error('Upload error:', error)
        return { error }
      }

      return { data: { path: data.path } }
    } catch (error) {
      console.error('Upload error:', error)
      return { error }
    }
  }



  /**
   * Create a new document template with upload data
   */
  static async createDocumentTemplate(
    documentData: DocumentUploadData,
    pdfPath: string,
    userId: string,
    userEmail?: string
  ): Promise<DocumentTemplate> {
    try {
      // Prepare the document data with only the fields that exist in the database
      const documentInsertData: any = {
        title: documentData.name,
        file_name: documentData.name,
        user_id: userId,
        user_email: userEmail || 'user@example.com',
        status: 'draft',
        document_type: documentData.type,
        category: documentData.category || 'Other',
        signature_type: 'single', // Default to single, will be updated based on signers
        description: `${documentData.type} - ${documentData.category || 'Other'}`,
        completion_percentage: 0
      }

      // Add optional fields if they exist in the database schema
      if (pdfPath) {
        documentInsertData.file_url = pdfPath
      }

      const { data: document, error } = await this.supabase
        .from('documents')
        .insert(documentInsertData)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return {
        id: document.id,
        name: document.title,
        type: documentData.type,
        category: documentData.category,
        signature_type: 'single', // Will be determined by signers count
        status: document.status,
        pdf_url: document.file_url || pdfPath,
        template_url: undefined,
        schemas: [],
        created_at: document.created_at,
        updated_at: document.updated_at,
        user_id: document.user_id,
        description: document.description,
        template_data: null,
        is_public: false,
        is_system_template: false,
        usage_count: 0
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
          completion_percentage: updates.completion_percentage,
          metadata: updates.metadata,
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
        status: document.status,
        created_at: document.created_at,
        updated_at: document.updated_at,
        file_name: document.file_name,
        file_url: document.file_url,
        user_id: document.user_id,
        metadata: document.metadata || {},
        description: document.description,
        document_type: document.document_type,
        completion_percentage: document.completion_percentage
      }

    } catch (error) {
      console.error('Error updating document template:', error)
      throw error
    }
  }

  /**
   * Save a template JSON to storage (templates bucket) and return its path
   */
  static async saveTemplate(template: any, userId: string, documentId: string): Promise<{ data?: { path: string }, error?: any }> {
    try {
      // Get document info to ensure correct metadata
      const { data: document } = await this.supabase
        .from('documents')
        .select('signature_type, title, category, document_type')
        .eq('id', documentId)
        .single()

      if (!document) {
        throw new Error('Document not found')
      }

      // Preserve complete PDFme template structure
      const completeTemplate = {
        basePdf: template.basePdf || null, // Preserve basePdf if exists
        schemas: template.schemas || [],
        // ✅ CRITICAL: Preserve signers array
        signers: template.signers || [],
        // ✅ CRITICAL: Preserve multiSignature flag
        multiSignature: template.multiSignature || (template.signers && template.signers.length > 1) || document.signature_type === 'multi',
        // Add metadata for compatibility
        metadata: {
          signature_type: document.signature_type,
          document_type: document.document_type,
          category: document.category,
          title: document.title,
          is_multi_signature: document.signature_type === 'multi',
          created_at: new Date().toISOString(),
          version: '1.0',
          // Preserve any existing metadata
          ...template.metadata
        }
      }

      const fileName = `templates/${userId}/${documentId}/template.json`
      const json = JSON.stringify(completeTemplate, null, 2)

      // Upload to 'files' bucket (no MIME type restrictions)
      const { data, error } = await this.supabase.storage
        .from('files')
        .upload(fileName, new Blob([json], { type: 'application/json' }), {
          upsert: true
        })

      if (error) {
        return { error }
      }

      return { data: { path: data!.path } }
    } catch (error) {
      console.error('Error saving template JSON to storage:', error)
      return { error }
    }
  }

  /**
   * Quick storage access test: upload and delete a tiny file under the user folder in files bucket
   */
  static async testStorageAccess(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testPath = `test/${userId}/${Date.now()}.json`
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
    } catch (e: any) {
      return { success: false, error: e?.message || 'Unknown storage error' }
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
    return this.updateDocumentWithSchemas(documentId, schemas, templatePath)
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
      const { status, completion_percentage } = this.validateTemplateCompletion(documentWithSchemas)

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
      const signatureAnalysis = analyzeDocumentSignatureType({ schemas: serializedSchemas })
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

      return {
        id: document.id,
        name: document.title || document.file_name || 'Untitled Document',
        type: document.document_type || 'template',
        signature_type: document.signature_type || 'single',
        status: document.status,
        pdf_url: document.file_url || document.pdf_url,
        template_url: document.template_url,
        schemas: document.schemas || [],
        signers: document.signers || [],
        created_at: document.created_at,
        updated_at: document.updated_at,
        user_id: document.user_id,
        description: document.description,
        template_data: document.template_data,
        category: document.category,
        is_public: document.is_public || false,
        is_system_template: document.is_system_template || false,
        usage_count: document.usage_count || 0,
        completion_percentage: document.completion_percentage || 0
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
      let { error } = await this.supabase
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
   * Get a single document template
   */
  static async getDocumentTemplate(documentId: string, userId: string): Promise<DocumentTemplate | null> {
    try {
      const { data: document, error } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single()

      if (error || !document) {
        return null
      }

      return {
        id: document.id,
        name: document.title,
        status: document.status,
        created_at: document.created_at,
        updated_at: document.updated_at,
        file_name: document.file_name,
        file_url: document.file_url,
        user_id: document.user_id,
        metadata: document.metadata || {},
        description: document.description,
        document_type: document.document_type,
        completion_percentage: document.completion_percentage
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
        name: 'Sample Contract Template',
        type: 'contract',
        signature_type: 'single',
        status: 'completed',
        pdf_url: '/mock/sample-contract.pdf',
        template_url: undefined,
        schemas: [],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
        user_id: 'mock-user',
        description: 'A sample contract template for testing'
      },
      {
        id: 'mock-2',
        name: 'NDA Template',
        type: 'nda',
        signature_type: 'single',
        status: 'completed',
        pdf_url: '/mock/nda-template.pdf',
        template_url: undefined,
        schemas: [],
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 172800000).toISOString(),
        user_id: 'mock-user',
        description: 'Non-disclosure agreement template'
      },
      {
        id: 'mock-3',
        name: 'Service Agreement Draft',
        type: 'service_agreement',
        signature_type: 'single',
        status: 'draft',
        pdf_url: '/mock/service-agreement.pdf',
        template_url: undefined,
        schemas: [],
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 259200000).toISOString(),
        user_id: 'mock-user',
        description: 'Service agreement template in progress'
      }
    ]
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(userId: string): Promise<{
    total: number
    completed: number
    draft: number
    pending: number
    expired: number
    cancelled: number
  }> {
    try {
      const documents = await this.getDocumentTemplates(userId)

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
      return { total: 0, completed: 0, incomplete: 0, pending: 0 }
    }
  }

  /**
   * Get document URL from path
   */
  static async getDocumentUrl(pdfPath: string): Promise<string | null> {
    try {
      if (!pdfPath) return null

      // If it's an absolute HTTP(S) URL, return as is
      if (pdfPath.startsWith('http')) {
        return pdfPath
      }

      // If it's an app-relative path like "/mock/sample.pdf", build a full URL
      if (pdfPath.startsWith('/')) {
        if (typeof window !== 'undefined') {
          return `${window.location.origin}${pdfPath}`
        }
        return null
      }

      // Prefer a signed URL (works for private buckets too)
      const signed = await this.supabase.storage
        .from('documents')
        .createSignedUrl(pdfPath, 60 * 10) // 10 minutes

      if (signed.data?.signedUrl) {
        return signed.data.signedUrl
      }

      // Fallback to public URL (if bucket is public)
      const { data } = this.supabase.storage
        .from('documents')
        .getPublicUrl(pdfPath)

      return data.publicUrl || null

    } catch (error) {
      console.error('Error getting document URL:', error)
      return null
    }
  }

  /**
   * Get PDF data as ArrayBuffer for PDFme
   */
  static async getPdfData(pdfPath: string): Promise<ArrayBuffer | null> {
    try {
      if (!pdfPath) throw new Error('Empty PDF path')

      // If it's an absolute URL or app-relative path (e.g. /mock/foo.pdf), resolve and fetch directly
      if (pdfPath.startsWith('http') || pdfPath.startsWith('/')) {
        const url = await this.getDocumentUrl(pdfPath)
        if (!url) throw new Error('Unable to resolve PDF URL')
        const noCacheUrl = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`
        const response = await fetch(noCacheUrl, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
        }
        return await response.arrayBuffer()
      }

      // Otherwise, treat as a storage object path and use Supabase SDK download (auth-aware)
      const { data, error } = await this.supabase.storage
        .from('documents')
        .download(pdfPath)

      if (error || !data) {
        throw new Error(error?.message || 'Failed to download PDF from storage')
      }

      return await data.arrayBuffer()

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

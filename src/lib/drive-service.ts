import { supabase } from './supabase'
import { DocumentTemplate, DocumentUploadData, Schema, SupabaseStorageResponse } from '@/types/document-management'
import { AuthRecovery, handleApiError } from './auth-recovery'
import { DataPersistenceManager } from './data-persistence-manager'
import { PerformanceMonitor } from './performance-monitor'

export class DriveService {
  private static readonly DOCUMENTS_BUCKET = 'documents'
  private static readonly TEMPLATES_BUCKET = 'templates'
  private static readonly TABLE_NAME = 'document_templates'

  /**
   * Upload PDF document to Supabase storage
   */
  static async uploadDocument(file: File, userId: string): Promise<SupabaseStorageResponse> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      return { data, error }
    } catch (error) {
      console.error('Error uploading document:', error)
      return { data: null, error }
    }
  }

  /**
   * Get signed URL for document preview
   */
  static async getDocumentUrl(path: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .createSignedUrl(path, 3600) // 1 hour expiry

      if (error) {
        console.error('Error getting signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting document URL:', error)
      return null
    }
  }

  /**
   * Test storage access for current user
   */
  static async testStorageAccess(userId: string): Promise<{ success: boolean, error?: string }> {
    try {
      console.log('Testing storage access for user:', userId)

      // Test creating a simple file
      const testFileName = `${userId}/test-${Date.now()}.json`
      const testData = { test: true, timestamp: Date.now() }
      const testBlob = new Blob([JSON.stringify(testData)], { type: 'application/json' })

      console.log('Testing upload to templates bucket with file:', testFileName)

      const { data, error } = await supabase.storage
        .from(this.TEMPLATES_BUCKET)
        .upload(testFileName, testBlob, { upsert: true })

      if (error) {
        console.error('Storage test failed:', error)
        return { success: false, error: error.message }
      }

      console.log('Storage test successful:', data)

      // Clean up test file
      await supabase.storage.from(this.TEMPLATES_BUCKET).remove([testFileName])

      return { success: true }
    } catch (error) {
      console.error('Storage test exception:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Ensure storage buckets exist
   */
  static async ensureBucketsExist(): Promise<void> {
    try {
      // Check if buckets exist
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        console.error('Error listing buckets:', listError)
        return
      }

      const existingBuckets = buckets?.map(b => b.id) || []
      console.log('Existing buckets:', existingBuckets)

      // Create documents bucket if it doesn't exist
      if (!existingBuckets.includes(this.DOCUMENTS_BUCKET)) {
        console.log('Creating documents bucket...')
        const { error: createError } = await supabase.storage.createBucket(this.DOCUMENTS_BUCKET, {
          public: false,
          fileSizeLimit: 52428800, // 50MB
          allowedMimeTypes: ['application/pdf']
        })
        if (createError) {
          console.error('Error creating documents bucket:', createError)
        }
      }

      // Create templates bucket if it doesn't exist
      if (!existingBuckets.includes(this.TEMPLATES_BUCKET)) {
        console.log('Creating templates bucket...')
        const { error: createError } = await supabase.storage.createBucket(this.TEMPLATES_BUCKET, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['application/json']
        })
        if (createError) {
          console.error('Error creating templates bucket:', createError)
        }
      }
    } catch (error) {
      console.error('Error ensuring buckets exist:', error)
    }
  }

  /**
   * Save template JSON to storage
   */
  static async saveTemplate(templateData: any, userId: string, documentId: string): Promise<SupabaseStorageResponse> {
    try {
      // Ensure buckets exist
      await this.ensureBucketsExist()

      // Validate inputs
      if (!userId || !documentId) {
        console.error('Invalid userId or documentId:', { userId, documentId })
        return { data: null, error: new Error('Invalid userId or documentId') }
      }

      // Validate user ID format (should be UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        console.error('Invalid userId format (not UUID):', userId)
        return { data: null, error: new Error('Invalid userId format') }
      }

      const fileName = `${userId}/${documentId}-template.json`
      console.log('Saving template with filename:', fileName)
      console.log('Template data:', templateData)
      console.log('Template data type:', typeof templateData)
      console.log('Template data schemas:', templateData.schemas)
      console.log('Template data schemas structure:', JSON.stringify(templateData.schemas, null, 2))

      const templateBlob = new Blob([JSON.stringify(templateData, null, 2)], {
        type: 'application/json'
      })

      // Try upload with retry for RLS errors
      let uploadResult = await supabase.storage
        .from(this.TEMPLATES_BUCKET)
        .upload(fileName, templateBlob, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })

      // If RLS error, try to refresh auth and retry once
      if (uploadResult.error && uploadResult.error.message?.includes('row-level security policy')) {
        console.log('RLS error detected, refreshing auth and retrying...')

        try {
          // Refresh the session
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('Auth refresh failed:', refreshError)
          } else {
            console.log('Auth refreshed, retrying upload...')
            // Retry the upload
            uploadResult = await supabase.storage
              .from(this.TEMPLATES_BUCKET)
              .upload(fileName, templateBlob, {
                cacheControl: '3600',
                upsert: true
              })
          }
        } catch (refreshErr) {
          console.error('Error during auth refresh:', refreshErr)
        }
      }

      if (uploadResult.error) {
        console.error('Storage upload error:', uploadResult.error)
        console.error('Error details:', {
          message: uploadResult.error.message,
          statusCode: uploadResult.error.statusCode,
          error: uploadResult.error.error,
          fileName: fileName,
          bucket: this.TEMPLATES_BUCKET,
          userId: userId
        })
      } else {
        console.log('Template uploaded successfully:', uploadResult.data)
      }

      return { data: uploadResult.data, error: uploadResult.error }
    } catch (error) {
      console.error('Error saving template:', error)
      return { data: null, error }
    }
  }

  /**
   * Create document template with file upload (unified workflow)
   */
  static async createDocumentTemplateWithFile(
    documentData: {
      name: string
      type: string
      category: string
      description?: string
      signature_type: 'single' | 'multi'
    },
    file: File,
    userId: string
  ): Promise<DocumentTemplate | null> {
    try {
      console.log('Creating document template with file upload for user:', userId)

      // First upload the PDF file
      const uploadResult = await this.uploadDocument(file, userId)

      if (!uploadResult.success || !uploadResult.path) {
        console.error('Failed to upload document:', uploadResult.error)
        return null
      }

      // Create the template data structure
      const templateData: DocumentUploadData = {
        name: documentData.name,
        type: documentData.type,
        category: documentData.category,
        description: documentData.description,
        signature_type: documentData.signature_type
      }

      // Create the template record
      return await this.createDocumentTemplate(templateData, uploadResult.path, userId)
    } catch (error) {
      console.error('Error in createDocumentTemplateWithFile:', error)
      return null
    }
  }

  /**
   * Create document template record in database
   */
  static async createDocumentTemplate(
    documentData: DocumentUploadData,
    pdfPath: string,
    userId: string
  ): Promise<DocumentTemplate | null> {
    try {
      console.log('Creating document template for user:', userId)
      console.log('PDF path:', pdfPath)
      console.log('Document data:', documentData)
      // Create document template with required fields
      const documentTemplate = {
        name: documentData.name,
        type: documentData.type, // Add type as direct column (required by database)
        category: documentData.category || 'General', // Add category field
        template_data: {
          // Store our document management data in template_data
          signature_type: documentData.signature_type,
          status: 'incomplete',
          pdf_url: pdfPath,
          schemas: []
        },
        user_id: userId
      }

      console.log('Creating document template with data:', documentTemplate)

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([documentTemplate])
        .select()
        .single()

      if (error) {
        console.error('Error creating document template:', error)
        console.error('Error details:', error)
        console.error('Error message:', error.message)
        console.error('Error code:', error.code)
        console.error('Error hint:', error.hint)
        console.error('Attempted to insert:', documentTemplate)
        return null
      }

      // Invalidate cache
      DataPersistenceManager.invalidateCache(`document_templates_${userId}`)

      // Transform the response to match our DocumentTemplate interface
      return {
        id: data.id,
        name: data.name,
        type: data.type || data.template_data?.type || data.category || 'Document', // Use direct type column first
        signature_type: data.template_data?.signature_type || 'single',
        status: data.template_data?.status || 'incomplete',
        pdf_url: data.template_data?.pdf_url || '',
        template_url: data.template_data?.template_url,
        schemas: data.template_data?.schemas || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        description: data.description,
        template_data: data.template_data,
        category: data.category,
        is_public: data.is_public,
        is_system_template: data.is_system_template,
        usage_count: data.usage_count
      }
    } catch (error) {
      console.error('Error creating document template:', error)
      return null
    }
  }

  /**
   * Test database access and RLS policies
   */
  static async testDatabaseAccess(documentId: string): Promise<any> {
    try {
      console.log('🧪 TESTING DATABASE ACCESS')

      // Test 1: Check if we can read the document
      const { data: readTest, error: readError } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', documentId)
        .single()

      console.log('🧪 Read test result:', { data: readTest, error: readError })

      // Test 2: Check current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('🧪 Current user:', { user, authError })

      // Test 3: Try a simple update (just updated_at)
      const { data: updateTest, error: updateError } = await supabase
        .from(this.TABLE_NAME)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .select()
        .single()

      console.log('🧪 Simple update test:', { data: updateTest, error: updateError })

      return {
        readTest: { data: readTest, error: readError },
        authTest: { user, authError },
        updateTest: { data: updateTest, error: updateError }
      }
    } catch (error) {
      console.error('🧪 Database access test failed:', error)
      return { error }
    }
  }

  /**
   * Update document template with schemas and template URL
   */
  static async updateDocumentTemplate(
    documentId: string,
    schemas: Schema[],
    templatePath?: string
  ): Promise<DocumentTemplate | null> {
    try {
      // First get the current document to preserve existing template_data
      const { data: currentDoc, error: fetchError } = await supabase
        .from(this.TABLE_NAME)
        .select('template_data')
        .eq('id', documentId)
        .single()

      if (fetchError) {
        console.error('Error fetching current document:', fetchError)
        return null
      }

      // Update the template_data with new schemas and status
      // Preserve existing status if already completed, or set to completed if has schemas
      const currentStatus = currentDoc.template_data?.status || 'incomplete'
      let newStatus = currentStatus

      // Only change status in these cases:
      // 1. If was incomplete and now has schemas -> completed
      // 2. If was completed and now has no schemas -> incomplete (edge case)
      if (currentStatus === 'incomplete' && schemas.length > 0) {
        newStatus = 'completed'
      } else if (currentStatus === 'completed' && schemas.length === 0) {
        newStatus = 'incomplete'
      }
      // Otherwise preserve existing status (completed stays completed)

      console.log('Status update:', { currentStatus, newStatus, schemasCount: schemas.length })

      // Debug schema types being saved
      console.log('🔍 SCHEMAS BEING SAVED TO DATABASE:')
      schemas.forEach((schema, index) => {
        console.log(`🔍 Schema ${index}:`, {
          id: schema.id,
          name: schema.name,
          type: schema.type,
          properties: schema.properties
        })
      })

      const updatedTemplateData = {
        ...currentDoc.template_data,
        schemas,
        status: newStatus,
        template_url: templatePath || currentDoc.template_data?.template_url
      }

      const updateData = {
        template_data: updatedTemplateData,
        status: newStatus, // Also update the direct status column
        updated_at: new Date().toISOString()
      }

      console.log('🔍 ATTEMPTING DATABASE UPDATE:')
      console.log('🔍 Document ID:', documentId)
      console.log('🔍 Update data:', JSON.stringify(updateData, null, 2))
      console.log('🔍 Table name:', this.TABLE_NAME)
      console.log('🔍 Schemas being saved:', schemas.length)

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {
        console.error('🚨 DATABASE UPDATE ERROR:', error)
        console.error('🚨 Error details:', {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details,
          documentId: documentId,
          updateData: updateData,
          tableName: this.TABLE_NAME,
          schemasCount: schemas.length
        })

        // Check if it's an auth-related error
        if (AuthRecovery.isAuthError(error)) {
          console.error('🚨 AUTH ERROR DETECTED - attempting recovery')
          try {
            await handleApiError(error, async () => {
              // Retry the update operation
              const { data: retryData, error: retryError } = await supabase
                .from(this.TABLE_NAME)
                .update(updateData)
                .eq('id', documentId)
                .select()
                .single()

              if (retryError) throw retryError
              return retryData
            })
          } catch (recoveryError) {
            console.error('🚨 Auth recovery failed:', recoveryError)
            return null
          }
        }

        // Check if it's an RLS error specifically
        if (error.message && error.message.includes('row-level security policy')) {
          console.error('🚨 RLS POLICY VIOLATION DETECTED')
          console.error('🚨 This suggests an authentication or permission issue')

          // Try to get current user info
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          console.error('🚨 Current user:', user)
          console.error('🚨 Auth error:', authError)

          // If user is null, it's definitely an auth issue
          if (!user) {
            console.error('🚨 No authenticated user found - triggering auth recovery')
            await AuthRecovery.forceRedirectToLogin('Authentication required to save document')
            return null
          }
        }

        return null
      }

      // Transform the response to match our interface
      return {
        id: data.id,
        name: data.name,
        type: data.type || data.template_data?.type || data.category || 'Document', // Use direct type column first
        signature_type: data.template_data?.signature_type || 'single',
        status: data.template_data?.status || 'incomplete',
        pdf_url: data.template_data?.pdf_url || '',
        template_url: data.template_data?.template_url,
        schemas: data.template_data?.schemas || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        description: data.description,
        template_data: data.template_data,
        category: data.category,
        is_public: data.is_public,
        is_system_template: data.is_system_template,
        usage_count: data.usage_count
      }
    } catch (error) {
      console.error('Error updating document template:', error)
      return null
    }
  }

  /**
   * Get all document templates for a user
   */
  static async getDocumentTemplates(userId: string): Promise<DocumentTemplate[]> {
    try {
      const cacheKey = `document_templates_${userId}`

      const data = await DataPersistenceManager.getDataWithCache(
        cacheKey,
        async () => {
          return await PerformanceMonitor.measureAsync(
            'fetch_document_templates',
            async () => {
              console.log('Fetching document templates for user:', userId)

              const { data, error } = await supabase
                .from(this.TABLE_NAME)
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

              if (error) {
                console.error('Error fetching document templates:', error)
                console.error('Error details:', error.message, error.code)
                throw error
              }

              console.log('Found document templates:', data?.length || 0)
              return data || []
            },
            { userId, cached: false }
          )
        },
        5 * 60 * 1000 // 5 minutes cache
      )

      // Transform the data to match our DocumentTemplate interface
      console.log('Raw database data:', data) // Debug all data
      const templates = (data || []).map(item => {
        console.log('Raw database item:', item) // Debug logging
        console.log('Item template_data:', item.template_data)
        console.log('Item template_data schemas:', item.template_data?.schemas)

        const transformedItem = {
          id: item.id,
          name: item.name,
          type: item.type || item.template_data?.type || item.category || 'Document', // Use direct type column first
          signature_type: item.template_data?.signature_type || 'single',
          status: item.template_data?.status || 'incomplete',
          // Try multiple sources for PDF URL
          pdf_url: item.template_data?.pdf_url ||
            item.pdf_url ||
            (item.template_data && typeof item.template_data === 'object' &&
              Object.values(item.template_data).find((val: any) =>
                typeof val === 'string' && val.includes('.pdf'))) || '',
          template_url: item.template_data?.template_url || item.template_url,
          schemas: item.template_data?.schemas || [],
          created_at: item.created_at,
          updated_at: item.updated_at,
          user_id: item.user_id,
          description: item.description,
          template_data: item.template_data,
          category: item.category,
          is_public: item.is_public,
          is_system_template: item.is_system_template,
          usage_count: item.usage_count
        }

        console.log('Transformed item schemas:', transformedItem.schemas)
        console.log('Transformed item status:', transformedItem.status)
        console.log('Transformed item template_url:', transformedItem.template_url)

        // Debug schema types being loaded
        if (transformedItem.schemas && Array.isArray(transformedItem.schemas)) {
          console.log('🔍 SCHEMAS LOADED FROM DATABASE:')
          transformedItem.schemas.forEach((schema: any, index: number) => {
            console.log(`🔍 Loaded Schema ${index}:`, {
              id: schema.id,
              name: schema.name,
              type: schema.type,
              properties: schema.properties
            })
          })
        }

        return transformedItem
      })

      console.log('Transformed templates:', templates)
      return templates
    } catch (error) {
      console.error('Error fetching document templates:', error)
      return []
    }
  }

  /**
   * Get single document template
   */
  static async getDocumentTemplate(documentId: string): Promise<DocumentTemplate | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) {
        console.error('Error fetching document template:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching document template:', error)
      return null
    }
  }

  /**
   * Delete document template and associated files
   */
  static async deleteDocumentTemplate(documentId: string, userId: string): Promise<boolean> {
    try {
      // First get the document to know which files to delete
      const document = await this.getDocumentTemplate(documentId)
      if (!document) return false

      // Delete files from storage
      const filesToDelete = [document.pdf_url]
      if (document.template_url) {
        filesToDelete.push(document.template_url)
      }

      await supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .remove(filesToDelete)

      // Delete database record
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting document template:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting document template:', error)
      return false
    }
  }

  /**
   * Get template JSON from storage
   */
  static async getTemplateJson(templatePath: string): Promise<any | null> {
    try {
      console.log('=== TEMPLATE JSON DOWNLOAD ===')
      console.log('Downloading template from path:', templatePath)
      console.log('Template path type:', typeof templatePath)
      console.log('Template path length:', templatePath.length)
      console.log('Using bucket:', this.TEMPLATES_BUCKET)

      const { data, error } = await supabase.storage
        .from(this.TEMPLATES_BUCKET)
        .download(templatePath)

      if (error) {
        console.error('Storage download error:', error)
        console.error('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error
        })
        return null
      }

      if (!data) {
        console.error('No data returned from storage download')
        return null
      }

      console.log('Download successful, data type:', typeof data)
      console.log('Data size:', data.size)

      const text = await data.text()
      console.log('Template JSON text length:', text.length)
      console.log('Template JSON text preview:', text.substring(0, 200))

      if (!text || text.trim() === '') {
        console.error('Template JSON is empty')
        return null
      }

      let parsed
      try {
        parsed = JSON.parse(text)
        console.log('JSON parsing successful')
        console.log('Parsed template type:', typeof parsed)
        console.log('Parsed template keys:', Object.keys(parsed))

        if (parsed.schemas) {
          console.log('Template has schemas:', Array.isArray(parsed.schemas))
          console.log('Schemas length:', parsed.schemas.length)

          if (Array.isArray(parsed.schemas)) {
            let totalFields = 0
            parsed.schemas.forEach((pageSchemas: any[], pageIndex: number) => {
              if (Array.isArray(pageSchemas)) {
                console.log(`Downloaded template page ${pageIndex}: ${pageSchemas.length} fields`)
                totalFields += pageSchemas.length
              }
            })
            console.log('Total fields in downloaded template:', totalFields)
          }
        } else {
          console.warn('Downloaded template has no schemas property')
        }

        console.log('Parsed template JSON:', parsed)
        console.log('=== END TEMPLATE JSON DOWNLOAD ===')
        return parsed
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError)
        console.error('Text that failed to parse:', text)
        return null
      }
    } catch (error) {
      console.error('=== TEMPLATE JSON DOWNLOAD FAILED ===')
      console.error('Error in getTemplateJson:', error)
      console.error('Template path:', templatePath)
      return null
    }
  }
}

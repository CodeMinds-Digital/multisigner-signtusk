'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { DriveService } from '@/lib/drive-service'
import { DocumentTemplate, Schema } from '@/types/drive'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import { AntdWarningSuppressor } from '@/components/ui/antd-warning-suppressor'

interface DocumentDesignerWrapperProps {
  document: DocumentTemplate
  onBack: () => void
  onDocumentUpdated: (document: DocumentTemplate) => void
}

export function DocumentDesignerWrapper({
  document,
  onBack,
  onDocumentUpdated
}: DocumentDesignerWrapperProps) {
  const { user } = useAuth()
  const designerRef = useRef<HTMLDivElement>(null)
  const designer = useRef<any>(null)
  const isMountedRef = useRef(true)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<any>(null)

  // Get fonts data
  const getFontsData = useCallback(async () => {
    try {
      const pdfmeModule = await import('@codeminds-digital/pdfme-complete')
      const getDefaultFont = (pdfmeModule as any).getDefaultFont
      return getDefaultFont ? getDefaultFont() : {
        NotoSerifJP: {
          data: 'https://fonts.gstatic.com/s/notoserifjp/v7/k3kCo84MPvpLmixcA63oeAL7Iqp5JYXV.woff2',
          fallback: true,
        },
      }
    } catch {
      console.warn('Could not load default font, using fallback')
      return {
        NotoSerifJP: {
          data: 'https://fonts.gstatic.com/s/notoserifjp/v7/k3kCo84MPvpLmixcA63oeAL7Iqp5JYXV.woff2',
          fallback: true,
        },
      }
    }
  }, [])

  // Build designer
  const buildDesigner = useCallback(async () => {
    if (!designerRef.current || !isMountedRef.current) return

    try {
      setIsLoading(true)
      console.log('Building designer with document:', document)
      console.log('Document schemas from database:', document.schemas)
      console.log('Document schemas length:', document.schemas?.length)

      // COMPREHENSIVE CACHE CLEARING AND CLEANUP
      console.log('=== STARTING COMPREHENSIVE CACHE CLEARING ===')

      // 0. Clear all caches and force fresh template loading
      console.log('🧹 Clearing all caches and forcing fresh template load...')

      // Clear browser caches
      if (typeof window !== 'undefined') {
        // Clear any cached template data
        if ((window as any).templateCache) {
          console.log('🧹 Clearing window template cache...')
          delete (window as any).templateCache
        }

        // Clear any PDFme internal caches
        if ((window as any).pdfme) {
          console.log('🧹 Clearing PDFme global state...')
          delete (window as any).pdfme
        }

        // Clear localStorage/sessionStorage template caches
        try {
          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('template') || key.includes('pdfme') || key.includes('designer'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => {
            console.log('🧹 Clearing localStorage key:', key)
            localStorage.removeItem(key)
          })

          // Clear sessionStorage as well
          const sessionKeysToRemove = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && (key.includes('template') || key.includes('pdfme') || key.includes('designer'))) {
              sessionKeysToRemove.push(key)
            }
          }
          sessionKeysToRemove.forEach(key => {
            console.log('🧹 Clearing sessionStorage key:', key)
            sessionStorage.removeItem(key)
          })
        } catch (e) {
          console.warn('Could not clear localStorage/sessionStorage:', e)
        }

        // Clear any fetch caches for template URLs
        if ('caches' in window) {
          try {
            caches.keys().then(names => {
              names.forEach(name => {
                if (name.includes('template') || name.includes('api')) {
                  console.log('🧹 Clearing cache:', name)
                  caches.delete(name)
                }
              })
            })
          } catch (e) {
            console.warn('Could not clear caches:', e)
          }
        }
      }

      // Clear React component state
      console.log('🧹 Clearing React component state...')
      setTemplate(null)

      // Force refresh document data to get latest template_url
      console.log('🔄 Refreshing document data to ensure latest template_url...')
      try {
        const refreshedDoc = await DriveService.getDocumentTemplate(document.id)
        if (refreshedDoc && refreshedDoc.template_url !== document.template_url) {
          console.log('🔄 Document template_url updated:', {
            old: document.template_url,
            new: refreshedDoc.template_url
          })
          // Update the document reference for this session
          document.template_url = refreshedDoc.template_url
        }
      } catch (e) {
        console.warn('Could not refresh document data:', e)
      }

      // Force garbage collection if available (development only)
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc()
          console.log('🧹 Forced garbage collection')
        } catch (e) {
          console.error('Garbage collection failed:', e)
        }
      }

      // 1. Destroy existing designer if it exists
      if (designer.current) {
        console.log('Destroying existing designer instance...')
        try {
          // For React 18+, skip the problematic destroy method entirely
          if (typeof (window as any).React?.unmountComponentAtNode === 'undefined') {
            console.log('React 18+ detected, using safe cleanup method during rebuild')

            // Manual cleanup approach for React 18+
            if (designerRef.current) {
              designerRef.current.innerHTML = ''
            }
            designer.current = null
          } else {
            // For older React versions, try the normal destroy method
            designer.current.destroy()
            designer.current = null
          }
        } catch (e) {
          console.warn('Error destroying existing designer:', e)
          // Force cleanup even if destroy fails
          if (designerRef.current) {
            designerRef.current.innerHTML = ''
          }
          designer.current = null
        }
      }

      // 2. Clear the container completely multiple times to ensure cleanup
      if (designerRef.current) {
        console.log('Clearing DOM container completely...')
        designerRef.current.innerHTML = ''
        // Force reflow
        void designerRef.current.offsetHeight;
        designerRef.current.innerHTML = ''
      }

      // 3. Clear React state
      console.log('Clearing React template state...')
      setTemplate(null)

      // 4. Clear any potential PDFme caches
      console.log('Clearing potential PDFme caches...')
      if (typeof window !== 'undefined') {
        // Clear any global PDFme state if it exists
        if ((window as any).pdfme) {
          console.log('Clearing global PDFme state...')
          delete (window as any).pdfme
        }

        // Force garbage collection if available (dev mode)
        if ((window as any).gc) {
          console.log('Running garbage collection...')
            ; (window as any).gc()
        }
      }

      // 5. Wait for cleanup to complete
      console.log('Waiting for cleanup to complete...')
      await new Promise(resolve => setTimeout(resolve, 200))

      console.log('=== CACHE CLEARING COMPLETE, STARTING FRESH ===')

      // Check if component is still mounted after cleanup
      if (!isMountedRef.current) {
        console.log('Component unmounted during cleanup, aborting')
        return
      }

      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 150))

      // Check if component is still mounted after delay
      if (!designerRef.current || !isMountedRef.current) return

      // Get PDF URL for the template
      console.log('Document pdf_url:', document.pdf_url)
      console.log('Document template_data:', document.template_data)
      console.log('Document status:', document.status)

      // Try to get PDF URL from multiple possible locations
      const pdfPath = document.pdf_url ||
        document.template_data?.pdf_url ||
        (document.template_data && typeof document.template_data === 'object' &&
          Object.values(document.template_data).find((val: any) =>
            typeof val === 'string' && val.includes('.pdf')))

      console.log('PDF path to use:', pdfPath)

      if (!pdfPath) {
        console.error('No PDF path found. Document structure:', {
          pdf_url: document.pdf_url,
          template_data: document.template_data,
          status: document.status,
          id: document.id
        })
        throw new Error('No PDF path found in document')
      }

      const pdfUrl = await DriveService.getDocumentUrl(pdfPath)
      console.log('Generated PDF URL:', pdfUrl)
      if (!pdfUrl) {
        throw new Error('Unable to load PDF document')
      }

      // Create initial template with correct PDFme structure
      console.log('Creating initial template...')
      console.log('Document schemas available:', document.schemas)
      console.log('Schemas length check:', document.schemas?.length)

      // Convert our database schemas back to PDFme format
      let pdfmeSchemas = [[]] // Start with empty page 0

      if (document.schemas && document.schemas.length > 0) {
        console.log('Converting database schemas to PDFme format...')

        // Group schemas by page
        const schemasByPage: { [page: number]: any[] } = {}

        document.schemas.forEach(schema => {
          console.log('Processing schema:', schema)
          const pageIndex = schema.position?.page || 0

          if (!schemasByPage[pageIndex]) {
            schemasByPage[pageIndex] = []
          }

          // Convert to PDFme field format
          const pdfmeField = {
            name: schema.name,
            type: schema.type,
            content: schema.properties?.placeholder || schema.properties?.text || '',
            position: {
              x: schema.position?.x || 0,
              y: schema.position?.y || 0
            },
            width: schema.position?.width || 100,
            height: schema.position?.height || 20,
            required: schema.properties?.required || false,

            // Include all PDFme-specific properties
            fontSize: schema.properties?.fontSize || 13,
            fontColor: schema.properties?.fontColor || '#000000',
            fontName: schema.properties?.fontName || 'Roboto',
            alignment: schema.properties?.alignment || 'left',
            backgroundColor: schema.properties?.backgroundColor || '',
            format: schema.properties?.format || '',
            rotate: schema.properties?.rotate || 0,
            characterSpacing: schema.properties?.characterSpacing || 0,
            locale: schema.properties?.locale || 'en',
            opacity: schema.properties?.opacity || 1,

            // If we have the original config, use it
            ...(schema.properties?._originalConfig || {})
          }

          console.log('Converted schema to PDFme field:', pdfmeField)

          schemasByPage[pageIndex].push(pdfmeField)
        })

        // Convert to PDFme array format (ensure we have arrays for each page)
        const maxPage = Math.max(...Object.keys(schemasByPage).map(Number))
        pdfmeSchemas = []

        for (let i = 0; i <= maxPage; i++) {
          (pdfmeSchemas as any)[i] = schemasByPage[i] || []
        }

        console.log('Converted schemas by page:', schemasByPage)
        console.log('Final PDFme schemas:', pdfmeSchemas)
      }

      // PRIORITIZE TEMPLATE JSON OVER DATABASE SCHEMAS
      console.log('=== TEMPLATE LOADING STRATEGY ===')
      console.log('Document template_url:', document.template_url)
      console.log('Document status:', document.status)

      let initialTemplate: any = null
      let templateSource = 'none'

      // STRATEGY 1: Try to load from template JSON first (highest priority)
      if (document.template_url) {
        try {
          console.log('STRATEGY 1: 🔄 FORCE LOADING fresh template from:', document.template_url)
          console.log('🔄 Cache cleared, loading fresh template data...')

          // Force fresh template loading (cache already cleared above)
          const existingTemplate = await DriveService.getTemplateJson(document.template_url)
          console.log('Loaded existing template:', existingTemplate)
          console.log('Existing template type:', typeof existingTemplate)
          console.log('Existing template keys:', existingTemplate ? Object.keys(existingTemplate) : 'none')
          console.log('Existing template schemas:', existingTemplate?.schemas)
          console.log('Existing template signers:', existingTemplate?.signers)
          console.log('Existing template multiSignature:', existingTemplate?.multiSignature)

          if (existingTemplate && existingTemplate.schemas && Array.isArray(existingTemplate.schemas)) {
            // Count fields in template JSON
            let templateFieldCount = 0
            existingTemplate.schemas.forEach((pageSchemas: any[], _pageIndex: number) => {
              if (Array.isArray(pageSchemas)) {
                console.log(`Template JSON page ${_pageIndex} has ${pageSchemas.length} fields:`, pageSchemas)
                templateFieldCount += pageSchemas.length
              }
            })

            if (templateFieldCount > 0) {
              // Handle legacy templates that don't have signers
              console.log('🔍 DEBUGGING SIGNER ASSIGNMENT:')
              console.log('🔍 existingTemplate.signers:', existingTemplate.signers)
              console.log('🔍 existingTemplate.signers type:', typeof existingTemplate.signers)
              console.log('🔍 existingTemplate.signers is array:', Array.isArray(existingTemplate.signers))
              console.log('🔍 existingTemplate.signers length:', existingTemplate.signers?.length)
              console.log('🔍 existingTemplate.multiSignature:', existingTemplate.multiSignature)

              let templateSigners = existingTemplate.signers || []
              let isMultiSignature = existingTemplate.multiSignature || false

              console.log('🔍 AFTER ASSIGNMENT:')
              console.log('🔍 templateSigners:', templateSigners)
              console.log('🔍 templateSigners type:', typeof templateSigners)
              console.log('🔍 templateSigners is array:', Array.isArray(templateSigners))
              console.log('🔍 templateSigners length:', templateSigners?.length)
              console.log('🔍 isMultiSignature:', isMultiSignature)

              // If no signers in template, generate them from signature fields in schemas
              if (!templateSigners || templateSigners.length === 0) {
                console.log('🔄 Legacy template detected - generating signers from schemas')
                const signatureFields = new Set<string>()

                // Extract unique signer IDs from signature fields
                existingTemplate.schemas.forEach((pageSchemas: any[], _pageIndex: number) => {
                  if (Array.isArray(pageSchemas)) {
                    pageSchemas.forEach((field: any) => {
                      if (field.type === 'signature' && field.signerId) {
                        signatureFields.add(field.signerId)
                      }
                    })
                  }
                })

                // Generate signer objects from unique signer IDs
                templateSigners = Array.from(signatureFields).map((signerId, index) => ({
                  id: signerId,
                  name: `Signer ${index + 1}`,
                  email: '',
                  role: '',
                  color: index === 0 ? '#1890ff' : index === 1 ? '#52c41a' : `#${Math.floor(Math.random() * 16777215).toString(16)}`
                }))

                // Set multiSignature based on number of signers or document type
                isMultiSignature = templateSigners.length > 1 ||
                  existingTemplate.metadata?.signature_type === 'multi' ||
                  document.signature_type === 'multi'

                console.log('🔄 Generated signers from schemas:', templateSigners)
                console.log('🔄 Detected multiSignature mode:', isMultiSignature)
              }

              // ✅ CRITICAL: Use complete template structure including signers
              // Always use fresh PDF URL to avoid JWT expiration issues
              console.log('🔄 Using fresh PDF URL instead of cached basePdf')
              console.log('🔄 Fresh PDF URL:', pdfUrl)
              console.log('🔄 Cached basePdf URL:', existingTemplate.basePdf)

              console.log('🔍 CREATING INITIAL TEMPLATE:')
              console.log('🔍 templateSigners before assignment:', templateSigners)
              console.log('🔍 isMultiSignature before assignment:', isMultiSignature)

              initialTemplate = {
                basePdf: pdfUrl, // Always use fresh signed URL to avoid JWT expiration
                schemas: existingTemplate.schemas,
                // ✅ Preserve or generate signers array for dropdown population
                signers: templateSigners,
                // ✅ Preserve or determine multiSignature flag
                multiSignature: isMultiSignature,
                // Preserve metadata
                metadata: existingTemplate.metadata
              }

              console.log('🔍 AFTER CREATING INITIAL TEMPLATE:')
              console.log('🔍 initialTemplate.signers:', initialTemplate.signers)
              console.log('🔍 initialTemplate.multiSignature:', initialTemplate.multiSignature)
              console.log('🔍 initialTemplate keys:', Object.keys(initialTemplate))

              templateSource = 'template_json'
              console.log('✅ SUCCESS: Using template with signers:', templateSigners)
              console.log('✅ MultiSignature mode:', isMultiSignature)
              console.log('Template JSON schemas structure:', JSON.stringify(existingTemplate.schemas, null, 2))
            } else {
              console.warn('Template JSON has empty schemas, falling back to database')
            }
          } else {
            console.warn('Template JSON invalid or missing schemas, falling back to database')
          }
        } catch (e) {
          console.error('Failed to load template JSON, falling back to database:', e)
        }
      } else {
        console.log('No template_url found, will use database schemas')
      }

      // STRATEGY 2: Fallback to database schemas if template JSON failed
      if (!initialTemplate) {
        console.log('🔄 STRATEGY 2: Using database schemas as fallback')
        console.log('🔄 STRATEGY 2: Database schemas count:', document.schemas?.length || 0)
        console.log('🔄 STRATEGY 2: Converted PDFme schemas:', pdfmeSchemas)
        console.log('🔄 STRATEGY 2: This will NOT include signers - this might be the problem!')

        // Count fields in database schemas
        let dbFieldCount = 0
        if (Array.isArray(pdfmeSchemas)) {
          pdfmeSchemas.forEach((pageSchemas, _pageIndex) => {
            if (Array.isArray(pageSchemas)) {
              console.log(`Database page ${_pageIndex} has ${pageSchemas.length} fields:`, pageSchemas)
              dbFieldCount += pageSchemas.length
            }
          })
        }

        // Generate signers from signature fields in database schemas
        console.log('🔄 STRATEGY 2: Generating signers from database schemas...')
        const dbSignatureFields = new Set<string>()

        if (Array.isArray(pdfmeSchemas)) {
          pdfmeSchemas.forEach((pageSchemas: any[], _unusedPageIndex: number) => {
            if (Array.isArray(pageSchemas)) {
              pageSchemas.forEach((field: any) => {
                if (field.type === 'signature' && field.signerId) {
                  dbSignatureFields.add(field.signerId)
                }
              })
            }
          })
        }

        const dbSigners = Array.from(dbSignatureFields).map((signerId, index) => ({
          id: signerId,
          name: `Signer ${index + 1}`,
          email: '',
          role: '',
          color: index === 0 ? '#1890ff' : index === 1 ? '#52c41a' : `#${Math.floor(Math.random() * 16777215).toString(16)}`
        }))

        const dbMultiSignature = dbSigners.length > 1 || document.signature_type === 'multi'

        console.log('🔄 STRATEGY 2: Generated signers from database:', dbSigners)
        console.log('🔄 STRATEGY 2: MultiSignature mode:', dbMultiSignature)

        initialTemplate = {
          basePdf: pdfUrl,
          schemas: pdfmeSchemas,
          signers: dbSigners,
          multiSignature: dbMultiSignature
        }
        templateSource = 'database'
        console.log('Using database schemas with', dbFieldCount, 'fields and', dbSigners.length, 'signers')
      }

      // STRATEGY 3: Final fallback - empty template
      if (!initialTemplate) {
        console.log('STRATEGY 3: Creating empty template as final fallback')
        initialTemplate = {
          basePdf: pdfUrl,
          schemas: [[]] // Empty schema array
        }
        templateSource = 'empty'
      }

      console.log('=== FINAL TEMPLATE RESULT ===')
      console.log('Template source:', templateSource)
      console.log('Final template:', initialTemplate)
      console.log('Final template schemas:', initialTemplate.schemas)
      console.log('Final template schemas length:', initialTemplate.schemas?.length)
      console.log('🔍 CRITICAL: Final template signers:', initialTemplate.signers)
      console.log('🔍 CRITICAL: Final template multiSignature:', initialTemplate.multiSignature)
      console.log('🔍 CRITICAL: Final template keys:', Object.keys(initialTemplate))

      // Count total fields in final template
      let totalFields = 0
      if (Array.isArray(initialTemplate.schemas)) {
        initialTemplate.schemas.forEach((pageSchemas: any[], pageIndex: number) => {
          if (Array.isArray(pageSchemas)) {
            console.log(`Final page ${pageIndex} has ${pageSchemas.length} fields:`, pageSchemas)
            totalFields += pageSchemas.length
          }
        })
      }
      console.log('Total fields to load in designer:', totalFields)
      console.log('=== END TEMPLATE LOADING ===')

      if (totalFields === 0) {
        console.warn('⚠️ WARNING: No fields found in final template! This might indicate a loading issue.')
      }

      // Import Designer dynamically
      const pdfmeModule = await import('@codeminds-digital/pdfme-complete')
      const Designer = (pdfmeModule as any).Designer
      const builtInPlugins = (pdfmeModule as any).builtInPlugins

      if (!Designer) {
        throw new Error('Designer component not available in this environment')
      }

      // Final check before creating Designer
      if (!isMountedRef.current || !designerRef.current) {
        console.log('Component unmounted during Designer creation, aborting')
        return
      }

      // Validate template one more time
      if (!initialTemplate || !initialTemplate.basePdf || !initialTemplate.schemas) {
        console.error('Invalid template structure:', initialTemplate)
        throw new Error('Template is missing required properties (basePdf or schemas)')
      }

      // Final template validation before passing to Designer
      console.log('=== FINAL TEMPLATE VALIDATION BEFORE DESIGNER ===')
      console.log('Template structure:', JSON.stringify(initialTemplate, null, 2))
      console.log('Template basePdf:', initialTemplate.basePdf ? 'Present' : 'Missing')
      console.log('Template schemas:', initialTemplate.schemas)
      console.log('Template schemas length:', initialTemplate.schemas?.length)

      // Count and validate each field
      let finalFieldCount = 0
      if (Array.isArray(initialTemplate.schemas)) {
        initialTemplate.schemas.forEach((pageSchemas: any, pageIndex: number) => {
          console.log(`Final validation - Page ${pageIndex}:`, pageSchemas)
          if (Array.isArray(pageSchemas)) {
            console.log(`  - Page ${pageIndex} has ${pageSchemas.length} fields`)
            pageSchemas.forEach((field, fieldIndex) => {
              console.log(`  - Field ${fieldIndex}:`, {
                name: field.name,
                type: field.type,
                content: field.content || field.text,
                position: field.position,
                width: field.width,
                height: field.height
              })
              finalFieldCount++
            })
          }
        })
      }
      console.log('Total fields being passed to Designer:', finalFieldCount)
      console.log('=== END TEMPLATE VALIDATION ===')

      // Get fonts data
      const fontsData = await getFontsData()

      console.log('Creating PDFme Designer with template...')

      // Create a deep copy of the template to avoid any reference issues
      const templateCopy = JSON.parse(JSON.stringify(initialTemplate))
      console.log('Template copy for Designer:', templateCopy)
      console.log('Template copy schemas:', templateCopy.schemas)
      console.log('🔍 Template copy signers:', templateCopy.signers)
      console.log('🔍 Template copy multiSignature:', templateCopy.multiSignature)
      console.log('🔍 Template copy keys:', Object.keys(templateCopy))

      // Validate signers structure
      if (templateCopy.signers && Array.isArray(templateCopy.signers)) {
        console.log('✅ Template copy has valid signers array with', templateCopy.signers.length, 'signers')
        templateCopy.signers.forEach((signer: any, index: number) => {
          console.log(`✅ Signer ${index}:`, {
            id: signer.id,
            name: signer.name,
            email: signer.email,
            role: signer.role,
            color: signer.color
          })
        })
      } else {
        console.warn('❌ Template copy signers is not a valid array:', templateCopy.signers)
      }

      // Validate each field in the template copy
      if (Array.isArray(templateCopy.schemas)) {
        templateCopy.schemas.forEach((pageSchemas: any, pageIndex: number) => {
          if (Array.isArray(pageSchemas)) {
            console.log(`Template copy page ${pageIndex} has ${pageSchemas.length} fields:`)
            pageSchemas.forEach((field, fieldIndex) => {
              console.log(`  Field ${fieldIndex}:`, {
                name: field.name,
                type: field.type,
                content: field.content,
                position: field.position,
                width: field.width,
                height: field.height,
                allKeys: Object.keys(field)
              })

              // Check for any invalid values that might cause PDFme to reject the field
              if (!field.name || !field.type || !field.position) {
                console.error(`INVALID FIELD ${fieldIndex}:`, {
                  hasName: !!field.name,
                  hasType: !!field.type,
                  hasPosition: !!field.position,
                  field: field
                })
              }

              // COMPREHENSIVE FIELD TYPE VALIDATION AND FIXING
              console.log(`Validating and fixing field ${fieldIndex} of type "${field.type}"`)

              // Fix field based on type
              switch (field.type) {
                case 'text':
                  // Text fields need content property
                  if (!field.content && !field.text) {
                    console.log(`Fixing text field ${fieldIndex}: adding default content`)
                    field.content = field.content || field.text || 'Text Field'
                  }
                  // Ensure required text properties
                  field.fontSize = field.fontSize || 13
                  field.fontColor = field.fontColor || '#000000'
                  field.fontName = field.fontName || 'Roboto'
                  field.alignment = field.alignment || 'left'
                  break

                case 'multiVariableText':
                  console.log(`Fixing multiVariableText field ${fieldIndex}`)
                  console.log('multiVariableText field before fix:', field)

                  // multiVariableText needs text property, not content for display
                  if (!field.text) {
                    field.text = field.text || 'Variable Text {variable}'
                  }

                  // Ensure variables array exists
                  field.variables = field.variables || []

                  // Ensure content exists (this stores the variable values)
                  if (!field.content || field.content === '{}') {
                    field.content = '{}'
                  }

                  // Standard text properties
                  field.fontSize = field.fontSize || 13
                  field.fontColor = field.fontColor || '#000000'
                  field.fontName = field.fontName || 'Roboto'
                  field.alignment = field.alignment || 'left'

                  console.log('multiVariableText field after fix:', field)
                  break

                case 'signature':
                  console.log(`Fixing signature field ${fieldIndex}`)
                  // Signature fields need specific properties
                  field.content = field.content || ''
                  field.fontSize = field.fontSize || 13
                  break

                case 'dateTime':
                  console.log(`Fixing dateTime field ${fieldIndex}`)
                  // DateTime fields need format and content
                  field.format = field.format || 'MM/dd/yyyy'
                  field.content = field.content || new Date().toLocaleDateString()
                  field.fontSize = field.fontSize || 13
                  field.fontColor = field.fontColor || '#000000'
                  field.fontName = field.fontName || 'Roboto'
                  break

                case 'select':
                case 'dropdown':
                  console.log(`Fixing select/dropdown field ${fieldIndex}`)
                  // Select fields need options array
                  field.options = field.options || ['Option 1', 'Option 2']
                  field.content = field.content || field.options[0] || ''
                  field.fontSize = field.fontSize || 13
                  break

                case 'checkbox':
                  console.log(`Fixing checkbox field ${fieldIndex}`)
                  // Checkbox fields need boolean content
                  field.content = field.content !== undefined ? field.content : false
                  break

                case 'radio':
                  console.log(`Fixing radio field ${fieldIndex}`)
                  // Radio fields need options and selected value
                  field.options = field.options || ['Option 1', 'Option 2']
                  field.content = field.content || field.options[0] || ''
                  break

                case 'image':
                  console.log(`Fixing image field ${fieldIndex}`)
                  // Image fields need content (base64 or URL)
                  field.content = field.content || ''
                  break

                case 'qr':
                case 'qrcode':
                case 'QR':
                  console.log(`Fixing QR code field ${fieldIndex}`)
                  // QR code fields need content (the data to encode)
                  field.content = field.content || field.text || 'https://example.com'
                  // QR codes might need specific properties
                  field.qrType = field.qrType || 'url' // url, text, email, phone, etc.
                  field.errorCorrectionLevel = field.errorCorrectionLevel || 'M' // L, M, Q, H
                  field.margin = field.margin !== undefined ? field.margin : 4
                  field.scale = field.scale || 4
                  // Ensure QR codes have square dimensions by default
                  if (!field.width || !field.height) {
                    field.width = field.width || field.height || 50
                    field.height = field.height || field.width || 50
                  }
                  break

                case 'barcode':
                  console.log(`Fixing barcode field ${fieldIndex}`)
                  // Barcode fields need content and format
                  field.content = field.content || field.text || '123456789'
                  field.barcodeType = field.barcodeType || 'CODE128' // CODE128, CODE39, EAN13, etc.
                  field.displayValue = field.displayValue !== undefined ? field.displayValue : true
                  field.fontSize = field.fontSize || 10
                  break

                case 'line':
                  console.log(`Fixing line field ${fieldIndex}`)
                  // Line fields need start and end points
                  field.content = field.content || ''
                  field.lineWidth = field.lineWidth || 1
                  field.lineColor = field.lineColor || '#000000'
                  field.lineStyle = field.lineStyle || 'solid' // solid, dashed, dotted
                  break

                case 'rectangle':
                case 'rect':
                  console.log(`Fixing rectangle field ${fieldIndex}`)
                  // Rectangle fields for shapes
                  field.content = field.content || ''
                  field.borderWidth = field.borderWidth || 1
                  field.borderColor = field.borderColor || '#000000'
                  field.fillColor = field.fillColor || 'transparent'
                  break

                case 'table':
                  console.log(`Fixing table field ${fieldIndex}`)
                  // Table fields need rows and columns
                  field.content = field.content || ''
                  field.rows = field.rows || 3
                  field.columns = field.columns || 3
                  field.cellPadding = field.cellPadding || 2
                  field.borderWidth = field.borderWidth || 1
                  field.fontSize = field.fontSize || 10
                  break

                default:
                  console.warn(`Unknown field type "${field.type}" for field ${fieldIndex}`)
                  // For unknown types, ensure basic properties
                  field.content = field.content || field.text || ''
                  field.fontSize = field.fontSize || 13
                  break
              }

              // Ensure all fields have required base properties
              field.position = field.position || { x: 0, y: 0 }
              field.width = field.width || 100
              field.height = field.height || 20
              field.rotate = field.rotate || 0
              field.opacity = field.opacity !== undefined ? field.opacity : 1
              field.required = field.required !== undefined ? field.required : false

              // ADDITIONAL QR CODE VALIDATION
              if (field.type === 'qr' || field.type === 'qrcode' || field.type === 'QR') {
                // Validate QR content is not empty or invalid
                if (!field.content || field.content === '{}' || field.content === '') {
                  console.warn(`QR field ${fieldIndex} has empty content, setting default`)
                  field.content = 'https://example.com'
                }

                // Validate QR content length (QR codes have limits)
                if (field.content.length > 2000) {
                  console.warn(`QR field ${fieldIndex} content too long (${field.content.length} chars), truncating`)
                  field.content = field.content.substring(0, 2000)
                }

                // Ensure QR codes are square (common requirement)
                if (Math.abs(field.width - field.height) > 5) {
                  console.warn(`QR field ${fieldIndex} is not square, making it square`)
                  const size = Math.max(field.width, field.height)
                  field.width = size
                  field.height = size
                }

                console.log(`QR field ${fieldIndex} validated:`, {
                  content: field.content,
                  contentLength: field.content.length,
                  size: `${field.width}x${field.height}`,
                  qrType: field.qrType,
                  errorCorrectionLevel: field.errorCorrectionLevel
                })
              }

              console.log(`Field ${fieldIndex} after fixing:`, {
                name: field.name,
                type: field.type,
                content: field.content,
                text: field.text,
                position: field.position,
                width: field.width,
                height: field.height,
                // Show QR-specific properties if it's a QR field
                ...(field.type === 'qr' || field.type === 'qrcode' || field.type === 'QR' ? {
                  qrType: field.qrType,
                  errorCorrectionLevel: field.errorCorrectionLevel,
                  margin: field.margin,
                  scale: field.scale
                } : {})
              })

              // POSITION AND SIZE VALIDATION AND FIXING

              // Fix negative positions
              if (field.position.x < 0) {
                console.warn(`Field ${fieldIndex} has negative X position (${field.position.x}), fixing to 0`)
                field.position.x = 0
              }
              if (field.position.y < 0) {
                console.warn(`Field ${fieldIndex} has negative Y position (${field.position.y}), fixing to 0`)
                field.position.y = 0
              }

              // Fix invalid sizes
              if (field.width <= 0) {
                console.warn(`Field ${fieldIndex} has invalid width (${field.width}), fixing to 100`)
                field.width = 100
              }
              if (field.height <= 0) {
                console.warn(`Field ${fieldIndex} has invalid height (${field.height}), fixing to 20`)
                field.height = 20
              }

              // Check for extremely large positions that might be outside PDF bounds
              if (field.position.x > 1000) {
                console.warn(`Field ${fieldIndex} has very large X position (${field.position.x}), might be outside PDF`)
              }
              if (field.position.y > 1000) {
                console.warn(`Field ${fieldIndex} has very large Y position (${field.position.y}), might be outside PDF`)
              }

              // Check for overlapping fields (same position)
              const otherFields = pageSchemas.filter((_, idx) => idx !== fieldIndex)
              const overlapping = otherFields.find(other =>
                other.position &&
                Math.abs(other.position.x - field.position.x) < 5 &&
                Math.abs(other.position.y - field.position.y) < 5
              )
              if (overlapping) {
                console.warn(`Field ${fieldIndex} might be overlapping with another field:`, {
                  thisField: { name: field.name, position: field.position },
                  otherField: { name: overlapping.name, position: overlapping.position }
                })
              }
            })
          }
        })
      }

      // Final validation before creating Designer
      console.log('🔍 FINAL TEMPLATE VALIDATION before Designer creation:')
      console.log('🔍 Template has signers:', !!templateCopy.signers)
      console.log('🔍 Template signers count:', templateCopy.signers?.length || 0)
      console.log('🔍 Template multiSignature:', templateCopy.multiSignature)
      console.log('🔍 Template structure keys:', Object.keys(templateCopy))

      // Ensure signers are properly structured
      if (templateCopy.signers && Array.isArray(templateCopy.signers) && templateCopy.signers.length > 0) {
        console.log('✅ Template has valid signers array for Designer creation')
      } else {
        console.warn('❌ Template does not have valid signers for Designer creation')
      }

      designer.current = new Designer({
        domContainer: designerRef.current,
        template: templateCopy,
        plugins: builtInPlugins,
        options: {
          font: fontsData,
          lang: 'en',
          theme: {
            token: { colorPrimary: '#25c2a0' },
          },
        },
      })

      // Only set up callbacks if component is still mounted
      if (isMountedRef.current && designer.current) {
        designer.current.onSaveTemplate(onSaveTemplate)

        // Verify Designer was created with correct template
        console.log('Designer created successfully, verifying template...')
        try {
          const designerTemplate = designer.current.getTemplate()
          console.log('Designer template after creation:', designerTemplate)
          console.log('Designer template schemas:', designerTemplate.schemas)
          console.log('🔍 Designer template signers:', designerTemplate.signers)
          console.log('🔍 Designer template multiSignature:', designerTemplate.multiSignature)
          console.log('🔍 Designer template keys:', Object.keys(designerTemplate))

          // Try to access internal Designer state for debugging
          try {
            if (designer.current && (designer.current as any)._reactInternalInstance) {
              console.log('🔍 Attempting to access Designer internal state...')
              // This is for debugging only - not recommended for production
            }

            // Check if there's a way to access the signer state
            if (designerRef.current) {
              const signerElements = designerRef.current.querySelectorAll('[data-testid*="signer"], .signer-selector, .ant-select')
              console.log('🔍 Found signer-related DOM elements:', signerElements.length)
              signerElements.forEach((el, index) => {
                console.log(`🔍 Signer element ${index}:`, el.className, el.textContent)
              })
            }
          } catch (debugError) {
            console.log('🔍 Could not access Designer internal state (this is normal):', (debugError as Error).message)
          }

          let designerFieldCount = 0
          const designerFields: any[] = []

          if (Array.isArray(designerTemplate.schemas)) {
            designerTemplate.schemas.forEach((pageSchemas: any, pageIndex: number) => {
              if (Array.isArray(pageSchemas)) {
                console.log(`Designer page ${pageIndex} has ${pageSchemas.length} fields`)
                pageSchemas.forEach((field, fieldIndex) => {
                  console.log(`  Designer field ${fieldIndex}:`, {
                    name: field.name,
                    type: field.type,
                    content: field.content,
                    position: field.position
                  })
                  designerFields.push(field)
                })
                designerFieldCount += pageSchemas.length
              }
            })
          }
          console.log('Designer is showing', designerFieldCount, 'fields total')

          // Compare with expected count from initial template
          let expectedFieldCount = 0
          const expectedFields: any[] = []

          if (Array.isArray(templateCopy.schemas)) {
            templateCopy.schemas.forEach((pageSchemas: any) => {
              if (Array.isArray(pageSchemas)) {
                pageSchemas.forEach(field => {
                  expectedFields.push(field)
                })
                expectedFieldCount += pageSchemas.length
              }
            })
          }

          console.log('=== FIELD COMPARISON ===')
          console.log('Expected fields:', expectedFields.map(f => ({ name: f.name, type: f.type })))
          console.log('Designer fields:', designerFields.map(f => ({ name: f.name, type: f.type })))

          if (designerFieldCount !== expectedFieldCount) {
            console.warn(`MISMATCH: Expected ${expectedFieldCount} fields but Designer has ${designerFieldCount}`)

            // Find missing fields
            const expectedNames = expectedFields.map(f => f.name)
            const designerNames = designerFields.map(f => f.name)
            const missingFields = expectedNames.filter(name => !designerNames.includes(name))
            const extraFields = designerNames.filter(name => !expectedNames.includes(name))

            if (missingFields.length > 0) {
              console.error('Missing fields in Designer:', missingFields)
              missingFields.forEach(name => {
                const field = expectedFields.find(f => f.name === name)
                console.error(`Missing field "${name}":`, field)
              })
            }

            if (extraFields.length > 0) {
              console.warn('Extra fields in Designer:', extraFields)
            }
          } else {
            console.log('✅ SUCCESS: All fields loaded correctly in Designer')
          }
        } catch (e) {
          console.warn('Could not get template from designer after creation:', e)
        }

        // Set template state with complete structure including signers
        console.log('🔄 Setting template state with signers:', initialTemplate.signers)
        setTemplate(initialTemplate)

        // Force update the Designer with complete template after a short delay
        setTimeout(() => {
          if (designer.current && isMountedRef.current) {
            try {
              console.log('🔄 Force updating Designer with complete template including signers...')
              console.log('🔄 Template to force update:', initialTemplate)
              console.log('🔄 Template signers to force update:', initialTemplate.signers)
              designer.current.updateTemplate(initialTemplate)

              // Verify the update worked
              setTimeout(() => {
                if (designer.current) {
                  const updatedTemplate = designer.current.getTemplate()
                  console.log('✅ Designer template after force update:', updatedTemplate)
                  console.log('✅ Designer signers after force update:', updatedTemplate.signers)
                }
              }, 50)
            } catch (e) {
              console.warn('Could not force update Designer template:', e)
            }
          }
        }, 500) // Increased delay to ensure Designer is fully initialized

        // Additional force update with even longer delay to override any default initialization
        setTimeout(() => {
          if (designer.current && isMountedRef.current && initialTemplate.signers?.length > 1) {
            try {
              console.log('🔄 SECOND force update to ensure signers are preserved...')
              designer.current.updateTemplate(initialTemplate)
              console.log('✅ SECOND force update completed')

              // Verify signers are actually set in the Designer
              setTimeout(() => {
                if (designer.current) {
                  const finalTemplate = designer.current.getTemplate()
                  console.log('🔍 FINAL verification - Designer template signers:', finalTemplate.signers)
                  console.log('🔍 FINAL verification - Designer template multiSignature:', finalTemplate.multiSignature)

                  if (!finalTemplate.signers || finalTemplate.signers.length < 2) {
                    console.warn('❌ CRITICAL: Designer still does not have correct signers after force updates!')
                    console.warn('❌ Expected signers:', initialTemplate.signers)
                    console.warn('❌ Actual signers:', finalTemplate.signers)

                    // Last resort: Try one more time with a complete template rebuild
                    try {
                      console.log('🔄 LAST RESORT: Rebuilding template with signers...')
                      const rebuiltTemplate = {
                        ...finalTemplate,
                        signers: initialTemplate.signers,
                        multiSignature: initialTemplate.multiSignature
                      }
                      designer.current.updateTemplate(rebuiltTemplate)
                      console.log('✅ LAST RESORT update completed')
                    } catch (lastResortError) {
                      console.error('❌ Last resort update failed:', lastResortError)
                    }
                  } else {
                    console.log('✅ SUCCESS: Designer has correct signers!')
                  }
                }
              }, 200)
            } catch (e) {
              console.warn('Could not perform second force update:', e)
            }
          }
        }, 1000)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error building designer:', error)
      setIsLoading(false)
    }
  }, [document, getFontsData, user?.id])

  // Save template callback
  const onSaveTemplate = useCallback((template: any) => {
    console.log('🔄 onSaveTemplate called with:', template)
    console.log('🔄 Template schemas:', template?.schemas)
    console.log('🔄 Template schemas length:', template?.schemas?.length)

    // Count total fields across all pages
    let totalFields = 0
    if (template?.schemas && Array.isArray(template.schemas)) {
      template.schemas.forEach((pageSchemas: any[]) => {
        if (Array.isArray(pageSchemas)) {
          console.log(`🔄 Page has ${pageSchemas.length} fields:`)
          pageSchemas.forEach((field: any, fieldIndex: number) => {
            console.log(`🔄   Field ${fieldIndex}:`, {
              id: field.id,
              name: field.name,
              type: field.type,
              content: field.content,
              text: field.text
            })
          })
          totalFields += pageSchemas.length
        }
      })
    }
    console.log('🔄 Total fields in template:', totalFields)

    setTemplate(template)
  }, [])

  // Save document with schemas
  const handleSave = async () => {
    if (!user) return

    // Get current template from PDFme designer instance
    let currentTemplate = template
    if (designer.current && designer.current.getTemplate) {
      try {
        const designerTemplate = designer.current.getTemplate()
        console.log('Got template from designer instance:', designerTemplate)
        console.log('Designer template type:', typeof designerTemplate)
        console.log('Designer template keys:', Object.keys(designerTemplate))
        console.log('Designer schemas type:', typeof designerTemplate.schemas)
        console.log('Designer schemas:', designerTemplate.schemas)

        // ✅ CRITICAL: Preserve signers and multiSignature from original template
        // The designer.getTemplate() only returns basePdf and schemas, not signers
        currentTemplate = {
          ...designerTemplate,
          // Preserve signers from the original template that was loaded
          signers: template.signers || [],
          multiSignature: template.multiSignature || false,
          metadata: template.metadata || {}
        }
        console.log('✅ Enhanced template with preserved signers:', currentTemplate.signers)
        console.log('✅ Enhanced template multiSignature:', currentTemplate.multiSignature)

        // Check if schemas is an array and what it contains
        if (Array.isArray(currentTemplate.schemas)) {
          console.log('Schemas is array, length:', currentTemplate.schemas.length)
          currentTemplate.schemas.forEach((pageSchema: any, pageIndex: number) => {
            console.log(`Page ${pageIndex} schemas:`, pageSchema)
            if (Array.isArray(pageSchema)) {
              console.log(`Page ${pageIndex} has ${pageSchema.length} fields`)
              pageSchema.forEach((field, fieldIndex) => {
                console.log(`Page ${pageIndex}, Field ${fieldIndex}:`, field)
              })
            }
          })
        }
      } catch (e) {
        console.warn('Could not get template from designer, using state template:', e)
        currentTemplate = template
      }
    } else {
      console.log('Designer instance not available or getTemplate method missing')
      console.log('Designer current:', designer.current)
      console.log('Available methods:', designer.current ? Object.keys(designer.current) : 'none')
    }

    if (!currentTemplate) {
      console.error('No template available for saving')
      return
    }

    console.log('Saving template:', currentTemplate)
    console.log('User:', user)
    console.log('User ID:', user.id)
    console.log('User ID type:', typeof user.id)
    console.log('Document:', document)

    // Verify current authentication using the secure auth system
    try {
      // Check if user is authenticated via the secure auth provider
      if (!user || !user.id) {
        throw new Error('User not authenticated via secure auth provider')
      }

      // Verify the session is still valid by making an authenticated API call
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Authentication session invalid')
      }

      const authData = await response.json()
      console.log('Authentication verified:', authData)

      if (authData.user?.id !== user.id) {
        console.warn('User ID mismatch:', { contextUser: user.id, authUser: authData.user?.id })
      }
    } catch (authCheckError) {
      console.error('Authentication check failed:', authCheckError)
      throw new Error('Authentication verification failed')
    }

    setSaving(true)
    try {
      // Extract schemas from template (PDFme uses page-based array structure)
      console.log('🔍 SCHEMA EXTRACTION DEBUG:')
      console.log('🔍 Template schemas to save:', currentTemplate.schemas)
      console.log('🔍 Template schemas type:', typeof currentTemplate.schemas)
      console.log('🔍 Template schemas is array:', Array.isArray(currentTemplate.schemas))
      console.log('🔍 Template schemas length:', currentTemplate.schemas?.length)
      console.log('🔍 Template structure:', currentTemplate)

      // PDFme stores schemas as: schemas[pageIndex][fieldIndex] = fieldObject
      // We need to flatten this into our database format
      const schemas: Schema[] = []

      if (currentTemplate.schemas && Array.isArray(currentTemplate.schemas)) {
        console.log('🔍 Processing schemas array with length:', currentTemplate.schemas.length)

        currentTemplate.schemas.forEach((pageSchemas: any[], pageIndex: number) => {
          console.log(`🔍 Processing page ${pageIndex}:`, pageSchemas)
          console.log(`🔍 Page ${pageIndex} is array:`, Array.isArray(pageSchemas))
          console.log(`🔍 Page ${pageIndex} length:`, pageSchemas?.length)

          if (Array.isArray(pageSchemas)) {
            console.log(`🔍 Page ${pageIndex} has ${pageSchemas.length} fields`)
            pageSchemas.forEach((fieldConfig: any, fieldIndex: number) => {
              console.log(`🔍 Processing page ${pageIndex}, field ${fieldIndex}:`, fieldConfig)
              console.log('🔍 Field config keys:', Object.keys(fieldConfig))
              console.log('🔍 Field config values:', fieldConfig)

              // Extract all properties from fieldConfig with special handling for multiVariableText
              let extractedSchema: any

              if (fieldConfig.type === 'multiVariableText') {
                console.log('🔍 Processing multiVariableText field:', fieldConfig)
                console.log('🔍 multiVariableText content:', fieldConfig.content)
                console.log('🔍 multiVariableText text:', fieldConfig.text)
                console.log('🔍 multiVariableText variables:', fieldConfig.variables)

                extractedSchema = {
                  id: `schema_${Date.now()}_${pageIndex}_${fieldIndex}`,
                  type: 'multiVariableText',
                  name: fieldConfig.name || fieldConfig.key || `field_${pageIndex}_${fieldIndex}`,
                  position: {
                    x: fieldConfig.position?.x || fieldConfig.x || 0,
                    y: fieldConfig.position?.y || fieldConfig.y || 0,
                    width: fieldConfig.width || 100,
                    height: fieldConfig.height || 20,
                    page: pageIndex
                  },
                  properties: {
                    // Basic properties
                    required: fieldConfig.required || false,
                    placeholder: fieldConfig.placeholder || '',
                    options: fieldConfig.options || [],
                    format: fieldConfig.format || '',
                    validation: fieldConfig.validation || {},

                    // multiVariableText specific properties
                    text: fieldConfig.text || 'Variable Text',
                    variables: fieldConfig.variables || [],
                    content: fieldConfig.content || '{}', // This stores the variable values as JSON

                    // PDFme-specific properties
                    fontSize: fieldConfig.fontSize || 13,
                    fontColor: fieldConfig.fontColor || '#000000',
                    fontName: fieldConfig.fontName || 'Roboto',
                    alignment: fieldConfig.alignment || 'left',
                    backgroundColor: fieldConfig.backgroundColor || '',

                    // Additional properties
                    rotate: fieldConfig.rotate || 0,
                    characterSpacing: fieldConfig.characterSpacing || 0,
                    locale: fieldConfig.locale || 'en',
                    opacity: fieldConfig.opacity || 1,

                    // Store the entire fieldConfig for debugging
                    _originalConfig: fieldConfig
                  },
                  created_at: new Date().toISOString()
                }
              } else {
                // Handle other field types (text, signature, etc.)
                extractedSchema = {
                  id: `schema_${Date.now()}_${pageIndex}_${fieldIndex}`,
                  type: fieldConfig.type || 'text',
                  name: fieldConfig.name || fieldConfig.key || `field_${pageIndex}_${fieldIndex}`,
                  position: {
                    x: fieldConfig.position?.x || fieldConfig.x || 0,
                    y: fieldConfig.position?.y || fieldConfig.y || 0,
                    width: fieldConfig.width || 100,
                    height: fieldConfig.height || 20,
                    page: pageIndex
                  },
                  properties: {
                    // Basic properties
                    required: fieldConfig.required || false,
                    placeholder: fieldConfig.placeholder || fieldConfig.content || fieldConfig.text || '',
                    options: fieldConfig.options || [],
                    format: fieldConfig.format || '',
                    validation: fieldConfig.validation || {},

                    // PDFme-specific properties
                    fontSize: fieldConfig.fontSize || 13,
                    fontColor: fieldConfig.fontColor || '#000000',
                    fontName: fieldConfig.fontName || 'Roboto',
                    alignment: fieldConfig.alignment || 'left',
                    backgroundColor: fieldConfig.backgroundColor || '',

                    // Additional properties that might exist
                    rotate: fieldConfig.rotate || 0,
                    characterSpacing: fieldConfig.characterSpacing || 0,
                    locale: fieldConfig.locale || 'en',
                    opacity: fieldConfig.opacity || 1,

                    // Store the entire fieldConfig for debugging
                    _originalConfig: fieldConfig
                  },
                  created_at: new Date().toISOString()
                }
              }

              console.log('🔍 Extracted schema:', extractedSchema)
              schemas.push(extractedSchema)
            })
          } else {
            console.log(`🔍 Page ${pageIndex} is not an array or is empty`)
          }
        })
      } else {
        console.log('🔍 No schemas found or schemas is not an array')
      }

      console.log('🔍 FINAL EXTRACTION RESULTS:')
      console.log('🔍 Total extracted schemas for database:', schemas.length)
      console.log('🔍 Extracted schemas for database:', schemas)

      // Save template JSON to storage
      console.log('Saving template to storage...')

      console.log('Saving template to storage...')
      console.log('Template to save:', currentTemplate)
      console.log('Template schemas:', currentTemplate.schemas)
      console.log('Template schemas length:', currentTemplate.schemas?.length)
      console.log('Template schemas structure:', JSON.stringify(currentTemplate.schemas, null, 2))
      console.log('User ID:', user.id)
      console.log('Document ID:', document.id)

      const templateResult = await DriveService.saveTemplate(
        currentTemplate,
        user.id,
        document.id
      )
      console.log('Template save result:', templateResult)

      if (templateResult.error) {
        console.error('Template save failed:', templateResult.error)
        throw new Error(`Template save failed: ${templateResult.error.message || templateResult.error}`)
      }

      let templatePath = document.template_url
      if (templateResult.data) {
        templatePath = templateResult.data.path
      }

      // Update document with schemas
      console.log('Updating document in database...')
      console.log('Document ID:', document.id)
      console.log('Schemas to save:', schemas)
      console.log('Template path:', templatePath)

      const updatedDocument = await DriveService.updateDocumentTemplate(
        document.id,
        schemas,
        templatePath
      )

      console.log('Document update result:', updatedDocument)

      if (updatedDocument) {
        onDocumentUpdated(updatedDocument)
        alert('Document saved successfully!')
        // Navigate back to document list after successful save
        onBack()
      } else {
        throw new Error('Failed to update document')
      }
    } catch (error) {
      console.error('Error saving document:', error)
      console.error('Error type:', typeof error)
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
      console.error('Error message:', error instanceof Error ? error.message : error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')

      // Check if it's a storage error specifically
      if (error && typeof error === 'object' && 'message' in error) {
        if ((error as Error).message.includes('row-level security policy')) {
          alert('Permission error: Unable to save template. Please check your authentication and try again.')
        } else {
          alert(`Failed to save document: ${(error as Error).message}`)
        }
      } else {
        alert('Failed to save document. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  // Preview document
  const handlePreview = async () => {
    try {
      const url = await DriveService.getDocumentUrl(document.pdf_url || '')
      if (url) {
        window.open(url, '_blank')
      } else {
        alert('Unable to preview document. Please try again.')
      }
    } catch (error) {
      console.error('Error previewing document:', error)
      alert('Error previewing document. Please try again.')
    }
  }

  // Initialize designer
  useEffect(() => {
    const currentRef = designerRef.current
    isMountedRef.current = true
    buildDesigner()
    return () => {
      console.log('=== COMPONENT UNMOUNTING - COMPREHENSIVE CLEANUP ===')
      isMountedRef.current = false

      // Immediate cleanup of DOM to prevent visual artifacts
      if (currentRef) {
        console.log('Clearing DOM on unmount...')
        currentRef.innerHTML = ''
      }

      // Clear any global PDFme state immediately
      if (typeof window !== 'undefined' && (window as any).pdfme) {
        console.log('Clearing global PDFme state on unmount...')
        delete (window as any).pdfme
      }

      // Deferred cleanup of designer instance
      if (designer.current) {
        try {
          // Use requestAnimationFrame to ensure cleanup happens after render
          requestAnimationFrame(() => {
            if (designer.current && !isMountedRef.current) {

              // For React 18+, skip the problematic destroy method entirely
              if (typeof (window as any).React?.unmountComponentAtNode === 'undefined') {
                console.log('React 18+ detected, using safe cleanup method on unmount')
                designer.current = null
              } else {
                // For older React versions, try the normal destroy method
                try {
                  designer.current.destroy()
                  designer.current = null
                } catch {
                  console.warn('Error with destroy method, falling back to manual cleanup')
                  designer.current = null
                }
              }

              // Force garbage collection if available
              if (typeof window !== 'undefined' && (window as any).gc) {
                console.log('Running garbage collection on unmount...')
                  ; (window as any).gc()
              }
            }
          })
        } catch {
          console.warn('Error during designer cleanup')
          designer.current = null
        }
      }

      console.log('=== UNMOUNT CLEANUP COMPLETE ===')
    }
  }, [buildDesigner])

  if (!document || !document.id) {
    console.error('DocumentDesignerWrapper: Invalid document prop:', document)
    return (
      <AntdWarningSuppressor>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-medium">Error: Invalid document</p>
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Back to Documents
            </button>
          </div>
        </div>
      </AntdWarningSuppressor>
    )
  }

  return (
    <AntdWarningSuppressor>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Documents
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{document.name}</h1>
                <p className="text-sm text-gray-600">
                  {document.type} • {document.signature_type} signature •
                  <span className={`ml-1 ${document.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                    {document.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreview}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview PDF
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !template}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Designer Container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading PDF Designer...</p>
              </div>
            </div>
          )}
          <div ref={designerRef} className="w-full h-full" />
        </div>
      </div>
    </AntdWarningSuppressor>
  )
}

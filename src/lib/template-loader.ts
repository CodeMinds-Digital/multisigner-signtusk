import { DocumentManagementService } from './document-management-service'
import { DocumentTemplate, Schema } from '@/types/document-management'

export interface LoadedTemplate {
  basePdf: ArrayBuffer
  schemas: any[][]
  source: 'template_json' | 'database' | 'empty'
  fieldCount: number
}

export class TemplateLoader {
  /**
   * Load template data for PDFme Designer
   */
  static async loadTemplate(document: DocumentTemplate): Promise<LoadedTemplate> {
    console.log('=== TEMPLATE LOADING START ===')
    console.log('Document:', document)

    // Get PDF data first
    const pdfData = await this.loadPdfData(document)
    
    // Try to load from template JSON first
    if (document.template_url) {
      const templateResult = await this.loadFromTemplateJson(document.template_url, pdfData)
      if (templateResult) {
        console.log('✅ Loaded from template JSON')
        return templateResult
      }
    }

    // Fallback to database schemas
    const databaseResult = await this.loadFromDatabase(document, pdfData)
    if (databaseResult.fieldCount > 0) {
      console.log('✅ Loaded from database schemas')
      return databaseResult
    }

    // Final fallback - empty template
    console.log('✅ Using empty template')
    return {
      basePdf: pdfData,
      schemas: [[]],
      source: 'empty',
      fieldCount: 0
    }
  }

  /**
   * Load PDF data from document
   */
  private static async loadPdfData(document: DocumentTemplate): Promise<ArrayBuffer> {
    console.log('Loading PDF data...')
    
    let pdfPath = document.pdf_url ||
      document.template_data?.pdf_url ||
      (document.template_data && typeof document.template_data === 'object' &&
        Object.values(document.template_data).find((val: any) =>
          typeof val === 'string' && val.includes('.pdf')))

    if (!pdfPath) {
      throw new Error('No PDF path found in document')
    }

    const pdfData = await DocumentManagementService.getPdfData(pdfPath)
    
    if (!pdfData || !(pdfData instanceof ArrayBuffer)) {
      throw new Error('Invalid PDF data - must be ArrayBuffer')
    }

    console.log(`PDF data loaded: ${pdfData.byteLength} bytes`)
    return pdfData
  }

  /**
   * Load template from JSON file
   */
  private static async loadFromTemplateJson(
    templateUrl: string, 
    pdfData: ArrayBuffer
  ): Promise<LoadedTemplate | null> {
    try {
      console.log('Loading from template JSON:', templateUrl)
      
      const existingTemplate = await DocumentManagementService.getTemplateJson(templateUrl)
      
      if (!existingTemplate?.schemas || !Array.isArray(existingTemplate.schemas)) {
        console.log('Template JSON invalid or missing schemas')
        return null
      }

      // Count fields
      let fieldCount = 0
      existingTemplate.schemas.forEach((pageSchemas: any[]) => {
        if (Array.isArray(pageSchemas)) {
          fieldCount += pageSchemas.length
        }
      })

      if (fieldCount === 0) {
        console.log('Template JSON has no fields')
        return null
      }

      return {
        basePdf: pdfData, // Always use fresh PDF data
        schemas: existingTemplate.schemas,
        source: 'template_json',
        fieldCount
      }
    } catch (error) {
      console.log('Failed to load template JSON:', error)
      return null
    }
  }

  /**
   * Load template from database schemas
   */
  private static async loadFromDatabase(
    document: DocumentTemplate, 
    pdfData: ArrayBuffer
  ): Promise<LoadedTemplate> {
    console.log('Loading from database schemas...')
    
    let pdfmeSchemas: any[][] = [[]] // Start with empty page 0
    let fieldCount = 0

    if (document.schemas && document.schemas.length > 0) {
      console.log('Converting database schemas to PDFme format...')

      // Group schemas by page
      const schemasByPage: { [page: number]: any[] } = {}

      document.schemas.forEach(schema => {
        const pageIndex = schema.position?.page || 0

        if (!schemasByPage[pageIndex]) {
          schemasByPage[pageIndex] = []
        }

        // Convert to PDFme field format
        const pdfmeField = this.convertSchemaToField(schema)
        schemasByPage[pageIndex].push(pdfmeField)
        fieldCount++
      })

      // Convert to PDFme array format
      const maxPage = Math.max(...Object.keys(schemasByPage).map(Number))
      pdfmeSchemas = []

      for (let i = 0; i <= maxPage; i++) {
        pdfmeSchemas[i] = schemasByPage[i] || []
      }
    }

    return {
      basePdf: pdfData,
      schemas: pdfmeSchemas,
      source: 'database',
      fieldCount
    }
  }

  /**
   * Convert database schema to PDFme field
   */
  private static convertSchemaToField(schema: Schema): any {
    return {
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
      // Include original config if available
      ...(schema.properties?._originalConfig || {})
    }
  }

  /**
   * Validate and fix field properties for PDFme compatibility
   */
  static validateAndFixFields(schemas: any[][]): any[][] {
    return schemas.map(pageSchemas => 
      pageSchemas.map(field => {
        // Ensure required properties exist
        field.position = field.position || { x: 0, y: 0 }
        field.width = field.width || 100
        field.height = field.height || 20
        field.rotate = field.rotate || 0
        field.opacity = field.opacity !== undefined ? field.opacity : 1
        field.required = field.required !== undefined ? field.required : false

        // Fix negative positions
        if (field.position.x < 0) field.position.x = 0
        if (field.position.y < 0) field.position.y = 0

        // Fix invalid sizes
        if (field.width <= 0) field.width = 100
        if (field.height <= 0) field.height = 20

        return field
      })
    )
  }
}

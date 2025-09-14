import { supabaseAdmin } from './supabase-admin'

interface SignerData {
  id: string
  signer_name: string
  signer_email: string
  signature_data: {
    signer_name: string
    signature_image: string
    signed_at: string
    location: any
    profile_location: any
  }
  location: any
  signed_at: string
}

interface DocumentSchema {
  fields: Array<{
    id: string
    type: string
    name: string
    required: boolean
    signer_email?: string
    position?: {
      x: number
      y: number
      page: number
    }
  }>
}

export class PDFGenerationService {

  /**
   * Generate final signed PDF after all signers complete
   */
  static async generateFinalPDF(requestId: string): Promise<string | null> {
    try {
      console.log('🎯 Starting PDF generation for request:', requestId)

      // Get signing request details
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        console.error('❌ Error fetching signing request:', requestError)
        return null
      }

      // Get all signers with their signature data (check both status fields for compatibility)
      const { data: allSigners, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)

      if (signersError || !allSigners) {
        console.error('❌ Error fetching signers:', signersError)
        return null
      }

      // Filter for signed signers (check both status fields for compatibility)
      const signers = allSigners.filter(s =>
        s.status === 'signed' || s.signer_status === 'signed'
      )

      if (signers.length === 0) {
        console.error('❌ No signed signers found')
        return null
      }

      console.log('📋 Found', signers.length, 'signed signers')

      // Get document schema from schemas field (not signature_fields)
      const schemas = signingRequest.document?.schemas
      if (!schemas || !Array.isArray(schemas) || schemas.length === 0) {
        console.error('❌ No schemas found in document')
        return null
      }

      // Create signer mapping: signerId -> signer_email using stored schema_signer_id
      const signerMapping: { [key: string]: string } = {}

      // Use the stored schema_signer_id mapping if available
      signers.forEach((signer) => {
        if (signer.schema_signer_id) {
          signerMapping[signer.schema_signer_id] = signer.signer_email
        }
      })

      // Fallback: if no schema_signer_id, use signing_order based mapping
      if (Object.keys(signerMapping).length === 0) {
        console.log('⚠️ No schema_signer_id found, falling back to signing_order mapping')
        const sortedSigners = [...signers].sort((a, b) => {
          const orderA = a.signing_order || 999
          const orderB = b.signing_order || 999
          return orderA - orderB
        })

        sortedSigners.forEach((signer, index) => {
          signerMapping[`signer_${index + 1}`] = signer.signer_email
        })
      }

      console.log('🔗 Signer mapping (using schema_signer_id):', signerMapping)

      // Convert schemas to DocumentSchema format
      const documentSchema: DocumentSchema = {
        fields: schemas.map((field: any) => {
          const signerId = field.properties?._originalConfig?.signerId
          const signerEmail = signerId ? signerMapping[signerId] : null

          return {
            id: field.id,
            type: field.type,
            name: field.name,
            required: field.properties?._originalConfig?.required !== false,
            signer_email: signerEmail,
            position: field.position
          }
        }).filter(field => field.signer_email) // Only include fields with valid signer mapping
      }

      console.log('📋 Document schema fields:', documentSchema.fields.length)

      // Transform signers data to match SignerData interface
      const transformedSigners: SignerData[] = signers.map(signer => {
        let parsedSignatureData
        try {
          parsedSignatureData = typeof signer.signature_data === 'string'
            ? JSON.parse(signer.signature_data)
            : signer.signature_data
        } catch (e) {
          console.error('❌ Error parsing signature data for signer:', signer.signer_email, e)
          parsedSignatureData = {}
        }

        return {
          id: signer.id,
          signer_name: signer.signer_name || parsedSignatureData.signer_name || signer.signer_email,
          signer_email: signer.signer_email,
          signature_data: parsedSignatureData,
          location: signer.location,
          signed_at: signer.signed_at
        }
      })

      console.log('🔄 Transformed signers for PDF generation:', transformedSigners.length)

      // Map signers to schema fields
      const populatedFields = this.populateSchemaFields(documentSchema, transformedSigners)

      // Generate the final PDF
      const finalPdfUrl = await this.createSignedPDF(
        signingRequest.document.pdf_url || signingRequest.document.file_url,
        populatedFields,
        requestId
      )

      if (finalPdfUrl) {
        // Update signing request with final PDF URL
        await supabaseAdmin
          .from('signing_requests')
          .update({
            final_pdf_url: finalPdfUrl,
            document_status: 'completed',
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        console.log('✅ Final PDF generated and saved:', finalPdfUrl)
        return finalPdfUrl
      }

      return null

    } catch (error) {
      console.error('❌ Error generating final PDF:', error)
      return null
    }
  }

  /**
   * Populate schema fields with signer data
   */
  private static populateSchemaFields(schema: DocumentSchema, signers: SignerData[]) {
    const populatedFields: any[] = []

    schema.fields.forEach(field => {
      const signer = signers.find(s => s.signer_email === field.signer_email)

      if (signer && signer.signature_data) {
        const fieldData = {
          id: field.id,
          type: field.type,
          name: field.name,
          position: field.position,
          value: this.getFieldValue(field, signer)
        }

        populatedFields.push(fieldData)
      }
    })

    return populatedFields
  }

  /**
   * Get the appropriate value for a schema field based on field type
   */
  private static getFieldValue(field: any, signer: SignerData) {
    const { signature_data } = signer

    switch (field.type) {
      case 'signature':
        return signature_data.signature_image

      case 'name':
      case 'full_name':
        return signature_data.signer_name

      case 'date':
      case 'signed_date':
        return new Date(signature_data.signed_at).toLocaleDateString()

      case 'datetime':
      case 'timestamp':
        return new Date(signature_data.signed_at).toLocaleString()

      case 'location':
        if (signature_data.location?.address) {
          return signature_data.location.address
        }
        if (signature_data.profile_location) {
          const loc = signature_data.profile_location
          return `${loc.district || ''}, ${loc.state || ''}`.trim().replace(/^,\s*/, '')
        }
        return 'Location not available'

      case 'state':
        return signature_data.profile_location?.state || ''

      case 'district':
        return signature_data.profile_location?.district || ''

      case 'taluk':
        return signature_data.profile_location?.taluk || ''

      case 'email':
        return signer.signer_email

      default:
        return field.name || ''
    }
  }

  /**
   * Create the actual signed PDF with populated fields using pdfme-complete
   */
  private static async createSignedPDF(
    originalPdfUrl: string,
    populatedFields: any[],
    requestId: string
  ): Promise<string | null> {
    try {
      console.log('📄 Creating signed PDF with', populatedFields.length, 'populated fields')

      // Get the document template to extract the PDF template and schemas
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        console.error('❌ Error fetching signing request for PDF generation:', requestError)
        return null
      }

      // Use the document data that was already fetched in the join
      const document = signingRequest.document
      if (!document) {
        console.error('❌ Document not found in signing request')
        return null
      }

      // For PDF generation, we need the original PDF URL
      const originalPdfUrl = document.pdf_url || document.file_url
      if (!originalPdfUrl) {
        console.error('❌ No PDF URL found in document')
        return null
      }

      console.log('📄 Using original PDF URL:', originalPdfUrl)

      // Create signed PDF using pdf-lib
      console.log('📄 Generating signed PDF with pdf-lib')
      console.log('📋 Populated fields for PDF:', populatedFields.length)

      const pdfBytes = await this.createSignedPDFWithPdfLib(originalPdfUrl, populatedFields, requestId)

      // Upload to Supabase storage
      const timestamp = new Date().getTime()
      const fileName = `signed-${requestId}-${timestamp}.pdf`

      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('signed')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error uploading signed PDF:', uploadError)
        return null
      }

      // Get public URL
      const { data: urlData } = supabaseAdmin.storage
        .from('signed')
        .getPublicUrl(uploadData.path)

      const finalPdfUrl = urlData.publicUrl
      console.log('✅ Signed PDF created and uploaded:', finalPdfUrl)
      return finalPdfUrl

    } catch (error) {
      console.error('❌ Error creating signed PDF:', error)
      return null
    }
  }

  /**
   * Prepare inputs for pdfme from populated fields
   */
  private static prepareInputsFromFields(populatedFields: any[]): Record<string, any> {
    const inputs: Record<string, any> = {}

    populatedFields.forEach(field => {
      if (field.name && field.value !== undefined) {
        inputs[field.name] = field.value
      }
    })

    return inputs
  }

  /**
   * Create signed PDF using pdf-lib (server-compatible)
   */
  private static async createSignedPDFWithPdfLib(
    originalPdfUrl: string,
    populatedFields: any[],
    requestId: string
  ): Promise<Uint8Array> {
    try {
      console.log('📄 Loading original PDF from:', originalPdfUrl)

      // Download the original PDF using Supabase admin client
      let originalPdfBytes: ArrayBuffer

      if (originalPdfUrl.startsWith('http')) {
        // If it's already a full URL, use fetch
        console.log('📄 Fetching PDF from URL:', originalPdfUrl)
        const response = await fetch(originalPdfUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`)
        }
        originalPdfBytes = await response.arrayBuffer()
      } else {
        // If it's a path, try different buckets to find the file
        console.log('📄 Downloading PDF from storage path:', originalPdfUrl)

        let fileData: Blob | null = null
        let downloadError: any = null

        // Try 'files' bucket first
        const filesResult = await supabaseAdmin.storage
          .from('files')
          .download(originalPdfUrl)

        if (filesResult.data && !filesResult.error) {
          fileData = filesResult.data
        } else {
          // Try 'documents' bucket
          const documentsResult = await supabaseAdmin.storage
            .from('documents')
            .download(originalPdfUrl)

          if (documentsResult.data && !documentsResult.error) {
            fileData = documentsResult.data
          } else {
            downloadError = documentsResult.error || filesResult.error
          }
        }

        if (!fileData) {
          throw new Error(`Failed to download PDF from both 'files' and 'documents' buckets: ${downloadError?.message || 'File not found'}`)
        }

        originalPdfBytes = await fileData.arrayBuffer()
      }
      const pdfDoc = await PDFDocument.load(originalPdfBytes)

      // Get the first page (assuming single page for now)
      const pages = pdfDoc.getPages()
      const firstPage = pages[0]
      const { width, height } = firstPage.getSize()

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

      console.log('📝 Adding signature fields to PDF...')

      // Add signature fields to the PDF
      for (const field of populatedFields) {
        await this.addFieldToPDF(firstPage, field, font, boldFont, width, height)
      }

      // Add generation timestamp
      firstPage.drawText(
        `Generated: ${new Date().toLocaleString()}`,
        {
          x: 50,
          y: 30,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        }
      )

      // Save the PDF
      const pdfBytes = await pdfDoc.save()
      console.log('✅ PDF generated successfully with pdf-lib')

      return pdfBytes

    } catch (error) {
      console.error('❌ Error creating PDF with pdf-lib:', error)
      throw error
    }
  }

  /**
   * Add a field to the PDF page
   */
  private static async addFieldToPDF(
    page: any,
    field: any,
    font: any,
    boldFont: any,
    pageWidth: number,
    pageHeight: number
  ) {
    const { type, value, position } = field

    // Default position if not specified
    let x = position?.x || 100
    let y = position?.y || pageHeight - 200

    // Convert coordinates if needed (pdfme uses different coordinate system)
    y = pageHeight - y

    console.log(`📍 Adding ${type} field at (${x}, ${y}):`, value)

    switch (type) {
      case 'signature':
        // Handle signature image
        if (value && value.startsWith('data:image')) {
          try {
            // Extract base64 data
            const base64Data = value.split(',')[1]
            const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

            // Embed image
            const image = await page.doc.embedPng(imageBytes)
            const imageDims = image.scale(0.5) // Scale down signature

            page.drawImage(image, {
              x: x,
              y: y - imageDims.height,
              width: imageDims.width,
              height: imageDims.height,
            })
          } catch (error) {
            console.error('Error embedding signature image:', error)
            // Fallback to text
            page.drawText('[Signature]', {
              x: x,
              y: y,
              size: 12,
              font: boldFont,
              color: rgb(0, 0, 0),
            })
          }
        }
        break

      case 'name':
      case 'full_name':
        page.drawText(value || '[Name]', {
          x: x,
          y: y,
          size: 12,
          font: boldFont,
          color: rgb(0, 0, 0),
        })
        break

      case 'date':
      case 'signed_date':
      case 'datetime':
      case 'timestamp':
        page.drawText(value || new Date().toLocaleDateString(), {
          x: x,
          y: y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        })
        break

      case 'location':
      case 'state':
      case 'district':
      case 'email':
        page.drawText(value || '', {
          x: x,
          y: y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        })
        break

      default:
        page.drawText(value || '', {
          x: x,
          y: y,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        })
    }
  }

  /**
   * Trigger PDF generation for a completed signing request
   */
  static async triggerPDFGeneration(requestId: string) {
    try {
      // This could be called from the signing API or as a background job
      const finalPdfUrl = await this.generateFinalPDF(requestId)

      if (finalPdfUrl) {
        console.log('🎉 PDF generation completed for request:', requestId)

        // TODO: Send notification emails to all parties
        // await this.sendCompletionNotifications(requestId, finalPdfUrl)

        return { success: true, finalPdfUrl }
      } else {
        console.error('❌ PDF generation failed for request:', requestId)
        return { success: false, error: 'PDF generation failed' }
      }
    } catch (error) {
      console.error('❌ Error triggering PDF generation:', error)
      return { success: false, error: 'PDF generation error' }
    }
  }
}

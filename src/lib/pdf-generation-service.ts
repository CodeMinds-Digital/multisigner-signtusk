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

      // Get all signers with their signature data
      const { data: signers, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .eq('signer_status', 'signed')

      if (signersError || !signers || signers.length === 0) {
        console.error('❌ Error fetching signers or no signed signers found:', signersError)
        return null
      }

      console.log('📋 Found', signers.length, 'signed signers')

      // Get document schema
      const documentSchema = signingRequest.document?.schema as DocumentSchema
      if (!documentSchema || !documentSchema.fields) {
        console.error('❌ No document schema found')
        return null
      }

      // Map signers to schema fields
      const populatedFields = this.populateSchemaFields(documentSchema, signers)
      
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
            completed_at: new Date().toISOString(),
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
   * Create the actual signed PDF with populated fields
   * This is a placeholder - in a real implementation, you would use a PDF library
   * like PDF-lib, PDFtk, or a service like DocuSign, PandaDoc, etc.
   */
  private static async createSignedPDF(
    originalPdfUrl: string, 
    populatedFields: any[], 
    requestId: string
  ): Promise<string | null> {
    try {
      console.log('📄 Creating signed PDF with', populatedFields.length, 'populated fields')
      
      // TODO: Implement actual PDF generation
      // This would involve:
      // 1. Download the original PDF
      // 2. Use a PDF library to add the signature fields
      // 3. Upload the final PDF to storage
      // 4. Return the URL
      
      // For now, we'll simulate this by copying the original PDF
      // and adding a timestamp to make it unique
      const timestamp = new Date().getTime()
      const finalPdfPath = `signed-documents/${requestId}/final-signed-${timestamp}.pdf`
      
      // In a real implementation, you would:
      // const pdfBytes = await fetch(originalPdfUrl).then(res => res.arrayBuffer())
      // const pdfDoc = await PDFDocument.load(pdfBytes)
      // 
      // populatedFields.forEach(field => {
      //   // Add field to PDF based on position and type
      //   if (field.type === 'signature') {
      //     // Add signature image
      //   } else {
      //     // Add text field
      //   }
      // })
      //
      // const finalPdfBytes = await pdfDoc.save()
      // Upload to Supabase storage and return URL
      
      // For demo purposes, return a placeholder URL
      const finalPdfUrl = `https://gzxfsojbbfipzvjxucci.supabase.co/storage/v1/object/public/documents/${finalPdfPath}`
      
      console.log('✅ Signed PDF created (simulated):', finalPdfUrl)
      return finalPdfUrl

    } catch (error) {
      console.error('❌ Error creating signed PDF:', error)
      return null
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

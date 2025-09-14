import { supabase } from './supabase'
import { PDFDocument, rgb, StandardFonts } from '@codeminds-digital/pdfme-complete'

export interface SignatureData {
  signature: string // Base64 signature image
  timestamp: string
  signer_email: string
  signer_name?: string
  position?: { x: number; y: number; page: number }
}

export interface CompletedSignatureRequest {
  id: string
  document_id: string
  document_name: string
  signatures: SignatureData[]
  original_pdf_url: string
}

export class PDFSignatureService {
  private static readonly SIGNED_DOCUMENTS_BUCKET = 'signed-documents'

  /**
   * Generate a final PDF with all signatures embedded
   */
  static async generateSignedPDF(
    signatureRequestId: string,
    originalPdfUrl: string,
    signatures: SignatureData[]
  ): Promise<string | null> {
    try {
      console.log('Generating signed PDF for request:', signatureRequestId)
      console.log('Original PDF URL:', originalPdfUrl)
      console.log('Signatures to embed:', signatures.length)

      // Download the original PDF
      const originalPdfResponse = await fetch(originalPdfUrl)
      if (!originalPdfResponse.ok) {
        console.error('Failed to download original PDF')
        return null
      }

      const originalPdfBytes = await originalPdfResponse.arrayBuffer()
      const pdfDoc = await PDFDocument.load(originalPdfBytes)

      // Embed signatures into the PDF
      await this.embedSignatures(pdfDoc, signatures)

      // Generate the final PDF bytes
      const finalPdfBytes = await pdfDoc.save()

      // Upload to Supabase storage
      const fileName = `signed-${signatureRequestId}-${Date.now()}.pdf`
      const { data, error } = await supabase.storage
        .from(this.SIGNED_DOCUMENTS_BUCKET)
        .upload(fileName, finalPdfBytes, {
          contentType: 'application/pdf',
          upsert: false
        })

      if (error) {
        console.error('Error uploading signed PDF:', error)
        return null
      }

      console.log('Signed PDF uploaded successfully:', data.path)
      return data.path
    } catch (error) {
      console.error('Error generating signed PDF:', error)
      return null
    }
  }

  /**
   * Embed signatures into the PDF document
   */
  private static async embedSignatures(pdfDoc: PDFDocument, signatures: SignatureData[]) {
    try {
      const pages = pdfDoc.getPages()
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      for (const signatureData of signatures) {
        // Convert base64 signature to image
        const signatureImageBytes = this.base64ToArrayBuffer(signatureData.signature)
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes)

        // Determine which page to add the signature to
        let targetPage = pages[0] // Default to first page
        if (signatureData.position?.page && signatureData.position.page < pages.length) {
          targetPage = pages[signatureData.position.page]
        }

        const { width: pageWidth, height: pageHeight } = targetPage.getSize()

        // Calculate signature position
        let x = signatureData.position?.x || pageWidth - 200 // Default to bottom right
        let y = signatureData.position?.y || 100

        // Ensure signature fits within page bounds
        const signatureWidth = 150
        const signatureHeight = 75

        if (x + signatureWidth > pageWidth) {
          x = pageWidth - signatureWidth - 20
        }
        if (y + signatureHeight > pageHeight) {
          y = pageHeight - signatureHeight - 20
        }

        // Add signature image
        targetPage.drawImage(signatureImage, {
          x,
          y,
          width: signatureWidth,
          height: signatureHeight,
        })

        // Add signature details text
        const textY = y - 15
        targetPage.drawText(`Signed by: ${signatureData.signer_email}`, {
          x,
          y: textY,
          size: 8,
          font,
          color: rgb(0.3, 0.3, 0.3),
        })

        targetPage.drawText(`Date: ${new Date(signatureData.timestamp).toLocaleDateString()}`, {
          x,
          y: textY - 12,
          size: 8,
          font,
          color: rgb(0.3, 0.3, 0.3),
        })
      }
    } catch (error) {
      console.error('Error embedding signatures:', error)
      throw error
    }
  }

  /**
   * Convert base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Remove data URL prefix if present
    const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '')
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
  }

  /**
   * Get signed PDF URL for viewing
   */
  static async getSignedPdfUrl(signedPdfPath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(this.SIGNED_DOCUMENTS_BUCKET)
        .createSignedUrl(signedPdfPath, 3600) // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        return null
      }

      return data.signedUrl
    } catch (error) {
      console.error('Error getting signed PDF URL:', error)
      return null
    }
  }

  /**
   * Process completed signature request and generate final PDF
   */
  static async processCompletedSignatureRequest(signatureRequestId: string): Promise<boolean> {
    try {
      console.log('Processing completed signature request:', signatureRequestId)

      // Get signature request details
      const { data: signatureRequest, error: requestError } = await supabase
        .from('signature_requests')
        .select(`
          id,
          document_id,
          document_name,
          status,
          signature_request_signers (
            email,
            signature_data,
            signed_at,
            status
          )
        `)
        .eq('id', signatureRequestId)
        .single()

      if (requestError || !signatureRequest) {
        console.error('Error fetching signature request:', requestError)
        return false
      }

      // Check if all signatures are completed
      const signers = signatureRequest.signature_request_signers || []
      const allSigned = signers.every((signer: any) => signer.status === 'signed')

      if (!allSigned) {
        console.log('Not all signers have signed yet')
        return false
      }

      // Get original document URL
      const { data: documentTemplate, error: docError } = await supabase
        .from('document_templates')
        .select('template_data')
        .eq('id', signatureRequest.document_id)
        .single()

      if (docError || !documentTemplate?.template_data?.pdf_url) {
        console.error('Error fetching original document:', docError)
        return false
      }

      // Get signed URL for original PDF
      const { data: originalPdfData } = await supabase.storage
        .from('documents')
        .createSignedUrl(documentTemplate.template_data.pdf_url, 3600)

      if (!originalPdfData?.signedUrl) {
        console.error('Could not get original PDF URL')
        return false
      }

      // Prepare signature data
      const signatures: SignatureData[] = signers
        .filter((signer: any) => signer.status === 'signed' && signer.signature_data?.signature)
        .map((signer: any) => ({
          signature: signer.signature_data.signature,
          timestamp: signer.signed_at,
          signer_email: signer.email,
          signer_name: signer.signature_data.signer_name || signer.email
        }))

      // Generate signed PDF
      const signedPdfPath = await this.generateSignedPDF(
        signatureRequestId,
        originalPdfData.signedUrl,
        signatures
      )

      if (!signedPdfPath) {
        console.error('Failed to generate signed PDF')
        return false
      }

      // Update signature request with signed PDF path
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          signed_pdf_path: signedPdfPath,
          updated_at: new Date().toISOString()
        })
        .eq('id', signatureRequestId)

      if (updateError) {
        console.error('Error updating signature request with signed PDF path:', updateError)
        return false
      }

      console.log('Successfully processed completed signature request')
      return true
    } catch (error) {
      console.error('Error processing completed signature request:', error)
      return false
    }
  }

  /**
   * Initialize signed documents bucket if it doesn't exist
   */
  static async initializeSignedDocumentsBucket(): Promise<boolean> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        console.error('Error listing buckets:', listError)
        return false
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.SIGNED_DOCUMENTS_BUCKET)

      if (!bucketExists) {
        // Create the bucket
        const { error: createError } = await supabase.storage.createBucket(this.SIGNED_DOCUMENTS_BUCKET, {
          public: false,
          allowedMimeTypes: ['application/pdf'],
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
        })

        if (createError) {
          console.error('Error creating signed documents bucket:', createError)
          return false
        }

        console.log('Created signed documents bucket')
      }

      return true
    } catch (error) {
      console.error('Error initializing signed documents bucket:', error)
      return false
    }
  }
}

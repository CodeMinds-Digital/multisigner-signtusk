/**
 * QR Code PDF Integration Service
 * Adds QR codes to generated PDFs for document verification
 * Non-breaking implementation that enhances existing PDF generation
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Dynamic import for QRCode to prevent SSR issues
let QRCode: any = null
async function getQRCode() {
  if (!QRCode) {
    try {
      QRCode = (await import('qrcode')).default
    } catch (error) {
      console.warn('QRCode package not available:', error)
    }
  }
  return QRCode
}

export interface QRCodeOptions {
  size?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  margin?: number
}

export interface QRVerificationData {
  signature_request_id: string
  verification_url: string
  qr_code_data: string
  document_hash: string
  created_at: string
}

export class QRPDFService {
  private static readonly DEFAULT_QR_OPTIONS: QRCodeOptions = {
    size: 80,
    errorCorrectionLevel: 'M',
    position: 'bottom-right',
    margin: 10
  }

  /**
   * Add QR code to existing PDF bytes (enhanced SignTusk method)
   * Adds QR codes to ALL pages with expanded dimensions
   */
  static async addQRCodeToPDF(
    pdfBytes: Uint8Array,
    requestId: string,
    options: QRCodeOptions = {}
  ): Promise<{ success: boolean; pdfBytes?: Uint8Array; error?: string }> {
    try {
      // Check if QR codes are enabled
      if (process.env.ENABLE_QR_CODES !== 'true') {
        console.log('📋 QR codes disabled, returning original PDF')
        return { success: true, pdfBytes }
      }

      console.log('🔄 Adding QR code to PDF for request:', requestId)

      const qrOptions = { ...this.DEFAULT_QR_OPTIONS, ...options }

      // Generate verification URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/verify/${requestId}`

      // Generate QR code
      const qrCodeDataURL = await this.generateQRCode(verificationUrl, qrOptions)

      // Load PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()

      console.log(`📄 Processing ${pages.length} page(s) with QR codes`)

      // Process each page (SignTusk approach - add QR to ALL pages)
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        console.log(`Page ${i + 1}: Original dimensions: ${width}x${height}`)

        // Create a new page with expanded dimensions (add 100px right, 100px bottom)
        const newPage = pdfDoc.insertPage(i, [width + 100, height + 100])

        console.log(`Page ${i + 1}: New dimensions: ${width + 100}x${height + 100}`)

        // Embed the original page content
        const embeddedPage = await pdfDoc.embedPage(page)

        // Draw the original content on the new page (offset by 100px bottom)
        newPage.drawPage(embeddedPage, {
          x: 0,
          y: 100, // Offset to make room for signature area
          width: width,
          height: height,
        })

        // Add signature area background (bottom area) - Light blue
        newPage.drawRectangle({
          x: 0,
          y: 0,
          width: width + 100,
          height: 100,
          color: rgb(0.9, 0.95, 1.0), // Light blue background
          borderColor: rgb(0.7, 0.8, 0.9), // Subtle border
          borderWidth: 1,
        })

        // Add right area background (QR stamp area) - Light green
        newPage.drawRectangle({
          x: width,
          y: 100, // Above signature area
          width: 100,
          height: height,
          color: rgb(0.95, 1.0, 0.95), // Light green background
          borderColor: rgb(0.8, 0.9, 0.8), // Subtle border
          borderWidth: 1,
        })

        // Add QR code verification stamp (SignTusk style)
        // Create verification stamp box - Distinct yellow background
        newPage.drawRectangle({
          x: width,
          y: 0,
          width: 100,
          height: 100,
          color: rgb(1.0, 1.0, 0.8), // Light yellow for QR stamp
          borderColor: rgb(0.8, 0.6, 0), // Orange border
          borderWidth: 2,
        })

        const stampFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        // Convert QR code to bytes for embedding
        const qrCodeBytes = Uint8Array.from(
          atob(qrCodeDataURL.split(',')[1]),
          c => c.charCodeAt(0)
        )

        // Embed QR code image
        const qrImage = await pdfDoc.embedPng(qrCodeBytes)

        // Draw QR code filling most of the stamp area
        newPage.drawImage(qrImage, {
          x: width + 10,
          y: 25,
          width: 80,
          height: 80,
        })

        // Add verification text
        newPage.drawText('Scan to Verify', {
          x: width + 15,
          y: 10,
          font: stampFont,
          size: 8,
          color: rgb(0, 0, 0.8),
        })

        // Add area labels and information
        const textFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const labelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

        // Bottom signature area label
        newPage.drawText('SIGNATURE AREA', {
          x: 20,
          y: 75,
          font: labelFont,
          size: 12,
          color: rgb(0, 0, 0.8),
        })

        newPage.drawText('Digital signatures and verification information', {
          x: 20,
          y: 55,
          font: textFont,
          size: 10,
          color: rgb(0.3, 0.3, 0.6),
        })

        newPage.drawText('Added: ' + new Date().toLocaleDateString(), {
          x: 20,
          y: 35,
          font: textFont,
          size: 8,
          color: rgb(0.5, 0.5, 0.5),
        })

        console.log(`✅ QR code added to page ${i + 1}`)

        // Remove the original page
        pdfDoc.removePage(i + 1)
      }

      // Generate document hash for verification
      const documentHash = await this.generateDocumentHash(pdfBytes)

      // Store QR verification data
      await this.storeQRVerificationData({
        signature_request_id: requestId,
        verification_url: verificationUrl,
        qr_code_data: qrCodeDataURL,
        document_hash: documentHash,
        created_at: new Date().toISOString()
      })

      // Save modified PDF
      const modifiedPdfBytes = await pdfDoc.save()

      console.log('✅ QR code successfully added to all pages')
      return { success: true, pdfBytes: modifiedPdfBytes }

    } catch (error) {
      console.error('❌ Error adding QR code to PDF:', error)
      // Return original PDF on error (non-breaking)
      return { success: false, pdfBytes, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Generate QR code as data URL
   */
  private static async generateQRCode(data: string, options: QRCodeOptions): Promise<string> {
    const QRCodeLib = await getQRCode()
    if (!QRCodeLib) {
      throw new Error('QRCode library not available')
    }

    return await QRCodeLib.toDataURL(data, {
      width: options.size || 80,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: options.errorCorrectionLevel || 'M'
    })
  }

  /**
   * Generate document hash for verification
   */
  private static async generateDocumentHash(pdfBytes: Uint8Array): Promise<string> {
    // Create a proper ArrayBuffer from the Uint8Array
    const buffer = new ArrayBuffer(pdfBytes.length)
    const view = new Uint8Array(buffer)
    view.set(pdfBytes)
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  /**
   * Store QR verification data in database
   */
  private static async storeQRVerificationData(data: QRVerificationData): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('qr_verifications')
        .upsert(data, {
          onConflict: 'signature_request_id'
        })

      if (error) {
        console.error('❌ Error storing QR verification data:', error)
        throw error
      }

      console.log('✅ QR verification data stored successfully')
    } catch (error) {
      console.error('❌ Failed to store QR verification data:', error)
      // Don't throw - this shouldn't break PDF generation
    }
  }

  /**
   * Extract QR code from uploaded PDF
   */
  static async extractQRFromPDF(pdfBytes: Uint8Array): Promise<{
    success: boolean
    requestId?: string
    verificationUrl?: string
    error?: string
  }> {
    try {
      console.log('🔍 Extracting QR code from uploaded PDF...')

      // Load PDF document using pdf-lib (more reliable in Next.js)
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const pages = pdfDoc.getPages()

      console.log(`📄 Scanning ${pages.length} page(s) for QR codes`)

      // Check if PDF has expanded dimensions (indicating QR-enhanced PDF)
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const { width, height } = page.getSize()

        console.log(`Page ${i + 1}: Dimensions: ${width}x${height}`)

        // Check if this looks like a QR-enhanced PDF (expanded dimensions)
        if (width > 700 && height > 850) { // QR-enhanced PDF dimensions (712x892)
          console.log('✅ Detected QR-enhanced PDF structure')

          // Return success but require manual input for verification URL
          // This is because actual QR code reading from PDF requires complex image processing
          return {
            success: true,
            error: 'QR_DETECTION_NEEDED' // Special flag for frontend handling
          }
        }
      }

      return {
        success: false,
        error: 'No QR code detected in PDF. This may not be a SignTusk verified document.'
      }

    } catch (error) {
      console.error('❌ Error extracting QR from PDF:', error)
      return {
        success: false,
        error: 'Failed to process PDF file'
      }
    }
  }

  /**
   * Verify QR code and get document information
   */
  static async verifyQRCode(requestId: string): Promise<{
    success: boolean
    data?: any
    error?: string
  }> {
    try {
      // Get QR verification data
      const { data: qrData, error: qrError } = await supabaseAdmin
        .from('qr_verifications')
        .select('*')
        .eq('signature_request_id', requestId)
        .single()

      if (qrError || !qrData) {
        return { success: false, error: 'QR verification data not found' }
      }

      // Get signing request details
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        return { success: false, error: 'Signing request not found' }
      }

      // Get signers data
      const { data: signers, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order')

      // Get document data
      const { data: document, error: documentError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', signingRequest.document_template_id)
        .single()

      // Get user data for signature requester using admin client
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(signingRequest.initiated_by)

      // Combine the data
      const combinedData = {
        ...signingRequest,
        signers: signers || [],
        document: document ? {
          ...document,
          user_email: userData?.user?.email || 'Unknown',
          signature_type: signingRequest.total_signers > 1 ? 'Multi' : 'Single'
        } : {
          title: 'Unknown Document',
          file_name: 'Unknown',
          user_email: userData?.user?.email || 'Unknown',
          signature_type: signingRequest.total_signers > 1 ? 'Multi' : 'Single'
        }
      }

      return {
        success: true,
        data: {
          qr_verification: qrData,
          signing_request: combinedData,
          verification_status: 'valid',
          verified_at: new Date().toISOString()
        }
      }

    } catch (error) {
      console.error('❌ Error verifying QR code:', error)
      return { success: false, error: 'Verification failed' }
    }
  }
}

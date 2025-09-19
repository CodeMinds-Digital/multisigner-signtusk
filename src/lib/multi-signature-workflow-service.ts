import { supabaseAdmin } from './supabase-admin'
import { NotificationService } from './notification-service'
import { SequentialNotificationService } from './sequential-notification-service'

export interface MultiSignatureWorkflowConfig {
  requestId: string
  signingMode: 'sequential' | 'parallel'
  signers: Array<{
    id: string
    email: string
    name: string
    signing_order: number
    status: string
    signature_data?: any
  }>
}

export class MultiSignatureWorkflowService {
  /**
   * Check if all signers have completed signing
   */
  static async checkCompletionStatus(requestId: string): Promise<{
    allCompleted: boolean
    signedCount: number
    totalCount: number
    viewedCount: number
    nextSignerEmail?: string
  }> {
    try {
      // Get all signers for this request
      const { data: signers, error } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order', { ascending: true })

      if (error || !signers) {
        console.error('❌ Error fetching signers:', error)
        return { allCompleted: false, signedCount: 0, totalCount: 0, viewedCount: 0 }
      }

      const totalCount = signers.length
      const signedCount = signers.filter(s => s.status === 'signed' || s.signer_status === 'signed').length
      const viewedCount = signers.filter(s => s.viewed_at).length
      const allCompleted = signedCount === totalCount

      // For sequential signing, find next signer in order
      let nextSignerEmail: string | undefined
      if (!allCompleted) {
        // Find the next signer in signing order who hasn't signed yet
        const nextSigner = signers.find(s =>
          s.status !== 'signed' &&
          s.signer_status !== 'signed' &&
          s.status !== 'declined'
        )
        nextSignerEmail = nextSigner?.signer_email
      }

      return {
        allCompleted,
        signedCount,
        totalCount,
        viewedCount,
        nextSignerEmail
      }
    } catch {
      console.error('❌ Error checking completion status')
      return { allCompleted: false, signedCount: 0, totalCount: 0, viewedCount: 0 }
    }
  }

  /**
   * Update signing request progress
   */
  static async updateSigningProgress(requestId: string): Promise<boolean> {
    try {
      const status = await this.checkCompletionStatus(requestId)

      let documentStatus = 'pending'
      let requestStatus = 'in_progress'

      if (status.allCompleted) {
        documentStatus = 'completed'
        requestStatus = 'completed'
      } else if (status.signedCount > 0) {
        documentStatus = 'partially_signed'
        requestStatus = 'in_progress'
      }

      const { error } = await supabaseAdmin
        .from('signing_requests')
        .update({
          status: requestStatus,
          signed_count: status.signedCount,
          completed_signers: status.signedCount,
          viewed_signers: status.viewedCount,
          document_status: documentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) {
        console.error('❌ Error updating signing progress:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('❌ Error in updateSigningProgress:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return false
    }
  }

  /**
   * Generate final PDF when all signers complete
   */
  static async generateFinalPDF(requestId: string): Promise<string | null> {
    try {
      console.log('🎉 Generating final PDF for completed multi-signature request:', requestId)

      // Get signing request with all signers and document info
      const { data: signingRequest, error: requestError } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          signers:signing_request_signers(*),
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      if (requestError || !signingRequest) {
        console.error('❌ Error fetching signing request:', requestError)
        return null
      }

      // Check if all signers have completed
      const allSigners = signingRequest.signers || []
      const signedSigners = allSigners.filter((s: any) => s.status === 'signed' || s.signer_status === 'signed')

      if (signedSigners.length !== allSigners.length) {
        console.error('❌ Not all signers have completed signing')
        return null
      }

      // Get the original document URL
      const document = signingRequest.document
      if (!document) {
        console.error('❌ Document not found for signing request')
        return null
      }

      const originalPdfUrl = document.pdf_url || document.file_url
      if (!originalPdfUrl) {
        console.error('❌ No PDF URL found in document')
        return null
      }

      console.log('📄 Original PDF URL:', originalPdfUrl)
      console.log('👥 Signed signers:', signedSigners.length, 'of', allSigners.length)

      // Call the working PDF generation API endpoint
      const finalPdfUrl = await this.callPDFGenerationAPI(requestId)

      if (finalPdfUrl) {
        // Update the signing request with completion timestamp and final PDF URL
        await supabaseAdmin
          .from('signing_requests')
          .update({
            completed_at: new Date().toISOString(),
            final_pdf_url: finalPdfUrl,
            document_status: 'completed',
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', requestId)

        // Get signing request details for PDF notification
        const { data: signingRequest } = await supabaseAdmin
          .from('signing_requests')
          .select('*')
          .eq('id', requestId)
          .single()

        // Notify requester that final PDF is ready
        if (signingRequest && signingRequest.initiated_by) {
          try {
            await NotificationService.notifyPdfGenerated(
              signingRequest.initiated_by,
              signingRequest.title || 'Document',
              requestId,
              finalPdfUrl
            )
            console.log('📧 PDF generation notification sent to requester')
          } catch (error) {
            console.error('❌ Error sending PDF generation notification:', error)
          }
        }

        console.log('✅ Final PDF generated and database updated:', finalPdfUrl)
        return finalPdfUrl
      }

      return null
    } catch (error) {
      console.error('❌ Error generating final PDF:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return null
    }
  }

  /**
   * Generate PDF using the working pdfme-based logic (directly imported)
   */
  private static async callPDFGenerationAPI(requestId: string): Promise<string | null> {
    try {
      console.log('📞 Generating PDF using working pdfme logic for request:', requestId)

      // Import the working PDF generation logic directly
      const { generatePDFWithPDFMe } = await import('@/lib/pdf-generation-pdfme')

      // Call the working PDF generation function
      const finalPdfUrl = await generatePDFWithPDFMe(requestId)

      if (finalPdfUrl) {
        console.log('✅ PDF generation succeeded:', finalPdfUrl)
        return finalPdfUrl
      } else {
        console.error('❌ PDF generation failed - no URL returned')
        return null
      }

    } catch (error) {
      console.error('❌ Error in PDF generation:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return null
    }
  }



  /**
   * Handle signer completion (called after each signature)
   */
  static async handleSignerCompletion(requestId: string, signerEmail: string): Promise<{
    success: boolean
    allCompleted: boolean
    finalPdfUrl?: string
    nextSignerEmail?: string
  }> {
    try {
      console.log('📝 Handling signer completion:', { requestId, signerEmail })

      // Update progress
      const progressUpdated = await this.updateSigningProgress(requestId)
      if (!progressUpdated) {
        return { success: false, allCompleted: false }
      }

      // Check completion status
      const status = await this.checkCompletionStatus(requestId)

      // Get signing request details for notifications
      const { data: signingRequest } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          *,
          document:documents!document_template_id(*)
        `)
        .eq('id', requestId)
        .single()

      // Notify requester that someone signed
      if (signingRequest && signingRequest.initiated_by) {
        try {
          await NotificationService.notifySignatureCompleted(
            requestId,
            signingRequest.title || 'Document',
            signerEmail,
            signingRequest.initiated_by
          )
          console.log('📧 Signature completion notification sent to requester')
        } catch (error) {
          console.error('❌ Error sending signature completion notification:', error)
        }
      }

      if (status.allCompleted) {
        // Generate final PDF
        const finalPdfUrl = await this.generateFinalPDF(requestId)

        // Notify requester that all signatures are complete
        if (signingRequest && signingRequest.initiated_by) {
          try {
            // Get all signer emails
            const { data: allSigners } = await supabaseAdmin
              .from('signing_request_signers')
              .select('signer_email')
              .eq('signing_request_id', requestId)

            const signerEmails = allSigners?.map(s => s.signer_email) || []

            await NotificationService.notifyDocumentCompleted(
              requestId,
              signingRequest.title || 'Document',
              signingRequest.initiated_by,
              signerEmails
            )
            console.log('📧 Document completion notification sent to requester')
          } catch (error) {
            console.error('❌ Error sending document completion notification:', error)
          }
        }

        return {
          success: true,
          allCompleted: true,
          finalPdfUrl: finalPdfUrl || undefined
        }
      } else {
        // For sequential signing, notify next signer
        const { data: signingRequest } = await supabaseAdmin
          .from('signing_requests')
          .select(`
            *,
            document:documents!document_template_id(*)
          `)
          .eq('id', requestId)
          .single()

        // Get signing mode from document settings (since signing_requests.settings doesn't exist)
        let signingMode = 'sequential' // default to sequential to match creation default
        if (signingRequest?.document?.settings) {
          try {
            const settings = typeof signingRequest.document.settings === 'string'
              ? JSON.parse(signingRequest.document.settings)
              : signingRequest.document.settings
            signingMode = settings.signing_order || 'sequential'
          } catch {
            console.log('⚠️ Could not parse document settings, using sequential mode (default)')
          }
        }

        if (signingMode === 'sequential' && status.nextSignerEmail) {
          console.log('📧 Sequential signing: next signer is', status.nextSignerEmail)

          // Get all signers for notification
          const { data: allSigners } = await supabaseAdmin
            .from('signing_request_signers')
            .select('*')
            .eq('signing_request_id', requestId)
            .order('signing_order', { ascending: true })

          // Send notification to next signer
          try {
            const nextSigner = allSigners?.find((s: any) => s.signer_email === status.nextSignerEmail)
            if (nextSigner && signingRequest && allSigners) {
              const notificationConfig = {
                requestId,
                nextSignerEmail: status.nextSignerEmail,
                nextSignerName: nextSigner.signer_name,
                documentTitle: signingRequest.title || signingRequest.document?.name || 'Document',
                requesterName: signingRequest.initiated_by || 'Document Requester',
                requesterEmail: signingRequest.initiated_by || '',
                signingUrl: '', // Will be generated in the service
                expiresAt: signingRequest.expires_at,
                currentSignerOrder: nextSigner.signing_order,
                totalSigners: allSigners.length,
                previousSignerName: allSigners.find((s: any) => s.signer_email === signerEmail)?.signer_name
              }

              const notificationResult = await SequentialNotificationService.notifyNextSigner(notificationConfig)
              if (notificationResult.success) {
                console.log('✅ Sequential notification sent successfully')
              } else {
                console.error('❌ Failed to send sequential notification:', notificationResult.error)
              }
            }
          } catch (error) {
            console.error('❌ Error sending sequential notification:', error)
          }
        }

        return {
          success: true,
          allCompleted: false,
          nextSignerEmail: status.nextSignerEmail
        }
      }
    } catch (error) {
      console.error('❌ Error handling signer completion:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('❌ Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        requestId,
        signerEmail,
        timestamp: new Date().toISOString()
      })
      return { success: false, allCompleted: false }
    }
  }

  /**
   * Validate if a signer can sign in sequential mode
   */
  static async validateSequentialSigningPermission(requestId: string, signerEmail: string): Promise<{
    canSign: boolean
    error?: string
    signingMode: string
    currentSignerOrder?: number
    pendingSigners?: Array<{ name: string; email: string; order: number }>
  }> {
    try {
      // Get signing request with document info to check signing mode
      console.log('🔍 Fetching signing request and document data for:', requestId)
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
        return {
          canSign: false,
          error: 'Failed to fetch signing request',
          signingMode: 'sequential'
        }
      }

      // Check if this is a single signature document
      const { data: requestSigners, error: requestSignersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)

      if (requestSignersError || !requestSigners) {
        console.error('❌ Error fetching signers:', requestSignersError)
        return {
          canSign: false,
          error: 'Failed to fetch signers',
          signingMode: 'sequential'
        }
      }

      // For single signature documents, always use 'single' mode
      if (requestSigners.length === 1) {
        console.log('📝 SINGLE SIGNATURE DETECTED - Only one signer')
        return {
          canSign: true,
          signingMode: 'single',
          currentSignerOrder: 1
        }
      }

      console.log('🔍 Database query result:', {
        requestId,
        hasSigningRequest: !!signingRequest,
        hasDocument: !!signingRequest?.document,
        documentId: signingRequest?.document?.id,
        documentTitle: signingRequest?.document?.title,
        rawDocumentSettings: signingRequest?.document?.settings,
        queryError: requestError
      })

      if (requestError || !signingRequest) {
        console.error('❌ Error fetching signing request:', requestError)
        return {
          canSign: false,
          error: 'Signing request not found',
          signingMode: 'unknown'
        }
      }

      // Get signing mode from signature request metadata (better approach)
      let signingMode = 'sequential' // default to sequential

      console.log('🔍 Signature request metadata debug:', {
        requestId,
        signerEmail,
        hasMetadata: !!signingRequest?.metadata,
        rawMetadata: signingRequest?.metadata,
        metadataType: typeof signingRequest?.metadata,
        timestamp: new Date().toISOString()
      })

      // First try: Check signature request metadata field
      if (signingRequest?.metadata) {
        try {
          const metadata = typeof signingRequest.metadata === 'string'
            ? JSON.parse(signingRequest.metadata)
            : signingRequest.metadata

          if (metadata.signing_mode) {
            signingMode = metadata.signing_mode
            console.log('✅ Parsed signing mode from signature request metadata:', signingMode)
            console.log('🔍 Metadata parsing details:', {
              rawMetadata: signingRequest.metadata,
              parsedMetadata: metadata,
              extractedSigningMode: metadata.signing_mode,
              finalSigningMode: signingMode
            })
          } else {
            console.log('⚠️ No signing_mode in metadata, trying document settings fallback')
            // Fallback to document settings for backward compatibility
            if (signingRequest?.document?.settings) {
              try {
                const settings = typeof signingRequest.document.settings === 'string'
                  ? JSON.parse(signingRequest.document.settings)
                  : signingRequest.document.settings
                signingMode = settings.signing_order || 'sequential'
                console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
              } catch {
                console.log('⚠️ Could not parse document settings either, using sequential mode (default)')
              }
            }
          }
        } catch {
          console.log('⚠️ Could not parse signature request metadata, trying document settings fallback')
          // Fallback to document settings
          if (signingRequest?.document?.settings) {
            try {
              const settings = typeof signingRequest.document.settings === 'string'
                ? JSON.parse(signingRequest.document.settings)
                : signingRequest.document.settings
              signingMode = settings.signing_order || 'sequential'
              console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
            } catch {
              console.log('⚠️ Could not parse document settings either, using sequential mode (default)')
            }
          }
        }
      } else {
        console.log('⚠️ No signature request metadata found, trying document settings fallback')
        // Fallback to document settings for backward compatibility
        if (signingRequest?.document?.settings) {
          try {
            const settings = typeof signingRequest.document.settings === 'string'
              ? JSON.parse(signingRequest.document.settings)
              : signingRequest.document.settings
            signingMode = settings.signing_order || 'sequential'
            console.log('✅ Fallback: Parsed signing mode from document settings:', signingMode)
          } catch {
            console.log('⚠️ Could not parse document settings, using sequential mode (default)')
          }
        } else {
          console.log('⚠️ No document settings found either, using sequential mode (default)')
        }
      }

      // For parallel mode, always allow signing (any order)
      if (signingMode === 'parallel') {
        return { canSign: true, signingMode }
      }

      // For sequential mode, enforce strict signing order
      const { data: allSigners, error: signersError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .order('signing_order', { ascending: true })

      if (signersError || !allSigners) {
        return {
          canSign: false,
          error: 'Failed to validate signing order',
          signingMode
        }
      }

      // Find current signer
      const currentSigner = allSigners.find(s => s.signer_email === signerEmail)
      if (!currentSigner) {
        return {
          canSign: false,
          error: 'Signer not found in request',
          signingMode
        }
      }

      // Check if previous signers have completed
      const currentSignerIndex = allSigners.findIndex(s => s.signer_email === signerEmail)
      const previousSigners = allSigners.slice(0, currentSignerIndex)
      const incompletePreviousSigners = previousSigners.filter(s =>
        s.status !== 'signed' && s.signer_status !== 'signed'
      )

      if (incompletePreviousSigners.length > 0) {
        return {
          canSign: false,
          error: `Sequential signing: Previous signers must complete first.`,
          signingMode,
          currentSignerOrder: currentSigner.signing_order,
          pendingSigners: incompletePreviousSigners.map(s => ({
            name: s.signer_name || s.signer_email,
            email: s.signer_email,
            order: s.signing_order
          }))
        }
      }

      return {
        canSign: true,
        signingMode,
        currentSignerOrder: currentSigner.signing_order
      }
    } catch {
      console.error('❌ Error validating sequential signing permission')
      return {
        canSign: false,
        error: 'Failed to validate signing permission',
        signingMode: 'unknown'
      }
    }
  }

  /**
   * Handle document view tracking
   */
  static async trackDocumentView(requestId: string, signerEmail: string): Promise<boolean> {
    try {
      console.log('📊 Tracking document view:', { requestId, signerEmail })

      // Find the signer
      const { data: signer, error: signerError } = await supabaseAdmin
        .from('signing_request_signers')
        .select('*')
        .eq('signing_request_id', requestId)
        .eq('signer_email', signerEmail)
        .single()

      if (signerError || !signer) {
        console.log('❌ Signer not found for view tracking')
        return false
      }

      // Update viewed_at if not already set
      if (!signer.viewed_at) {
        const { error: updateError } = await supabaseAdmin
          .from('signing_request_signers')
          .update({
            viewed_at: new Date().toISOString(),
            signer_status: 'viewed',
            updated_at: new Date().toISOString()
          })
          .eq('id', signer.id)

        if (updateError) {
          console.error('❌ Error updating viewed_at:', updateError)
          return false
        }

        // Update overall progress
        await this.updateSigningProgress(requestId)
        console.log('✅ Document view tracked successfully')
      }

      return true
    } catch (error) {
      console.error('❌ Error tracking document view:', error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return false
    }
  }
}

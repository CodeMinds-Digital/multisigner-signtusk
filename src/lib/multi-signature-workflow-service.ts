import { supabaseAdmin } from './supabase-admin'

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

      // For sequential signing, find next signer
      let nextSignerEmail: string | undefined
      if (!allCompleted) {
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
    } catch (error) {
      console.error('❌ Error checking completion status:', error)
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
      return false
    }
  }

  /**
   * Generate final PDF when all signers complete
   */
  static async generateFinalPDF(requestId: string): Promise<string | null> {
    try {
      console.log('🎉 Generating final PDF for completed multi-signature request:', requestId)

      // Trigger PDF generation using the API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/signature-requests/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Final PDF generated successfully:', result.finalPdfUrl)
        
        // Update the signing request with completion timestamp
        await supabaseAdmin
          .from('signing_requests')
          .update({
            completed_at: new Date().toISOString(),
            final_pdf_url: result.finalPdfUrl
          })
          .eq('id', requestId)
          
        return result.finalPdfUrl
      } else {
        const errorData = await response.json()
        console.error('❌ PDF generation failed:', errorData.error)
        return null
      }
    } catch (error) {
      console.error('❌ Error generating final PDF:', error)
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

      if (status.allCompleted) {
        // Generate final PDF
        const finalPdfUrl = await this.generateFinalPDF(requestId)
        
        return {
          success: true,
          allCompleted: true,
          finalPdfUrl: finalPdfUrl || undefined
        }
      } else {
        // For sequential signing, notify next signer
        const { data: signingRequest } = await supabaseAdmin
          .from('signing_requests')
          .select('settings')
          .eq('id', requestId)
          .single()

        let signingMode = 'parallel'
        if (signingRequest?.settings) {
          try {
            const settings = typeof signingRequest.settings === 'string' 
              ? JSON.parse(signingRequest.settings) 
              : signingRequest.settings
            signingMode = settings.signing_order || 'parallel'
          } catch (e) {
            console.log('⚠️ Could not parse signing settings')
          }
        }

        if (signingMode === 'sequential' && status.nextSignerEmail) {
          console.log('📧 Sequential signing: next signer is', status.nextSignerEmail)
          // TODO: Send notification to next signer
        }

        return {
          success: true,
          allCompleted: false,
          nextSignerEmail: status.nextSignerEmail
        }
      }
    } catch (error) {
      console.error('❌ Error handling signer completion:', error)
      return { success: false, allCompleted: false }
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
      return false
    }
  }
}

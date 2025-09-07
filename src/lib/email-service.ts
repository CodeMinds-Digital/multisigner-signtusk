import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SignatureRequestEmail {
  to: string
  signerName: string
  documentTitle: string
  senderName: string
  message?: string
  dueDate?: string
  signatureUrl: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Send signature request email
export async function sendSignatureRequestEmail(emailData: SignatureRequestEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending signature request email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    const { data, error } = await resend.emails.send({
      from: 'SignTusk <onboarding@resend.dev>',
      to: [emailData.to],
      subject: `Signature Request: ${emailData.documentTitle}`,
      html: generateSignatureRequestHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
  }
}

// Send multiple signature request emails
export async function sendBulkSignatureRequests(
  documentTitle: string,
  senderName: string,
  signers: Array<{ name: string; email: string }>,
  options: {
    message?: string
    dueDate?: string
    documentId: string
  }
): Promise<{ success: boolean; results: EmailResult[]; errors: string[] }> {
  const results: EmailResult[] = []
  const errors: string[] = []

  for (const signer of signers) {
    const signatureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${options.documentId}?signer=${encodeURIComponent(signer.email)}`

    const emailData: SignatureRequestEmail = {
      to: signer.email,
      signerName: signer.name,
      documentTitle,
      senderName,
      message: options.message,
      dueDate: options.dueDate,
      signatureUrl
    }

    const result = await sendSignatureRequestEmail(emailData)
    results.push(result)

    if (!result.success) {
      errors.push(`Failed to send to ${signer.email}: ${result.error}`)
    }

    // Add delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const successCount = results.filter(r => r.success).length
  const success = successCount > 0

  return {
    success,
    results,
    errors
  }
}

// Generate HTML email template
function generateSignatureRequestHTML(emailData: SignatureRequestEmail): string {
  const dueText = emailData.dueDate
    ? `<p><strong>Due Date:</strong> ${new Date(emailData.dueDate).toLocaleDateString()}</p>`
    : ''

  const messageText = emailData.message
    ? `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
         <p><strong>Message from ${emailData.senderName}:</strong></p>
         <p style="font-style: italic;">"${emailData.message}"</p>
       </div>`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Signature Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">SignTusk</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Digital Document Signing</p>
      </div>
      
      <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #1f2937; margin-top: 0;">Signature Request</h2>
        
        <p>Hello ${emailData.signerName},</p>
        
        <p>${emailData.senderName} has requested your signature on the following document:</p>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">${emailData.documentTitle}</h3>
          ${dueText}
        </div>
        
        ${messageText}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${emailData.signatureUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Review & Sign Document
          </a>
        </div>
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #6b7280;">
          <p><strong>What happens next?</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Click the button above to review the document</li>
            <li>Add your digital signature where indicated</li>
            <li>Submit the signed document</li>
            <li>All parties will receive a copy of the signed document</li>
          </ul>
          
          <p style="margin-top: 20px;">
            <strong>Need help?</strong> Contact ${emailData.senderName} or visit our 
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/help" style="color: #2563eb;">help center</a>.
          </p>
          
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            This signature request was sent via SignTusk. If you believe you received this email in error, 
            please contact the sender directly.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Simulate email sending for development/testing
function simulateEmailSend(emailData: SignatureRequestEmail): EmailResult {
  console.log('📧 SIMULATED EMAIL SEND:')
  console.log('To:', emailData.to)
  console.log('Subject: Signature Request:', emailData.documentTitle)
  console.log('Signature URL:', emailData.signatureUrl)
  console.log('---')

  // Simulate success with a fake message ID
  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'RESEND_API_KEY environment variable is not set'
      }
    }

    // Test with a simple email send
    const testResult = await resend.emails.send({
      from: 'SignTusk <onboarding@resend.dev>',
      to: ['test@example.com'],
      subject: 'SignTusk Email Configuration Test',
      html: '<p>This is a test email to verify Resend configuration.</p>',
    })

    if (testResult.error) {
      return {
        success: false,
        error: testResult.error.message
      }
    }

    return { success: true }

  } catch (error: any) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Resend signature request
export async function resendSignatureRequest(
  documentId: string,
  signerEmail: string,
  documentTitle: string,
  senderName: string
): Promise<EmailResult> {
  const signatureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${documentId}?signer=${encodeURIComponent(signerEmail)}`

  const emailData: SignatureRequestEmail = {
    to: signerEmail,
    signerName: signerEmail.split('@')[0], // Use email prefix as fallback name
    documentTitle,
    senderName,
    signatureUrl,
    message: 'This is a reminder to sign the document.'
  }

  return await sendSignatureRequestEmail(emailData)
}

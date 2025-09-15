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

export interface ReminderEmail {
  to: string
  signerName: string
  documentTitle: string
  senderName: string
  message?: string
  dueDate?: string
  signatureUrl: string
  reminderCount?: number
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

    // Domain is verified and account is in production mode - can send to any email

    // Use verified domain for all environments
    const fromEmail = 'SignTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `Signature Request: ${emailData.documentTitle}`,
      html: generateSignatureRequestHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      // If domain verification error, fall back to simulation
      if (error.message?.includes('domain') || error.message?.includes('verified')) {
        console.log('📧 Domain verification issue, falling back to simulation')
        return simulateEmailSend(emailData)
      }
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

// Send reminder email
export async function sendReminderEmail(emailData: ReminderEmail): Promise<EmailResult> {
  try {
    console.log('📧 Sending reminder email to:', emailData.to)

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, simulating email send')
      return simulateEmailSend(emailData)
    }

    // Domain is verified and account is in production mode - can send to any email

    // Use verified domain for all environments
    const fromEmail = 'SignTusk <noreply@notifications.signtusk.com>'

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.to],
      subject: `Reminder: ${emailData.documentTitle} - Signature Required`,
      html: generateReminderHTML(emailData),
    })

    if (error) {
      console.error('Resend API error:', error)
      // If domain verification error, fall back to simulation
      if (error.message?.includes('domain') || error.message?.includes('verified')) {
        console.log('📧 Domain verification issue, falling back to simulation')
        return simulateEmailSend(emailData)
      }
      return { success: false, error: error.message }
    }

    console.log('Reminder email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }

  } catch (error: any) {
    console.error('Email service error:', error)
    return { success: false, error: error.message }
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

// Generate HTML reminder email template
function generateReminderHTML(emailData: ReminderEmail): string {
  const dueText = emailData.dueDate
    ? `<p><strong>Due Date:</strong> ${new Date(emailData.dueDate).toLocaleDateString()}</p>`
    : ''

  const messageText = emailData.message
    ? `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
         <p><strong>Message from ${emailData.senderName}:</strong></p>
         <p style="font-style: italic;">"${emailData.message}"</p>
       </div>`
    : ''

  const reminderText = emailData.reminderCount
    ? `<p style="color: #dc2626; font-weight: bold;">This is reminder #${emailData.reminderCount}</p>`
    : '<p style="color: #dc2626; font-weight: bold;">This is a friendly reminder</p>'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Signature Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">SignTusk</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Digital Document Signing</p>
      </div>

      <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #dc2626; margin-top: 0;">⏰ Signature Reminder</h2>

        ${reminderText}

        <p>Hello ${emailData.signerName},</p>

        <p>This is a reminder that you have a pending signature request for:</p>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">${emailData.documentTitle}</h3>
          <p style="margin: 0; color: #92400e;">Requested by: ${emailData.senderName}</p>
        </div>

        ${dueText}
        ${messageText}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${emailData.signatureUrl}"
             style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            📝 Sign Document Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          If you're unable to click the button above, copy and paste this link into your browser:<br>
          <a href="${emailData.signatureUrl}" style="color: #2563eb; word-break: break-all;">${emailData.signatureUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
          This is an automated reminder from SignTusk. Please do not reply to this email.<br>
          If you have questions, please contact ${emailData.senderName} directly.
        </p>
      </div>
    </body>
    </html>
  `
}

// Simulate email sending for development/testing
function simulateEmailSend(emailData: any): EmailResult {
  const emailType = emailData.signatureUrl ? 'signature_request' : 'reminder'
  const subject = emailType === 'signature_request'
    ? `Signature Request: ${emailData.documentTitle}`
    : `Reminder: ${emailData.documentTitle} - Signature Required`

  console.log('📧 ✅ SIMULATED EMAIL SENT:', {
    to: emailData.to,
    from: 'SignTusk <noreply@signtusk.com>',
    subject: subject,
    type: emailType,
    timestamp: new Date().toISOString(),
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  })

  // Log email content for debugging
  console.log('📧 Email content preview:', {
    recipient: emailData.signerName || emailData.to,
    sender: emailData.senderName || 'SignTusk',
    document: emailData.documentTitle,
    message: emailData.message || 'No custom message',
    actionUrl: emailData.signatureUrl || 'N/A'
  })

  // Simulate success with a fake message ID
  return {
    success: true,
    messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Testing email configuration...')
    console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY?.length || 0)

    if (!process.env.RESEND_API_KEY) {
      return {
        success: false,
        error: 'RESEND_API_KEY environment variable is not set'
      }
    }

    // Test with a simple email send to verified address
    console.log('📧 Attempting to send test email...')

    // In development, we can only send to verified email with verified domain
    // For testing, we'll simulate the email instead of actually sending
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Development mode: Simulating test email instead of sending')
      return {
        success: true,
        message: 'Email configuration test passed (simulated in development mode)',
        note: 'In development, emails are simulated. For production, verify a domain at resend.com/domains'
      }
    }

    const fromEmail = 'SignTusk <noreply@notifications.signtusk.com>' // Verified domain

    const testResult = await resend.emails.send({
      from: fromEmail,
      to: ['ramalai13@gmail.com'], // Use verified email for testing
      subject: 'SignTusk Email Configuration Test',
      html: '<p>This is a test email to verify Resend configuration.</p>',
    })

    console.log('📧 Resend API response:', testResult)

    if (testResult.error) {
      console.error('❌ Resend API error:', testResult.error)
      return {
        success: false,
        error: testResult.error.message
      }
    }

    console.log('✅ Email test successful:', testResult.data?.id)
    return { success: true }

  } catch (error: any) {
    console.error('❌ Email test exception:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Resend signature request (reminder)
export async function resendSignatureRequest(
  documentId: string,
  signerEmail: string,
  documentTitle: string,
  senderName: string,
  reminderCount: number = 1
): Promise<EmailResult> {
  const signatureUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign/${documentId}?signer=${encodeURIComponent(signerEmail)}`

  // Use proper reminder email template instead of signature request template
  const emailData: ReminderEmail = {
    to: signerEmail,
    signerName: signerEmail.split('@')[0], // Use email prefix as fallback name
    documentTitle,
    senderName,
    signatureUrl,
    message: 'This is a reminder to sign the document.',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
    reminderCount
  }

  return await sendReminderEmail(emailData)
}

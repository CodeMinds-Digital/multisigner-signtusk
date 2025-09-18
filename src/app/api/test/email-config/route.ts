import { NextRequest } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing email configuration...')

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'RESEND_API_KEY not configured',
          details: 'Please set RESEND_API_KEY in your environment variables'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check API key format
    if (!process.env.RESEND_API_KEY.startsWith('re_')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid RESEND_API_KEY format',
          details: 'Resend API keys should start with "re_"'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get test email from request body
    const { testEmail } = await request.json().catch(() => ({ testEmail: 'test@example.com' }))

    console.log('📧 Attempting to send test email to:', testEmail)
    console.log('🔑 Using API key:', process.env.RESEND_API_KEY.substring(0, 10) + '...')

    // Try to send a test email
    const result = await resend.emails.send({
      from: `SignTusk Test <${process.env.EMAIL_FROM_ADDRESS || 'noreply@signtusk.com'}>`,
      to: [testEmail],
      subject: '🧪 SignTusk Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">✅ Email Configuration Test Successful!</h2>
          <p>This is a test email from your SignTusk application.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>App URL:</strong> ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you received this email, your Resend configuration is working correctly!
          </p>
        </div>
      `,
      text: `
SignTusk Email Configuration Test

✅ Email Configuration Test Successful!

This is a test email from your SignTusk application.

Timestamp: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
App URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}

If you received this email, your Resend configuration is working correctly!
      `,
      headers: {
        'X-SignTusk-Type': 'configuration-test'
      }
    })

    console.log('📧 Resend API response:', result)

    if (result.error) {
      console.error('❌ Resend API error:', result.error)
      
      // Handle specific error types
      if (result.error.message?.includes('restricted_api_key')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Restricted API Key',
            details: 'Your Resend API key is restricted to sending only. This is normal and emails should still work.',
            solution: 'Your current API key should work fine for sending emails. The restriction only affects other API features.',
            apiKeyType: 'restricted',
            canSendEmails: true
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error.message,
          details: result.error,
          apiKeyType: 'unknown'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Test email sent successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.data?.id,
        message: 'Test email sent successfully',
        details: {
          to: testEmail,
          messageId: result.data?.id,
          apiKeyType: 'full_access',
          timestamp: new Date().toISOString()
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Email configuration test failed:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({ 
      message: 'Email configuration test endpoint',
      usage: 'POST with { "testEmail": "your-email@example.com" }',
      environment: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 5) + '...',
        fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@signtusk.com',
        fromName: process.env.EMAIL_FROM_NAME || 'SignTusk',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      }
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

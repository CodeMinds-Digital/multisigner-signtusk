import { NextRequest, NextResponse } from 'next/server'
import { testEmailConfiguration, sendSignatureRequestEmail, sendReminderEmail } from '@/lib/email-service'
import type { SignatureRequestEmail, ReminderEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
    try {
        console.log('🧪 Testing email configuration...')

        // Test email configuration
        const configTest = await testEmailConfiguration()

        // Test actual email sending with different scenarios
        const testResults = []

        // Test 1: Send to verified email (should work)
        const verifiedEmailTest: SignatureRequestEmail = {
            to: 'ramalai13@gmail.com', // Verified email
            signerName: 'Test User (Verified)',
            documentTitle: 'Test Document - Verified Email',
            senderName: 'SignTusk Test',
            message: 'This is a test signature request to verified email',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            signatureUrl: 'http://localhost:3000/sign/test-verified'
        }

        const verifiedResult = await sendSignatureRequestEmail(verifiedEmailTest)
        testResults.push({ type: 'verified_email', result: verifiedResult })

        // Test 2: Send to unverified email (should work in production mode)
        const unverifiedEmailTest: SignatureRequestEmail = {
            to: 'test@example.com', // Unverified email
            signerName: 'Test User (Unverified)',
            documentTitle: 'Test Document - Unverified Email',
            senderName: 'SignTusk Test',
            message: 'This is a test signature request to unverified email',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            signatureUrl: 'http://localhost:3000/sign/test-unverified'
        }

        const unverifiedResult = await sendSignatureRequestEmail(unverifiedEmailTest)
        testResults.push({ type: 'unverified_email', result: unverifiedResult })

        // Test 3: Test reminder email
        const reminderTest: ReminderEmail = {
            to: 'test@example.com',
            signerName: 'Test User',
            documentTitle: 'Test Document - Reminder',
            senderName: 'SignTusk Test',
            message: 'This is a test reminder email',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            signatureUrl: 'http://localhost:3000/sign/test-reminder',
            reminderCount: 1
        }

        const reminderResult = await sendReminderEmail(reminderTest)
        testResults.push({ type: 'reminder_email', result: reminderResult })

        return NextResponse.json({
            success: true,
            configTest,
            emailTests: testResults,
            environment: {
                hasResendKey: !!process.env.RESEND_API_KEY,
                resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
                appUrl: process.env.NEXT_PUBLIC_APP_URL,
                nodeEnv: process.env.NODE_ENV
            },
            recommendations: {
                development: 'Emails are sent using verified domain notifications.signtusk.com',
                production: 'Domain is verified and working correctly',
                currentStatus: 'Production mode - can send to any email address'
            }
        })

    } catch (error: any) {
        console.error('Email test failed:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
            details: 'Email test failed with exception'
        }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Email test endpoint is available. Use POST to run tests.',
        endpoints: {
            POST: 'Run comprehensive email tests',
            GET: 'Get endpoint information'
        }
    })
}
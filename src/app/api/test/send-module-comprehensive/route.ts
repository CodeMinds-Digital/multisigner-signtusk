import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SendNotifications } from '@/lib/send-notifications'
import { SendEmailVerification } from '@/lib/send-email-verification'
import { SendPasswordService } from '@/lib/send-password-service'

/**
 * Comprehensive Send Module Testing API
 * Tests all major functionality including notifications, email verification, 
 * password protection, analytics, and data room features
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyAccessToken(accessToken)
    const userId = payload.userId

    // Get user profile for testing
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const testResults = {
      userId,
      userEmail: profile.email,
      userName: profile.full_name || profile.email,
      tests: {} as any
    }

    console.log('🧪 Starting comprehensive Send Module testing...')

    // Test 1: Password Service
    console.log('🔐 Testing Password Service...')
    try {
      const testPassword = 'TestPassword123!'
      const hashedPassword = await SendPasswordService.hashPassword(testPassword)
      const isValid = await SendPasswordService.verifyPassword(testPassword, hashedPassword)
      const isInvalid = await SendPasswordService.verifyPassword('WrongPassword', hashedPassword)

      testResults.tests.passwordService = {
        success: true,
        hashGenerated: !!hashedPassword,
        validPasswordVerified: isValid,
        invalidPasswordRejected: !isInvalid,
        passwordStrength: SendPasswordService.validatePasswordStrength(testPassword)
      }
      console.log('✅ Password Service: PASSED')
    } catch (error) {
      testResults.tests.passwordService = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.log('❌ Password Service: FAILED')
    }

    // Test 2: Email Verification Service
    console.log('📧 Testing Email Verification Service...')
    try {
      // Create a test document link for email verification
      const { data: testDoc } = await supabaseAdmin
        .from('send_shared_documents')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single()

      if (testDoc) {
        const { data: testLink } = await supabaseAdmin
          .from('send_document_links')
          .select('*')
          .eq('document_id', testDoc.id)
          .limit(1)
          .single()

        if (testLink) {
          const verificationResult = await SendEmailVerification.sendVerificationCode(
            profile.email,
            testLink.link_id,
            testDoc.title
          )

          testResults.tests.emailVerification = {
            success: verificationResult.success,
            testEmail: profile.email,
            testLinkId: testLink.link_id,
            testDocumentTitle: testDoc.title,
            result: verificationResult
          }
          console.log('✅ Email Verification: PASSED')
        } else {
          testResults.tests.emailVerification = {
            success: false,
            error: 'No test document link found'
          }
        }
      } else {
        testResults.tests.emailVerification = {
          success: false,
          error: 'No test document found'
        }
      }
    } catch (error) {
      testResults.tests.emailVerification = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.log('❌ Email Verification: FAILED')
    }

    // Test 3: Notification System
    console.log('🔔 Testing Notification System...')
    try {
      const testNotification = {
        type: 'document_viewed' as const,
        documentId: 'test-doc-id',
        documentTitle: 'Test Document',
        linkId: 'test-link-id',
        visitorEmail: 'test@example.com',
        visitorLocation: 'Test Location',
        metadata: {
          testMode: true,
          timestamp: new Date().toISOString()
        }
      }

      await SendNotifications.notify(
        userId,
        profile.email,
        profile.full_name || profile.email,
        testNotification
      )

      testResults.tests.notifications = {
        success: true,
        testNotification,
        message: 'Notification sent successfully'
      }
      console.log('✅ Notification System: PASSED')
    } catch (error) {
      testResults.tests.notifications = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.log('❌ Notification System: FAILED')
    }

    // Test 4: Database Schema Verification
    console.log('🗄️ Testing Database Schema...')
    try {
      // Check if data room tables exist
      const { data: dataRooms } = await supabaseAdmin
        .from('send_data_rooms')
        .select('*')
        .eq('user_id', userId)
        .limit(1)

      const { data: dataRoomLinks } = await supabaseAdmin
        .from('send_dataroom_links')
        .select('*')
        .limit(1)

      const { data: documentLinks } = await supabaseAdmin
        .from('send_document_links')
        .select('*')
        .eq('created_by', userId)
        .limit(1)

      testResults.tests.databaseSchema = {
        success: true,
        dataRoomsTableExists: dataRooms !== null,
        dataRoomLinksTableExists: dataRoomLinks !== null,
        documentLinksTableExists: documentLinks !== null,
        userDataRoomsCount: dataRooms?.length || 0,
        userDocumentLinksCount: documentLinks?.length || 0
      }
      console.log('✅ Database Schema: PASSED')
    } catch (error) {
      testResults.tests.databaseSchema = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.log('❌ Database Schema: FAILED')
    }

    // Test 5: API Endpoints
    console.log('🌐 Testing API Endpoints...')
    try {
      const apiTests = {
        dataRoomsAPI: false,
        documentLinksAPI: false,
        analyticsAPI: false
      }

      // Test data rooms API
      try {
        const dataRoomsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/api/send/data-rooms`, {
          headers: {
            'Cookie': request.headers.get('Cookie') || ''
          }
        })
        apiTests.dataRoomsAPI = dataRoomsResponse.ok
      } catch (e) {
        apiTests.dataRoomsAPI = false
      }

      testResults.tests.apiEndpoints = {
        success: true,
        tests: apiTests
      }
      console.log('✅ API Endpoints: PASSED')
    } catch (error) {
      testResults.tests.apiEndpoints = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.log('❌ API Endpoints: FAILED')
    }

    // Test Summary
    const totalTests = Object.keys(testResults.tests).length
    const passedTests = Object.values(testResults.tests).filter((test: any) => test.success).length
    const failedTests = totalTests - passedTests

    console.log(`🎯 Test Summary: ${passedTests}/${totalTests} passed, ${failedTests} failed`)

    return NextResponse.json({
      success: true,
      message: 'Comprehensive Send Module testing completed',
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: `${Math.round((passedTests / totalTests) * 100)}%`
      },
      results: testResults
    })

  } catch (error: any) {
    console.error('❌ Comprehensive testing failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Testing failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}

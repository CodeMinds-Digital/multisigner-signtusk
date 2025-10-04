import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

export async function GET(request: NextRequest) {
  try {
    console.log('📧 GET /api/user/notification-preferences - Request received')

    // Get and verify access token
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      console.error('❌ No access token found in request')
      return NextResponse.json(
        { error: 'Session expired. Please re-login.' },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch (error) {
      console.error('❌ Invalid or expired access token:', error)
      return NextResponse.json(
        { error: 'Session expired. Please re-login.' },
        { status: 401 }
      )
    }

    const userId = payload.userId
    console.log('✅ User authenticated:', userId)

    // Get notification preferences
    const preferences = await NotificationService.getNotificationPreferences(userId)
    console.log('✅ Preferences fetched successfully')

    return NextResponse.json(preferences)
  } catch (error: any) {
    console.error('❌ Exception in GET /api/user/notification-preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📧 PUT /api/user/notification-preferences - Request received')

    // Get and verify access token
    const { accessToken } = getAuthTokensFromRequest(request)

    if (!accessToken) {
      console.error('❌ No access token found in request')
      return NextResponse.json(
        { success: false, error: 'Session expired. Please re-login to update preferences.' },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(accessToken)
    } catch (error) {
      console.error('❌ Invalid or expired access token:', error)
      return NextResponse.json(
        { success: false, error: 'Session expired. Please re-login to update preferences.' },
        { status: 401 }
      )
    }

    const userId = payload.userId
    console.log('✅ User authenticated:', userId)

    // Get preferences from request body
    const updates = await request.json()
    console.log('📧 Preference updates:', updates)

    // Validate updates
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      console.error('❌ Invalid update data:', updates)
      return NextResponse.json(
        { success: false, error: 'Invalid preference data' },
        { status: 400 }
      )
    }

    // Update notification preferences
    const success = await NotificationService.updateNotificationPreferences(userId, updates)

    if (success) {
      console.log('✅ Preferences updated successfully')
      return NextResponse.json({ success: true })
    } else {
      console.error('❌ Failed to update preferences in database')
      return NextResponse.json(
        { success: false, error: 'Unable to save your preference. Please try again later.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('❌ Exception in PUT /api/user/notification-preferences:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to save your preference. Please try again later.',
        details: error.message
      },
      { status: 500 }
    )
  }
}


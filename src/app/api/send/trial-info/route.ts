import { NextRequest, NextResponse } from 'next/server'
import { getAuthTokensFromRequest, verifyAccessToken } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/send/trial-info - Get user's trial information
export async function GET(request: NextRequest) {
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

    // Get user's subscription info (for now, simulate trial data)
    // In a real app, you'd have a subscriptions table
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (userError) {
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { error: 'Failed to fetch user information' },
        { status: 500 }
      )
    }

    // Get usage statistics
    const [dataRoomsRes, collaboratorsRes, documentsRes] = await Promise.all([
      supabaseAdmin
        .from('send_data_rooms')
        .select('id')
        .eq('user_id', userId),
      supabaseAdmin
        .from('send_dataroom_collaborators')
        .select('id')
        .in('data_room_id', 
          supabaseAdmin
            .from('send_data_rooms')
            .select('id')
            .eq('user_id', userId)
        ),
      supabaseAdmin
        .from('send_documents')
        .select('id')
        .in('data_room_id', 
          supabaseAdmin
            .from('send_data_rooms')
            .select('id')
            .eq('user_id', userId)
        )
    ])

    const dataRoomsCount = dataRoomsRes.data?.length || 0
    const collaboratorsCount = collaboratorsRes.data?.length || 0
    const documentsCount = documentsRes.data?.length || 0

    // Check if user has custom branding
    const { data: brandingData } = await supabaseAdmin
      .from('send_dataroom_branding')
      .select('id')
      .in('data_room_id', 
        supabaseAdmin
          .from('send_data_rooms')
          .select('id')
          .eq('user_id', userId)
      )
      .limit(1)

    const hasCustomBranding = (brandingData?.length || 0) > 0

    // For demo purposes, simulate trial data
    // In production, you'd check actual subscription status
    const trialStartDate = new Date(user?.created_at || Date.now())
    const trialEndDate = new Date(trialStartDate.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days
    const now = new Date()
    const daysRemaining = Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))

    const trialInfo = {
      is_trial: daysRemaining > 0, // Simulate trial status
      trial_expires_at: trialEndDate.toISOString(),
      trial_days_remaining: daysRemaining,
      features_used: {
        data_rooms_created: dataRoomsCount,
        collaborators_invited: collaboratorsCount,
        documents_uploaded: documentsCount,
        custom_branding_used: hasCustomBranding
      },
      limits: {
        max_data_rooms: 3,
        max_collaborators: 10,
        max_documents: 50,
        custom_branding: true
      }
    }

    return NextResponse.json({
      success: true,
      trial_info: trialInfo
    })

  } catch (error: any) {
    console.error('Get trial info error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

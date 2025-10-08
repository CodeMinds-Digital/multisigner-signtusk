import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthTokensFromRequest } from '@/lib/auth-cookies'
import { verifyAccessToken } from '@/lib/jwt-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/send/teams - Get user's teams
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

    // Get teams where user is owner or member
    const { data: ownedTeams, error: ownedError } = await supabaseAdmin
      .from('send_teams')
      .select('*')
      .eq('owner_id', userId)

    if (ownedError) {
      console.error('Error fetching owned teams:', ownedError)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    const { data: memberTeams, error: memberError } = await supabaseAdmin
      .from('send_team_members')
      .select(`
        team_id,
        send_teams (
          id,
          name,
          slug,
          owner_id,
          plan,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (memberError) {
      console.error('Error fetching member teams:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      )
    }

    // Combine teams and deduplicate by ID
    const ownedTeamsList = ownedTeams || []
    const memberTeamsList = memberTeams?.map(m => m.send_teams).filter(Boolean) || []

    // Create a Map to deduplicate teams by ID
    const teamsMap = new Map()

    // Add owned teams first (they take priority)
    ownedTeamsList.forEach(team => {
      teamsMap.set(team.id, team)
    })

    // Add member teams only if not already present
    memberTeamsList.forEach((team: any) => {
      if (!teamsMap.has(team.id)) {
        teamsMap.set(team.id, team)
      }
    })

    const allTeams = Array.from(teamsMap.values())

    return NextResponse.json({
      success: true,
      teams: allTeams
    })
  } catch (error: any) {
    console.error('Error in GET /api/send/teams:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/send/teams - Create a new team
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

    const body = await request.json()
    const { name, slug, plan = 'free' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }

    // Generate slug if not provided
    const teamSlug = slug || name.toLowerCase().replace(/\s+/g, '-')

    // Create the team
    const { data: team, error: teamError } = await supabaseAdmin
      .from('send_teams')
      .insert({
        name,
        slug: teamSlug,
        owner_id: userId,
        plan
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }

    // Add the owner as a team member
    const { error: memberError } = await supabaseAdmin
      .from('send_team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'owner',
        permissions: ['read', 'write', 'admin']
      })

    if (memberError) {
      console.error('Error adding team member:', memberError)
      // If adding member fails, clean up the team
      await supabaseAdmin.from('send_teams').delete().eq('id', team.id)
      return NextResponse.json(
        { error: 'Failed to create team' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      team
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in POST /api/send/teams:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

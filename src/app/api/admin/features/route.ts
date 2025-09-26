import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabaseInstance } from '@/lib/admin-supabase'
import { validateAdminSession, logAdminAction, hasAdminPermission } from '@/lib/real-admin-auth'

// =====================================================
// REAL FEATURE FLAGS API
// Manages real feature toggles that affect the application
// =====================================================

export interface FeatureFlag {
  id: string
  name: string
  key: string
  description: string
  category: 'core' | 'premium' | 'experimental' | 'integration'
  is_enabled: boolean
  is_global: boolean
  user_restrictions: string[]
  plan_restrictions: string[]
  rollout_percentage: number
  dependencies: string[]
  impact_level: 'low' | 'medium' | 'high' | 'critical'
  updated_by?: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/admin/features - Get all feature flags
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 })
    }

    const session = await validateAdminSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check permissions
    if (!hasAdminPermission('view_features', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const enabled = searchParams.get('enabled')

    // Build query
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Failed to get admin Supabase instance' }, { status: 500 })
    }
    let query = adminSupabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category !== 'all') {
      query = query.eq('category', category)
    }

    if (enabled !== null) {
      query = query.eq('is_enabled', enabled === 'true')
    }

    const { data: features, error } = await query

    if (error) {
      console.error('Error fetching feature flags:', error)
      return NextResponse.json({ error: 'Failed to fetch feature flags' }, { status: 500 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      'view_features',
      'feature_flags',
      undefined,
      undefined,
      { category, enabled }
    )

    return NextResponse.json({
      features: features || [],
      categories: ['core', 'premium', 'experimental', 'integration']
    })

  } catch (error) {
    console.error('Error in admin features API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/features - Manage feature flags
 */
export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 })
    }

    const session = await validateAdminSession(token)
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
    }

    // Check permissions
    if (!hasAdminPermission('manage_features', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, featureId, featureData } = body

    let result

    switch (action) {
      case 'toggle':
        result = await toggleFeature(featureId, session.user.id)
        break
      case 'update_rollout':
        result = await updateRolloutPercentage(featureId, featureData.rollout_percentage, session.user.id)
        break
      case 'update_restrictions':
        result = await updateRestrictions(featureId, featureData, session.user.id)
        break
      case 'create':
        result = await createFeature(featureData, session.user.id)
        break
      case 'delete':
        result = await deleteFeature(featureId, session.user.id)
        break
      case 'bulk_toggle':
        result = await bulkToggleFeatures(featureData.featureIds, featureData.enabled, session.user.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      `feature_${action}`,
      'feature_flag',
      featureId || featureData?.featureIds?.join(','),
      undefined,
      featureData
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in admin features POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Toggle feature flag
 */
async function toggleFeature(featureId: string, updatedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }

    // Get current feature
    const { data: currentFeature } = await (adminSupabase as any)
      .from('feature_flags')
      .select('*')
      .eq('id', featureId)
      .single()

    if (!currentFeature) {
      return { success: false, error: 'Feature flag not found' }
    }

    // Toggle the feature
    const { data: updatedFeature, error } = await (adminSupabase as any)
      .from('feature_flags')
      .update({
        is_enabled: !(currentFeature as any).is_enabled,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', featureId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling feature:', error)
      return { success: false, error: error.message }
    }

    // Apply feature change to application
    await applyFeatureChange(currentFeature.key, !currentFeature.is_enabled)

    return {
      success: true,
      feature: updatedFeature,
      message: `Feature ${updatedFeature.is_enabled ? 'enabled' : 'disabled'} successfully`
    }

  } catch (error) {
    console.error('Error toggling feature:', error)
    return { success: false, error: 'Failed to toggle feature' }
  }
}

/**
 * Update rollout percentage
 */
async function updateRolloutPercentage(featureId: string, percentage: number, updatedBy: string) {
  try {
    if (percentage < 0 || percentage > 100) {
      return { success: false, error: 'Rollout percentage must be between 0 and 100' }
    }

    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: updatedFeature, error } = await (adminSupabase as any)
      .from('feature_flags')
      .update({
        rollout_percentage: percentage,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', featureId)
      .select()
      .single()

    if (error) {
      console.error('Error updating rollout percentage:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      feature: updatedFeature,
      message: `Rollout percentage updated to ${percentage}%`
    }

  } catch (error) {
    console.error('Error updating rollout percentage:', error)
    return { success: false, error: 'Failed to update rollout percentage' }
  }
}

/**
 * Update feature restrictions
 */
async function updateRestrictions(featureId: string, restrictions: any, updatedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: updatedFeature, error } = await (adminSupabase as any)
      .from('feature_flags')
      .update({
        user_restrictions: restrictions.user_restrictions || [],
        plan_restrictions: restrictions.plan_restrictions || [],
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', featureId)
      .select()
      .single()

    if (error) {
      console.error('Error updating restrictions:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      feature: updatedFeature,
      message: 'Feature restrictions updated successfully'
    }

  } catch (error) {
    console.error('Error updating restrictions:', error)
    return { success: false, error: 'Failed to update restrictions' }
  }
}

/**
 * Create new feature flag
 */
async function createFeature(featureData: any, createdBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: newFeature, error } = await (adminSupabase as any)
      .from('feature_flags')
      .insert({
        name: featureData.name,
        key: featureData.key,
        description: featureData.description,
        category: featureData.category,
        is_enabled: featureData.is_enabled || false,
        is_global: featureData.is_global !== false,
        user_restrictions: featureData.user_restrictions || [],
        plan_restrictions: featureData.plan_restrictions || [],
        rollout_percentage: featureData.rollout_percentage || 100,
        dependencies: featureData.dependencies || [],
        impact_level: featureData.impact_level || 'low',
        updated_by: createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating feature:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      feature: newFeature,
      message: 'Feature flag created successfully'
    }

  } catch (error) {
    console.error('Error creating feature:', error)
    return { success: false, error: 'Failed to create feature flag' }
  }
}

/**
 * Delete feature flag
 */
async function deleteFeature(featureId: string, _deletedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { error } = await (adminSupabase as any)
      .from('feature_flags')
      .delete()
      .eq('id', featureId)

    if (error) {
      console.error('Error deleting feature:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: 'Feature flag deleted successfully'
    }

  } catch (error) {
    console.error('Error deleting feature:', error)
    return { success: false, error: 'Failed to delete feature flag' }
  }
}

/**
 * Bulk toggle features
 */
async function bulkToggleFeatures(featureIds: string[], enabled: boolean, updatedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: updatedFeatures, error } = await (adminSupabase as any)
      .from('feature_flags')
      .update({
        is_enabled: enabled,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .in('id', featureIds)
      .select()

    if (error) {
      console.error('Error bulk toggling features:', error)
      return { success: false, error: error.message }
    }

    // Apply feature changes to application
    for (const feature of updatedFeatures) {
      await applyFeatureChange(feature.key, enabled)
    }

    return {
      success: true,
      features: updatedFeatures,
      message: `${featureIds.length} features ${enabled ? 'enabled' : 'disabled'} successfully`
    }

  } catch (error) {
    console.error('Error bulk toggling features:', error)
    return { success: false, error: 'Failed to bulk toggle features' }
  }
}

/**
 * Apply feature change to application
 */
async function applyFeatureChange(key: string, enabled: boolean) {
  try {
    // This function would implement actual application changes
    // For example, updating caches, triggering webhooks, etc.

    switch (key) {
      case 'multi_signature_enabled':
        console.log(`Multi-signature workflows ${enabled ? 'enabled' : 'disabled'}`)
        break
      case 'email_notifications_enabled':
        console.log(`Email notifications ${enabled ? 'enabled' : 'disabled'}`)
        break
      case 'advanced_analytics_enabled':
        console.log(`Advanced analytics ${enabled ? 'enabled' : 'disabled'}`)
        break
      case 'api_access_enabled':
        console.log(`API access ${enabled ? 'enabled' : 'disabled'}`)
        break
      // Add more cases as needed
    }

    // Could also update environment variables, clear caches, etc.

  } catch (error) {
    console.error('Error applying feature change:', error)
  }
}

/**
 * Check if feature is enabled for user
 */
async function _checkFeatureEnabled(featureKey: string, userId?: string, userPlan?: string): Promise<boolean> {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: feature } = await (adminSupabase as any)
      .from('feature_flags')
      .select('*')
      .eq('key', featureKey)
      .single()

    if (!feature || !(feature as any).is_enabled) {
      return false
    }

    // Check user restrictions
    if (userId && (feature as any).user_restrictions.length > 0) {
      if (!(feature as any).user_restrictions.includes(userId)) {
        return false
      }
    }

    // Check plan restrictions
    if (userPlan && (feature as any).plan_restrictions.length > 0) {
      if (!(feature as any).plan_restrictions.includes(userPlan)) {
        return false
      }
    }

    // Check rollout percentage
    if ((feature as any).rollout_percentage < 100) {
      const hash = userId ? hashString(userId) : Math.random()
      const userPercentile = (hash % 100) + 1
      if (userPercentile > (feature as any).rollout_percentage) {
        return false
      }
    }

    return true

  } catch (error) {
    console.error('Error checking feature enabled:', error)
    return false
  }
}

/**
 * Simple hash function for consistent user bucketing
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabaseInstance } from '@/lib/admin-supabase'
import { validateAdminSession, logAdminAction, hasAdminPermission } from '@/lib/real-admin-auth'

// =====================================================
// REAL SYSTEM SETTINGS API
// Replaces mock settings with actual database operations
// =====================================================

export interface SystemSetting {
  id: string
  key: string
  value: any
  description: string
  category: 'general' | 'uploads' | 'email' | 'security' | 'notifications' | 'features'
  type: 'boolean' | 'string' | 'number' | 'json' | 'array'
  is_sensitive: boolean
  is_active: boolean
  validation_rules?: any
  updated_by?: string
  updated_at: string
  created_at: string
}

/**
 * GET /api/admin/settings - Get all system settings
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
    if (!hasAdminPermission('view_settings', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'

    // Build query
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      return NextResponse.json({ error: 'Failed to get admin Supabase instance' }, { status: 500 })
    }
    let query = adminSupabase
      .from('system_settings')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('key', { ascending: true })

    if (category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: settings, error } = await query

    if (error) {
      console.error('Error fetching system settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Process settings (hide sensitive values for non-super-admins)
    const processedSettings = (settings as any)?.map((setting: any) => {
      if (setting.is_sensitive && session.user.role !== 'super_admin') {
        return {
          ...setting,
          value: '••••••••••••'
        }
      }
      return setting
    }) || []

    // Log admin action
    await logAdminAction(
      session.user.id,
      'view_settings',
      'system_settings',
      undefined,
      undefined,
      { category }
    )

    return NextResponse.json({
      settings: processedSettings,
      categories: ['general', 'uploads', 'email', 'security', 'notifications', 'features']
    })

  } catch (error) {
    console.error('Error in admin settings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/settings - Update system setting
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
    if (!hasAdminPermission('manage_settings', session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, settingId, key, value, description, category, type, is_sensitive } = body

    let result

    switch (action) {
      case 'update':
        result = await updateSetting(settingId, value, session.user.id)
        break
      case 'create':
        result = await createSetting({
          key,
          value,
          description,
          category,
          type,
          is_sensitive: is_sensitive || false
        }, session.user.id)
        break
      case 'toggle_active':
        result = await toggleSettingActive(settingId, session.user.id)
        break
      case 'delete':
        result = await deleteSetting(settingId, session.user.id)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log admin action
    await logAdminAction(
      session.user.id,
      `setting_${action}`,
      'system_setting',
      settingId || key,
      undefined,
      { key, value, action }
    )

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in admin settings POST API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update system setting
 */
async function updateSetting(settingId: string, value: any, updatedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }

    // Get current setting for logging
    const { data: currentSetting } = await (adminSupabase as any)
      .from('system_settings')
      .select('*')
      .eq('id', settingId)
      .single()

    if (!currentSetting) {
      return { success: false, error: 'Setting not found' }
    }

    // Validate value based on type
    const validationResult = validateSettingValue(value, (currentSetting as any).type, (currentSetting as any).validation_rules)
    if (!validationResult.valid) {
      return { success: false, error: validationResult.error }
    }

    // Update setting
    const { data: updatedSetting, error } = await (adminSupabase as any)
      .from('system_settings')
      .update({
        value: validationResult.processedValue,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating setting:', error)
      return { success: false, error: error.message }
    }

    // Apply setting change to application (if needed)
    await applySettingChange((currentSetting as any).key, validationResult.processedValue)

    return {
      success: true,
      setting: updatedSetting,
      message: 'Setting updated successfully'
    }

  } catch (error) {
    console.error('Error updating setting:', error)
    return { success: false, error: 'Failed to update setting' }
  }
}

/**
 * Create new system setting
 */
async function createSetting(settingData: any, createdBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { data: newSetting, error } = await (adminSupabase as any)
      .from('system_settings')
      .insert({
        ...settingData,
        updated_by: createdBy,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating setting:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      setting: newSetting,
      message: 'Setting created successfully'
    }

  } catch (error) {
    console.error('Error creating setting:', error)
    return { success: false, error: 'Failed to create setting' }
  }
}

/**
 * Toggle setting active status
 */
async function toggleSettingActive(settingId: string, updatedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }

    // Get current setting
    const { data: currentSetting } = await (adminSupabase as any)
      .from('system_settings')
      .select('*')
      .eq('id', settingId)
      .single()

    if (!currentSetting) {
      return { success: false, error: 'Setting not found' }
    }

    // Toggle active status
    const { data: updatedSetting, error } = await (adminSupabase as any)
      .from('system_settings')
      .update({
        is_active: !(currentSetting as any).is_active,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingId)
      .select()
      .single()

    if (error) {
      console.error('Error toggling setting:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      setting: updatedSetting,
      message: `Setting ${updatedSetting.is_active ? 'activated' : 'deactivated'} successfully`
    }

  } catch (error) {
    console.error('Error toggling setting:', error)
    return { success: false, error: 'Failed to toggle setting' }
  }
}

/**
 * Delete system setting
 */
async function deleteSetting(settingId: string, deletedBy: string) {
  try {
    const adminSupabase = getAdminSupabaseInstance()
    if (!adminSupabase) {
      throw new Error('Failed to get admin Supabase instance')
    }
    const { error } = await (adminSupabase as any)
      .from('system_settings')
      .delete()
      .eq('id', settingId)

    if (error) {
      console.error('Error deleting setting:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: 'Setting deleted successfully'
    }

  } catch (error) {
    console.error('Error deleting setting:', error)
    return { success: false, error: 'Failed to delete setting' }
  }
}

/**
 * Validate setting value based on type and rules
 */
function validateSettingValue(value: any, type: string, validationRules?: any) {
  try {
    let processedValue = value

    switch (type) {
      case 'boolean':
        if (typeof value !== 'boolean') {
          processedValue = value === 'true' || value === true
        }
        break
      case 'number':
        processedValue = Number(value)
        if (isNaN(processedValue)) {
          return { valid: false, error: 'Invalid number value' }
        }
        break
      case 'string':
        processedValue = String(value)
        break
      case 'json':
        if (typeof value === 'string') {
          try {
            processedValue = JSON.parse(value)
          } catch {
            return { valid: false, error: 'Invalid JSON value' }
          }
        }
        break
      case 'array':
        if (!Array.isArray(value)) {
          if (typeof value === 'string') {
            try {
              processedValue = JSON.parse(value)
              if (!Array.isArray(processedValue)) {
                return { valid: false, error: 'Value must be an array' }
              }
            } catch {
              return { valid: false, error: 'Invalid array value' }
            }
          } else {
            return { valid: false, error: 'Value must be an array' }
          }
        }
        break
    }

    // Apply validation rules if present
    if (validationRules) {
      if (validationRules.min !== undefined && processedValue < validationRules.min) {
        return { valid: false, error: `Value must be at least ${validationRules.min}` }
      }
      if (validationRules.max !== undefined && processedValue > validationRules.max) {
        return { valid: false, error: `Value must be at most ${validationRules.max}` }
      }
      if (validationRules.pattern && !new RegExp(validationRules.pattern).test(processedValue)) {
        return { valid: false, error: 'Value does not match required pattern' }
      }
    }

    return { valid: true, processedValue }

  } catch (error) {
    return { valid: false, error: 'Validation failed' }
  }
}

/**
 * Apply setting change to application (implement as needed)
 */
async function applySettingChange(key: string, value: any) {
  // This function would implement actual application changes
  // For example, updating environment variables, clearing caches, etc.

  switch (key) {
    case 'maintenance_mode':
      // Could trigger maintenance mode in the application
      console.log(`Maintenance mode ${value ? 'enabled' : 'disabled'}`)
      break
    case 'max_file_size_mb':
      // Could update file upload limits
      console.log(`File size limit updated to ${value}MB`)
      break
    // Add more cases as needed
  }
}

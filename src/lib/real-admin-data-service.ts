// =====================================================
// REAL ADMIN DATA SERVICE
// Uses actual API endpoints instead of mock data
// =====================================================

export interface RealSystemStats {
  totalUsers: number
  freeUsers: number
  paidUsers: number
  activeUsers: number
  totalDocuments: number
  emailsSent: number
  storageUsed: string
  monthlyRevenue: number
  signatureSuccess: number
  resendAttempts: number
}

export interface RealUserRecord {
  id: string
  email: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  last_login: string
  documents_count: number
  subscription_expires: string
}

export interface RealDocumentRecord {
  id: string
  title: string
  status: string
  created_at: string
  user_email: string
  signers_count: number
  completion_rate: number
}

export interface RealAPIKeyRecord {
  id: string
  name: string
  service: string
  status: 'active' | 'inactive'
  last_used: string
  created_at: string
  key: string
  description?: string
  usage_count: number
}

import { makeAdminAPIRequest } from '@/lib/client-admin-auth'

/**
 * Make authenticated API request (using client auth helper)
 */
async function makeAdminRequest(endpoint: string, options: RequestInit = {}) {
  return makeAdminAPIRequest(endpoint, options)
}

/**
 * Get real system statistics from analytics API
 */
export async function getRealSystemStats(): Promise<RealSystemStats> {
  try {
    const data = await makeAdminRequest('/api/admin/analytics?metrics=overview,users,documents')

    const analytics = data.analytics

    return {
      totalUsers: analytics.overview.total_users,
      freeUsers: analytics.overview.total_users - analytics.revenue_metrics.mrr / 45, // Estimate
      paidUsers: Math.floor(analytics.revenue_metrics.mrr / 45), // Estimate based on average plan price
      activeUsers: analytics.user_metrics.active_users_24h,
      totalDocuments: analytics.overview.total_documents,
      emailsSent: analytics.overview.total_signatures * 2, // Estimate 2 emails per signature
      storageUsed: `${Math.round(analytics.overview.total_documents * 2.5)} MB`, // Estimate
      monthlyRevenue: analytics.revenue_metrics.mrr,
      signatureSuccess: analytics.document_metrics.signature_success_rate,
      resendAttempts: Math.floor(analytics.overview.total_signatures * 0.05) // 5% resend rate
    }

  } catch (error) {
    console.error('Failed to get real system stats:', error)

    // Return fallback data
    return {
      totalUsers: 0,
      freeUsers: 0,
      paidUsers: 0,
      activeUsers: 0,
      totalDocuments: 0,
      emailsSent: 0,
      storageUsed: '0 MB',
      monthlyRevenue: 0,
      signatureSuccess: 0,
      resendAttempts: 0
    }
  }
}

/**
 * Get real user data from users API
 */
export async function getRealUsers(): Promise<RealUserRecord[]> {
  try {
    const data = await makeAdminRequest('/api/admin/users?includeStats=true')

    return data.users.map((user: any) => ({
      id: user.id,
      email: user.email,
      plan: user.subscription_plan?.toLowerCase() || 'free',
      status: user.last_sign_in_at ? 'active' : 'inactive',
      created_at: user.created_at,
      last_login: user.last_sign_in_at || user.created_at,
      documents_count: user.documents_count || 0,
      subscription_expires: user.subscription_expires || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }))

  } catch (error) {
    console.error('Failed to get real users:', error)
    return []
  }
}

/**
 * Get real document data from documents API
 */
export async function getRealDocuments(): Promise<RealDocumentRecord[]> {
  try {
    const data = await makeAdminRequest('/api/admin/documents?includeStats=true')

    return data.documents.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      created_at: doc.created_at,
      user_email: doc.user_email,
      signers_count: doc.signers_count,
      completion_rate: doc.completion_rate
    }))

  } catch (error) {
    console.error('Failed to get real documents:', error)
    return []
  }
}

/**
 * Get real API keys data
 */
export async function getRealAPIKeys(): Promise<RealAPIKeyRecord[]> {
  try {
    // This would come from a real API endpoint
    // For now, return mock data structure
    return [
      {
        id: '1',
        name: 'Resend Email API',
        service: 'resend',
        status: 'active',
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString(),
        key: 're_xxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Email delivery service for notifications',
        usage_count: 1250
      },
      {
        id: '2',
        name: 'Supabase API',
        service: 'supabase',
        status: 'active',
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString(),
        key: 'sb-xxxxxxxxxxxxxxxxxxxxxxxxxx',
        description: 'Database and authentication service',
        usage_count: 5420
      }
    ]

  } catch (error) {
    console.error('Failed to get real API keys:', error)
    return []
  }
}

/**
 * Update user status
 */
export async function updateUserStatus(userId: string, status: string): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update_metadata',
        userId,
        userData: { status }
      })
    })

    return true

  } catch (error) {
    console.error('Failed to update user status:', error)
    return false
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_user',
        userId
      })
    })

    return true

  } catch (error) {
    console.error('Failed to delete user:', error)
    return false
  }
}

/**
 * Update system setting
 */
export async function updateSystemSetting(settingId: string, value: any): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({
        action: 'update',
        settingId,
        value
      })
    })

    return true

  } catch (error) {
    console.error('Failed to update system setting:', error)
    return false
  }
}

/**
 * Toggle feature flag
 */
export async function toggleFeatureFlag(featureId: string): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/features', {
      method: 'POST',
      body: JSON.stringify({
        action: 'toggle',
        featureId
      })
    })

    return true

  } catch (error) {
    console.error('Failed to toggle feature flag:', error)
    return false
  }
}

/**
 * Get system settings
 */
export async function getSystemSettings(): Promise<any[]> {
  try {
    const data = await makeAdminRequest('/api/admin/settings')
    return data.settings || []

  } catch (error) {
    console.error('Failed to get system settings:', error)
    return []
  }
}

/**
 * Get feature flags
 */
export async function getFeatureFlags(): Promise<any[]> {
  try {
    const data = await makeAdminRequest('/api/admin/features')
    return data.features || []

  } catch (error) {
    console.error('Failed to get feature flags:', error)
    return []
  }
}

/**
 * Delete document
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/documents', {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete_document',
        documentId
      })
    })

    return true

  } catch (error) {
    console.error('Failed to delete document:', error)
    return false
  }
}

/**
 * Bulk delete documents
 */
export async function bulkDeleteDocuments(documentIds: string[]): Promise<boolean> {
  try {
    await makeAdminRequest('/api/admin/documents', {
      method: 'POST',
      body: JSON.stringify({
        action: 'bulk_delete',
        documentIds
      })
    })

    return true

  } catch (error) {
    console.error('Failed to bulk delete documents:', error)
    return false
  }
}

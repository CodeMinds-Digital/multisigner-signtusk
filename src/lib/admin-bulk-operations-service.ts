// =====================================================
// ADMIN BULK OPERATIONS SERVICE
// Provides bulk operations for admin management
// =====================================================

import { supabaseAdmin } from './supabase-admin'

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  details: any[]
}

export interface BulkUserOperation {
  userIds: string[]
  operation: 'activate' | 'deactivate' | 'delete' | 'update_plan' | 'send_notification'
  data?: any
}

export interface BulkDocumentOperation {
  documentIds: string[]
  operation: 'delete' | 'archive' | 'extend_deadline' | 'resend_notifications' | 'change_status'
  data?: any
}

export class AdminBulkOperationsService {
  /**
   * Perform bulk user operations
   */
  static async performBulkUserOperation(
    operation: BulkUserOperation,
    adminUserId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      switch (operation.operation) {
        case 'activate':
          return await this.bulkActivateUsers(operation.userIds, adminUserId)
        case 'deactivate':
          return await this.bulkDeactivateUsers(operation.userIds, adminUserId)
        case 'delete':
          return await this.bulkDeleteUsers(operation.userIds, adminUserId)
        case 'update_plan':
          return await this.bulkUpdateUserPlans(operation.userIds, operation.data.plan, adminUserId)
        case 'send_notification':
          return await this.bulkSendNotifications(operation.userIds, operation.data, adminUserId)
        default:
          result.errors.push('Invalid operation type')
          return result
      }
    } catch (error) {
      result.errors.push(`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Perform bulk document operations
   */
  static async performBulkDocumentOperation(
    operation: BulkDocumentOperation,
    adminUserId: string
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      switch (operation.operation) {
        case 'delete':
          return await this.bulkDeleteDocuments(operation.documentIds, adminUserId)
        case 'archive':
          return await this.bulkArchiveDocuments(operation.documentIds, adminUserId)
        case 'extend_deadline':
          return await (this as any).bulkExtendDeadlines(operation.documentIds, operation.data.expires_at, adminUserId)
        case 'resend_notifications':
          return await (this as any).bulkResendNotifications(operation.documentIds, adminUserId)
        case 'change_status':
          return await (this as any).bulkChangeDocumentStatus(operation.documentIds, operation.data.status, adminUserId)
        default:
          result.errors.push('Invalid operation type')
          return result
      }
    } catch (error) {
      result.errors.push(`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk activate users
   */
  private static async bulkActivateUsers(userIds: string[], adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Update user profiles
      const { data: updatedUsers, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds)
        .select()

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = updatedUsers?.length || 0
      result.success = true
      result.details = updatedUsers || []

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_activate_users', 'user', userIds)

      return result
    } catch (error) {
      result.errors.push(`Failed to activate users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk deactivate users
   */
  private static async bulkDeactivateUsers(userIds: string[], adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Update user profiles
      const { data: updatedUsers, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds)
        .select()

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = updatedUsers?.length || 0
      result.success = true
      result.details = updatedUsers || []

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_deactivate_users', 'user', userIds)

      return result
    } catch (error) {
      result.errors.push(`Failed to deactivate users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk delete users
   */
  private static async bulkDeleteUsers(userIds: string[], adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Delete user profiles (cascade will handle related data)
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .in('id', userIds)

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = userIds.length
      result.success = true

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_delete_users', 'user', userIds)

      return result
    } catch (error) {
      result.errors.push(`Failed to delete users: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk update user plans
   */
  private static async bulkUpdateUserPlans(userIds: string[], plan: string, adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Update user subscriptions
      const { data: updatedUsers, error } = await supabaseAdmin
        .from('user_profiles')
        .update({
          plan: plan,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds)
        .select()

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = updatedUsers?.length || 0
      result.success = true
      result.details = updatedUsers || []

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_update_user_plans', 'user', userIds, { plan })

      return result
    } catch (error) {
      result.errors.push(`Failed to update user plans: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk send notifications
   */
  private static async bulkSendNotifications(userIds: string[], notificationData: any, adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Create notifications for all users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type || 'info',
        read: false
      }))

      const { data: createdNotifications, error } = await supabaseAdmin
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = createdNotifications?.length || 0
      result.success = true
      result.details = createdNotifications || []

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_send_notifications', 'notification', userIds, notificationData)

      return result
    } catch (error) {
      result.errors.push(`Failed to send notifications: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk delete documents
   */
  private static async bulkDeleteDocuments(documentIds: string[], adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      // Delete related signing requests first
      await supabaseAdmin
        .from('signing_requests')
        .delete()
        .in('document_id', documentIds)

      // Delete documents
      const { error } = await supabaseAdmin
        .from('documents')
        .delete()
        .in('id', documentIds)

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = documentIds.length
      result.success = true

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_delete_documents', 'document', documentIds)

      return result
    } catch (error) {
      result.errors.push(`Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Bulk archive documents
   */
  private static async bulkArchiveDocuments(documentIds: string[], adminUserId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: false,
      processed: 0,
      failed: 0,
      errors: [],
      details: []
    }

    try {
      const { data: updatedDocs, error } = await supabaseAdmin
        .from('documents')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .in('id', documentIds)
        .select()

      if (error) {
        result.errors.push(error.message)
        return result
      }

      result.processed = updatedDocs?.length || 0
      result.success = true
      result.details = updatedDocs || []

      // Log admin action
      await this.logBulkAction(adminUserId, 'bulk_archive_documents', 'document', documentIds)

      return result
    } catch (error) {
      result.errors.push(`Failed to archive documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return result
    }
  }

  /**
   * Log bulk action for audit trail
   */
  private static async logBulkAction(
    adminUserId: string,
    action: string,
    resourceType: string,
    resourceIds: string[],
    data?: any
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('admin_audit_logs')
        .insert({
          admin_user_id: adminUserId,
          action,
          resource_type: resourceType,
          resource_id: resourceIds.join(','),
          new_values: { bulk_operation: true, count: resourceIds.length, data },
          ip_address: '127.0.0.1', // In production, get from request
          user_agent: 'Admin Dashboard'
        })
    } catch (error) {
      console.error('Error logging bulk action:', error)
    }
  }
}

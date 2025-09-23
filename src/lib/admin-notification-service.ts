import { supabaseAdmin } from './supabase-admin'

export interface AdminNotificationLog {
  id: string
  signingRequestId: string
  recipientEmail: string
  notificationType: 'sequential_next' | 'reminder' | 'completion' | 'decline' | 'expiration'
  messageId?: string
  sentAt: string
  status: 'sent' | 'delivered' | 'failed' | 'bounced' | 'resent'
  errorMessage?: string
  retryCount: number
  requestTitle?: string
  signerName?: string
}

export interface NotificationStats {
  delivered: number
  failed: number
  sent: number
  total: number
  todayDelivered: number
  todayFailed: number
}

export interface EmailTemplate {
  id: string
  name: string
  type: string
  subject: string
  isActive: boolean
  lastModified: string
  content?: string
}

/**
 * Get all notification logs with request details
 */
export async function getNotificationLogs(): Promise<AdminNotificationLog[]> {
  try {
    console.log('📧 Fetching notification logs from database...')

    // Get notification logs
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(500) // Limit to recent 500 notifications

    if (logsError) {
      console.error('❌ Error fetching notification logs:', logsError)
      return []
    }

    if (!logs || logs.length === 0) {
      console.log('📧 No notification logs found')
      return []
    }

    console.log(`📧 Found ${logs.length} notification logs`)

    // Get signing request details for context
    const requestIds = [...new Set(logs.map(log => log.signing_request_id))]
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from('signing_requests')
      .select('id, title')
      .in('id', requestIds)

    if (requestsError) {
      console.error('❌ Error fetching request details:', requestsError)
    }

    // Get signer details for context
    const { data: signers, error: signersError } = await supabaseAdmin
      .from('signing_request_signers')
      .select('signing_request_id, signer_email, signer_name')
      .in('signing_request_id', requestIds)

    if (signersError) {
      console.error('❌ Error fetching signer details:', signersError)
    }

    // Transform to admin format
    const adminLogs: AdminNotificationLog[] = logs.map(log => {
      const request = requests?.find(r => r.id === log.signing_request_id)
      const signer = signers?.find(s =>
        s.signing_request_id === log.signing_request_id &&
        s.signer_email === log.recipient_email
      )

      return {
        id: log.id,
        signingRequestId: log.signing_request_id,
        recipientEmail: log.recipient_email,
        notificationType: log.notification_type,
        messageId: log.message_id,
        sentAt: log.sent_at,
        status: log.status || 'sent',
        errorMessage: log.error_message,
        retryCount: log.retry_count || 0,
        requestTitle: request?.title,
        signerName: signer?.signer_name
      }
    })

    console.log(`✅ Transformed ${adminLogs.length} notification logs`)
    return adminLogs

  } catch (error) {
    console.error('❌ Error in getNotificationLogs:', error)
    return []
  }
}

/**
 * Get notification statistics for dashboard
 */
export async function getNotificationStats(): Promise<NotificationStats> {
  try {
    console.log('📊 Calculating notification statistics...')

    const { data: logs, error } = await supabaseAdmin
      .from('notification_logs')
      .select('status, sent_at')

    if (error) {
      console.error('❌ Error fetching notification stats:', error)
      return {
        delivered: 0,
        failed: 0,
        sent: 0,
        total: 0,
        todayDelivered: 0,
        todayFailed: 0
      }
    }

    const total = logs?.length || 0
    const delivered = logs?.filter(l => l.status === 'delivered').length || 0
    const failed = logs?.filter(l => l.status === 'failed').length || 0
    const sent = logs?.filter(l => l.status === 'sent').length || 0

    // Calculate today's stats
    const today = new Date().toISOString().split('T')[0]
    const todayDelivered = logs?.filter(l =>
      l.status === 'delivered' && l.sent_at?.startsWith(today)
    ).length || 0

    const todayFailed = logs?.filter(l =>
      l.status === 'failed' && l.sent_at?.startsWith(today)
    ).length || 0

    const stats = {
      delivered,
      failed,
      sent,
      total,
      todayDelivered,
      todayFailed
    }

    console.log('📊 Notification stats:', stats)
    return stats

  } catch (error) {
    console.error('❌ Error calculating notification stats:', error)
    return {
      delivered: 0,
      failed: 0,
      sent: 0,
      total: 0,
      todayDelivered: 0,
      todayFailed: 0
    }
  }
}

/**
 * Get failed notifications that need attention
 */
export async function getFailedNotifications(): Promise<AdminNotificationLog[]> {
  try {
    const allLogs = await getNotificationLogs()
    return allLogs.filter(log => log.status === 'failed')
  } catch (error) {
    console.error('❌ Error getting failed notifications:', error)
    return []
  }
}

/**
 * Search notification logs
 */
export async function searchNotificationLogs(
  searchTerm: string,
  statusFilter?: string,
  typeFilter?: string
): Promise<AdminNotificationLog[]> {
  try {
    const allLogs = await getNotificationLogs()

    return allLogs.filter(log => {
      const matchesSearch = !searchTerm ||
        log.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.requestTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.signerName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = !statusFilter || statusFilter === 'all' || log.status === statusFilter
      const matchesType = !typeFilter || typeFilter === 'all' || log.notificationType === typeFilter

      return matchesSearch && matchesStatus && matchesType
    })
  } catch (error) {
    console.error('❌ Error searching notification logs:', error)
    return []
  }
}

/**
 * Get email templates (from system config or default templates)
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    console.log('📧 Fetching email templates...')

    // Try to get templates from system_settings (system_config table doesn't exist)
    const { data: configs, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .like('key', 'email_template_%')

    if (error) {
      console.error('❌ Error fetching email templates:', error)
    }

    // Default templates if none found in database
    const defaultTemplates: EmailTemplate[] = [
      {
        id: 'sequential_next',
        name: 'Sequential Next Signer',
        type: 'sequential_next',
        subject: 'Your turn to sign: {{documentTitle}}',
        isActive: true,
        lastModified: new Date().toISOString(),
        content: 'It\'s your turn to sign the document: {{documentTitle}}'
      },
      {
        id: 'reminder',
        name: 'Signing Reminder',
        type: 'reminder',
        subject: 'Reminder: Please sign {{documentTitle}}',
        isActive: true,
        lastModified: new Date().toISOString(),
        content: 'This is a reminder to sign the document: {{documentTitle}}'
      },
      {
        id: 'completion',
        name: 'Document Completed',
        type: 'completion',
        subject: 'Document signed: {{documentTitle}}',
        isActive: true,
        lastModified: new Date().toISOString(),
        content: 'The document {{documentTitle}} has been completed by all signers.'
      },
      {
        id: 'decline',
        name: 'Signature Declined',
        type: 'decline',
        subject: 'Signature declined: {{documentTitle}}',
        isActive: true,
        lastModified: new Date().toISOString(),
        content: 'A signer has declined to sign the document: {{documentTitle}}'
      },
      {
        id: 'expiration',
        name: 'Document Expired',
        type: 'expiration',
        subject: 'Document expired: {{documentTitle}}',
        isActive: true,
        lastModified: new Date().toISOString(),
        content: 'The document {{documentTitle}} has expired without being completed.'
      }
    ]

    // If we have database templates, merge with defaults
    if (configs && configs.length > 0) {
      const dbTemplates = configs.map(config => ({
        id: config.key.replace('email_template_', ''),
        name: config.value?.name || 'Unknown Template',
        type: config.value?.type || 'unknown',
        subject: config.value?.subject || 'No Subject',
        isActive: config.value?.isActive !== false,
        lastModified: config.updated_at || config.created_at,
        content: config.config_value.content
      }))

      // Merge with defaults, preferring database versions
      const mergedTemplates = defaultTemplates.map(defaultTemplate => {
        const dbTemplate = dbTemplates.find(db => db.type === defaultTemplate.type)
        return dbTemplate || defaultTemplate
      })

      return mergedTemplates
    }

    console.log(`📧 Using ${defaultTemplates.length} default email templates`)
    return defaultTemplates

  } catch (error) {
    console.error('❌ Error getting email templates:', error)
    return []
  }
}

/**
 * Get notification logs for a specific request
 */
export async function getNotificationLogsForRequest(requestId: string): Promise<AdminNotificationLog[]> {
  try {
    const allLogs = await getNotificationLogs()
    return allLogs.filter(log => log.signingRequestId === requestId)
  } catch (error) {
    console.error('❌ Error getting logs for request:', error)
    return []
  }
}

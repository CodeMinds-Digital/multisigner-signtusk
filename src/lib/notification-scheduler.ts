import { supabaseAdmin } from './supabase-admin'
import { NotificationService } from './notification-service'

export interface SchedulerConfig {
  expiryWarningHours: number // Hours before expiry to send warning
  deadlineWarningHours: number // Hours before deadline to send warning
  autoReminderDays: number[] // Days to send auto reminders (e.g., [3, 1] = 3 days and 1 day before expiry)
  enableAutoReminders: boolean
  enableExpiryWarnings: boolean
  enableDeadlineWarnings: boolean
}

export class NotificationScheduler {
  private static readonly DEFAULT_CONFIG: SchedulerConfig = {
    expiryWarningHours: 24,
    deadlineWarningHours: 48,
    autoReminderDays: [7, 3, 1],
    enableAutoReminders: true,
    enableExpiryWarnings: true,
    enableDeadlineWarnings: true
  }

  /**
   * Check for expired documents and send notifications
   */
  static async checkExpiredDocuments(): Promise<{
    processed: number
    notified: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let notified = 0

    try {
      console.log('🕐 Checking for expired documents...')

      // Find documents that have expired but haven't been marked as expired
      const { data: expiredRequests, error } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          id,
          title,
          initiated_by,
          expires_at,
          status,
          signers:signing_request_signers(signer_email, status, signer_status)
        `)
        .lt('expires_at', new Date().toISOString())
        .in('status', ['initiated', 'in_progress', 'pending'])

      if (error) {
        errors.push(`Database error: ${error.message}`)
        return { processed, notified, errors }
      }

      if (!expiredRequests || expiredRequests.length === 0) {
        console.log('✅ No expired documents found')
        return { processed, notified, errors }
      }

      console.log(`📋 Found ${expiredRequests.length} expired documents`)

      for (const request of expiredRequests) {
        try {
          processed++

          // Update request status to expired
          await supabaseAdmin
            .from('signing_requests')
            .update({
              status: 'expired',
              document_status: 'expired',
              updated_at: new Date().toISOString()
            })
            .eq('id', request.id)

          // Get pending signers (those who haven't signed)
          const pendingSigners = request.signers
            ?.filter((s: any) => 
              s.status !== 'signed' && 
              s.signer_status !== 'signed' &&
              s.status !== 'declined' &&
              s.signer_status !== 'declined'
            )
            .map((s: any) => s.signer_email) || []

          // Send expiry notifications
          await NotificationService.notifyDocumentExpired(
            request.id,
            request.title || 'Document',
            request.initiated_by,
            pendingSigners
          )

          notified++
          console.log(`📧 Sent expiry notification for request: ${request.id}`)

        } catch (requestError) {
          const errorMsg = `Failed to process expired request ${request.id}: ${requestError}`
          errors.push(errorMsg)
          console.error('❌', errorMsg)
        }
      }

      console.log(`✅ Processed ${processed} expired documents, sent ${notified} notifications`)

    } catch (error) {
      const errorMsg = `Error in checkExpiredDocuments: ${error}`
      errors.push(errorMsg)
      console.error('❌', errorMsg)
    }

    return { processed, notified, errors }
  }

  /**
   * Check for documents approaching deadline and send warnings
   */
  static async checkDeadlineWarnings(config: SchedulerConfig = this.DEFAULT_CONFIG): Promise<{
    processed: number
    notified: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let notified = 0

    if (!config.enableDeadlineWarnings) {
      return { processed, notified, errors }
    }

    try {
      console.log('⚠️ Checking for deadline warnings...')

      const warningTime = new Date()
      warningTime.setHours(warningTime.getHours() + config.deadlineWarningHours)

      // Find documents expiring within warning period
      const { data: approachingRequests, error } = await supabaseAdmin
        .from('signing_requests')
        .select(`
          id,
          title,
          expires_at,
          signers:signing_request_signers(signer_email, status, signer_status)
        `)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', warningTime.toISOString())
        .in('status', ['initiated', 'in_progress', 'pending'])

      if (error) {
        errors.push(`Database error: ${error.message}`)
        return { processed, notified, errors }
      }

      if (!approachingRequests || approachingRequests.length === 0) {
        console.log('✅ No documents approaching deadline')
        return { processed, notified, errors }
      }

      console.log(`📋 Found ${approachingRequests.length} documents approaching deadline`)

      for (const request of approachingRequests) {
        try {
          processed++

          // Get pending signers
          const pendingSigners = request.signers
            ?.filter((s: any) => 
              s.status !== 'signed' && 
              s.signer_status !== 'signed' &&
              s.status !== 'declined' &&
              s.signer_status !== 'declined'
            )
            .map((s: any) => s.signer_email) || []

          if (pendingSigners.length === 0) {
            continue // Skip if no pending signers
          }

          // Calculate hours remaining
          const expiryTime = new Date(request.expires_at)
          const hoursRemaining = Math.ceil((expiryTime.getTime() - Date.now()) / (1000 * 60 * 60))

          // Send deadline approaching notifications
          await NotificationService.notifyDeadlineApproaching(
            request.id,
            request.title || 'Document',
            pendingSigners,
            hoursRemaining
          )

          notified++
          console.log(`📧 Sent deadline warning for request: ${request.id}`)

        } catch (requestError) {
          const errorMsg = `Failed to process deadline warning for ${request.id}: ${requestError}`
          errors.push(errorMsg)
          console.error('❌', errorMsg)
        }
      }

      console.log(`✅ Processed ${processed} deadline warnings, sent ${notified} notifications`)

    } catch (error) {
      const errorMsg = `Error in checkDeadlineWarnings: ${error}`
      errors.push(errorMsg)
      console.error('❌', errorMsg)
    }

    return { processed, notified, errors }
  }

  /**
   * Send automatic reminders based on configuration
   */
  static async sendAutoReminders(config: SchedulerConfig = this.DEFAULT_CONFIG): Promise<{
    processed: number
    notified: number
    errors: string[]
  }> {
    const errors: string[] = []
    let processed = 0
    let notified = 0

    if (!config.enableAutoReminders || config.autoReminderDays.length === 0) {
      return { processed, notified, errors }
    }

    try {
      console.log('📧 Sending automatic reminders...')

      for (const days of config.autoReminderDays) {
        const reminderTime = new Date()
        reminderTime.setDate(reminderTime.getDate() + days)
        reminderTime.setHours(0, 0, 0, 0) // Start of day

        const endOfDay = new Date(reminderTime)
        endOfDay.setHours(23, 59, 59, 999) // End of day

        // Find requests expiring in X days
        const { data: reminderRequests, error } = await supabaseAdmin
          .from('signing_requests')
          .select(`
            id,
            title,
            expires_at,
            signers:signing_request_signers(signer_email, signer_name, status, signer_status)
          `)
          .gte('expires_at', reminderTime.toISOString())
          .lte('expires_at', endOfDay.toISOString())
          .in('status', ['initiated', 'in_progress', 'pending'])

        if (error) {
          errors.push(`Database error for ${days}-day reminders: ${error.message}`)
          continue
        }

        if (!reminderRequests || reminderRequests.length === 0) {
          continue
        }

        console.log(`📋 Found ${reminderRequests.length} requests for ${days}-day reminders`)

        for (const request of reminderRequests) {
          try {
            processed++

            // Get pending signers
            const pendingSigners = request.signers?.filter((s: any) => 
              s.status !== 'signed' && 
              s.signer_status !== 'signed' &&
              s.status !== 'declined' &&
              s.signer_status !== 'declined'
            ) || []

            for (const signer of pendingSigners) {
              try {
                await NotificationService.notifyReminder(
                  request.id,
                  request.title || 'Document',
                  signer.signer_email,
                  days
                )
                notified++
              } catch (signerError) {
                errors.push(`Failed to send reminder to ${signer.signer_email}: ${signerError}`)
              }
            }

            console.log(`📧 Sent ${days}-day reminders for request: ${request.id}`)

          } catch (requestError) {
            const errorMsg = `Failed to process ${days}-day reminder for ${request.id}: ${requestError}`
            errors.push(errorMsg)
            console.error('❌', errorMsg)
          }
        }
      }

      console.log(`✅ Processed ${processed} auto reminders, sent ${notified} notifications`)

    } catch (error) {
      const errorMsg = `Error in sendAutoReminders: ${error}`
      errors.push(errorMsg)
      console.error('❌', errorMsg)
    }

    return { processed, notified, errors }
  }

  /**
   * Run all scheduled notification checks
   */
  static async runAllChecks(config: SchedulerConfig = this.DEFAULT_CONFIG): Promise<{
    expired: { processed: number; notified: number; errors: string[] }
    deadlineWarnings: { processed: number; notified: number; errors: string[] }
    autoReminders: { processed: number; notified: number; errors: string[] }
    totalErrors: number
  }> {
    console.log('🚀 Running all notification scheduler checks...')

    const [expired, deadlineWarnings, autoReminders] = await Promise.all([
      this.checkExpiredDocuments(),
      this.checkDeadlineWarnings(config),
      this.sendAutoReminders(config)
    ])

    const totalErrors = expired.errors.length + deadlineWarnings.errors.length + autoReminders.errors.length

    console.log('✅ Notification scheduler completed:', {
      expired: `${expired.notified}/${expired.processed}`,
      deadlineWarnings: `${deadlineWarnings.notified}/${deadlineWarnings.processed}`,
      autoReminders: `${autoReminders.notified}/${autoReminders.processed}`,
      totalErrors
    })

    return {
      expired,
      deadlineWarnings,
      autoReminders,
      totalErrors
    }
  }
}

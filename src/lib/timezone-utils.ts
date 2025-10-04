/**
 * Timezone Utilities
 *
 * Provides consistent timezone handling across the application.
 * Strategy: Store dates with time set to 11:59 PM in the user's LOCAL timezone.
 * When displayed, the date will show as 11:59 PM in the user's timezone.
 */

/**
 * Set expiration time to 11:59:59.999 PM in the user's local timezone
 * This ensures the expiration always displays as 11:59 PM regardless of user's timezone
 *
 * @param date - The date to set expiration for
 * @returns Date object with time set to 11:59:59.999 PM in local timezone
 */
export function setExpirationTimeLocal(date: Date): Date {
  const expiryDate = new Date(date)
  expiryDate.setHours(23, 59, 59, 999)
  return expiryDate
}

/**
 * Create an expiration date N days from now at 11:59:59.999 PM in local timezone
 *
 * @param days - Number of days from now
 * @returns Date object set to expire at 11:59:59.999 PM in local timezone
 */
export function createExpirationDate(days: number): Date {
  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + days)
  expiryDate.setHours(23, 59, 59, 999)
  return expiryDate
}

/**
 * Format a date for display in the user's local timezone
 * 
 * @param date - Date string or Date object (assumed to be in UTC)
 * @param includeTime - Whether to include time in the output
 * @returns Formatted date string in user's local timezone
 */
export function formatDateLocal(date: string | Date, includeTime: boolean = false): string {
  if (!date) return 'N/A'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid Date'

  const dateStr = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  if (!includeTime) return dateStr

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${dateStr} · ${timeStr}`
}

/**
 * Calculate time remaining until expiration
 * 
 * @param expiresAt - Expiration date string or Date object
 * @returns Object with days, hours, minutes remaining and formatted string
 */
export function getTimeRemaining(expiresAt: string | Date): {
  days: number
  hours: number
  minutes: number
  isExpired: boolean
  formatted: string
} {
  const now = new Date()
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const diffMs = expiry.getTime() - now.getTime()

  if (diffMs <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      isExpired: true,
      formatted: 'Expired'
    }
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  let formatted: string
  if (days > 0) {
    formatted = `${days} day${days > 1 ? 's' : ''} remaining`
  } else if (hours > 0) {
    formatted = `${hours} hour${hours > 1 ? 's' : ''} remaining`
  } else {
    formatted = `${minutes} minute${minutes > 1 ? 's' : ''} remaining`
  }

  return {
    days,
    hours,
    minutes,
    isExpired: false,
    formatted
  }
}

/**
 * Format expiration date with time remaining
 * 
 * @param expiresAt - Expiration date string or Date object
 * @returns Formatted string like "Expires Oct 5, 2025 · 11:59 PM"
 */
export function formatExpirationWithTime(expiresAt: string | Date): string {
  if (!expiresAt) return 'No expiry'

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  if (isNaN(expiry.getTime())) return 'Invalid Date'

  const now = new Date()
  const diffTime = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Format the full date and time in user's local timezone
  const fullDateTime = expiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) + ' · ' + expiry.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  if (diffDays < 0) return `Expired (${fullDateTime})`
  if (diffDays === 0) return `Expires Today (${fullDateTime})`
  if (diffDays === 1) return `Expires Tomorrow (${fullDateTime})`
  return `Expires ${fullDateTime}`
}

/**
 * Check if a date is expired
 * 
 * @param expiresAt - Expiration date string or Date object
 * @returns true if expired, false otherwise
 */
export function isExpired(expiresAt: string | Date): boolean {
  if (!expiresAt) return false

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  if (isNaN(expiry.getTime())) return false

  return expiry.getTime() < Date.now()
}

/**
 * Get the user's timezone
 * 
 * @returns Timezone string like "America/New_York"
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Get the UTC offset for the user's timezone
 * 
 * @returns Offset string like "UTC+5:30" or "UTC-8:00"
 */
export function getUTCOffset(): string {
  const offset = new Date().getTimezoneOffset()
  const hours = Math.floor(Math.abs(offset) / 60)
  const minutes = Math.abs(offset) % 60
  const sign = offset <= 0 ? '+' : '-'

  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Debug function to log timezone information
 * Useful for troubleshooting timezone issues
 */
export function logTimezoneDebug(label: string, date: Date | string): void {
  const d = typeof date === 'string' ? new Date(date) : date

  console.log(`[Timezone Debug] ${label}:`, {
    iso: d.toISOString(),
    local: d.toLocaleString(),
    timezone: getUserTimezone(),
    offset: getUTCOffset(),
    utcHours: d.getUTCHours(),
    localHours: d.getHours()
  })
}


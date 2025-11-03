/**
 * Centralized configuration for the signature module
 * Eliminates hardcoded magic numbers and provides environment-based overrides
 */

// ============================================================================
// Expiration Settings
// ============================================================================

export const EXPIRATION_CONFIG = {
  DEFAULT_EXPIRATION_DAYS: parseInt(process.env.SIGNATURE_DEFAULT_EXPIRATION_DAYS || '30', 10),
  MAX_EXPIRATION_DAYS: parseInt(process.env.SIGNATURE_MAX_EXPIRATION_DAYS || '365', 10),
  MIN_EXPIRATION_DAYS: parseInt(process.env.SIGNATURE_MIN_EXPIRATION_DAYS || '1', 10),
  EXPIRATION_WARNING_DAYS: [7, 3, 1], // Send warnings at these intervals
  GRACE_PERIOD_HOURS: parseInt(process.env.SIGNATURE_GRACE_PERIOD_HOURS || '24', 10),
} as const

// ============================================================================
// Reminder Settings
// ============================================================================

export const REMINDER_CONFIG = {
  MIN_REMINDER_INTERVAL_HOURS: parseInt(process.env.SIGNATURE_MIN_REMINDER_INTERVAL_HOURS || '24', 10),
  MAX_REMINDERS_PER_REQUEST: parseInt(process.env.SIGNATURE_MAX_REMINDERS_PER_REQUEST || '5', 10),
  REMINDER_BATCH_SIZE: parseInt(process.env.SIGNATURE_REMINDER_BATCH_SIZE || '50', 10),
  AUTO_REMINDER_DAYS: [3, 7, 14], // Auto-remind at these intervals if not signed
} as const

// ============================================================================
// Limits
// ============================================================================

export const LIMITS_CONFIG = {
  MAX_SIGNERS_PER_REQUEST: parseInt(process.env.SIGNATURE_MAX_SIGNERS_PER_REQUEST || '50', 10),
  MAX_REQUESTS_PER_USER: parseInt(process.env.SIGNATURE_MAX_REQUESTS_PER_USER || '1000', 10),
  MAX_BULK_OPERATION_SIZE: parseInt(process.env.SIGNATURE_MAX_BULK_OPERATION_SIZE || '100', 10),
  MAX_TEMPLATE_NAME_LENGTH: 255,
  MAX_TITLE_LENGTH: 255,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_SIGNER_NAME_LENGTH: 100,
  MIN_SIGNERS_PER_REQUEST: 1,
} as const

// ============================================================================
// Cache Settings
// ============================================================================

export const CACHE_CONFIG = {
  CACHE_TTL_SECONDS: parseInt(process.env.SIGNATURE_CACHE_TTL_SECONDS || '300', 10), // 5 minutes
  CACHE_KEY_PREFIX: process.env.SIGNATURE_CACHE_KEY_PREFIX || 'signature:',
  ANALYTICS_CACHE_TTL_SECONDS: parseInt(process.env.SIGNATURE_ANALYTICS_CACHE_TTL_SECONDS || '300', 10),
  TEMPLATE_CACHE_TTL_SECONDS: parseInt(process.env.SIGNATURE_TEMPLATE_CACHE_TTL_SECONDS || '600', 10), // 10 minutes
} as const

// ============================================================================
// Pagination Settings
// ============================================================================

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: parseInt(process.env.SIGNATURE_DEFAULT_PAGE_SIZE || '20', 10),
  MAX_PAGE_SIZE: parseInt(process.env.SIGNATURE_MAX_PAGE_SIZE || '100', 10),
  MIN_PAGE_SIZE: 1,
} as const

// ============================================================================
// Analytics Settings
// ============================================================================

export const ANALYTICS_CONFIG = {
  ANALYTICS_RETENTION_DAYS: parseInt(process.env.SIGNATURE_ANALYTICS_RETENTION_DAYS || '999', 10),
  RECENT_SIGNATURES_LIMIT: parseInt(process.env.SIGNATURE_RECENT_SIGNATURES_LIMIT || '100', 10),
  METRICS_CALCULATION_BATCH_SIZE: parseInt(process.env.SIGNATURE_METRICS_BATCH_SIZE || '1000', 10),
} as const

// ============================================================================
// Rate Limiting Settings
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  REQUESTS_PER_HOUR: parseInt(process.env.SIGNATURE_RATE_LIMIT_REQUESTS_PER_HOUR || '100', 10),
  BULK_OPERATIONS_PER_HOUR: parseInt(process.env.SIGNATURE_BULK_OPERATIONS_PER_HOUR || '5', 10),
  REMINDERS_PER_HOUR: parseInt(process.env.SIGNATURE_REMINDERS_PER_HOUR || '20', 10),
  WINDOW_SECONDS: 3600, // 1 hour
} as const

// ============================================================================
// Security Settings
// ============================================================================

export const SECURITY_CONFIG = {
  TOTP_WINDOW: parseInt(process.env.SIGNATURE_TOTP_WINDOW || '1', 10),
  SESSION_EXPIRATION_HOURS: parseInt(process.env.SIGNATURE_SESSION_EXPIRATION_HOURS || '24', 10),
  ACCESS_TOKEN_LENGTH: 32,
  REQUIRE_TOTP_BY_DEFAULT: process.env.SIGNATURE_REQUIRE_TOTP_BY_DEFAULT === 'true',
} as const

// ============================================================================
// Notification Settings
// ============================================================================

export const NOTIFICATION_CONFIG = {
  SEND_EMAIL_NOTIFICATIONS: process.env.SIGNATURE_SEND_EMAIL_NOTIFICATIONS !== 'false',
  SEND_IN_APP_NOTIFICATIONS: process.env.SIGNATURE_SEND_IN_APP_NOTIFICATIONS !== 'false',
  SEND_WEBHOOK_NOTIFICATIONS: process.env.SIGNATURE_SEND_WEBHOOK_NOTIFICATIONS === 'true',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'SignTusk',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@signtusk.com',
} as const

// ============================================================================
// PDF Settings
// ============================================================================

export const PDF_CONFIG = {
  SIGNED_DOCUMENTS_BUCKET: process.env.SIGNATURE_SIGNED_DOCUMENTS_BUCKET || 'signed-documents',
  QR_CODE_SIZE: parseInt(process.env.SIGNATURE_QR_CODE_SIZE || '100', 10),
  SIGNATURE_IMAGE_MAX_SIZE_KB: parseInt(process.env.SIGNATURE_IMAGE_MAX_SIZE_KB || '500', 10),
  PDF_COMPRESSION_QUALITY: parseFloat(process.env.SIGNATURE_PDF_COMPRESSION_QUALITY || '0.8'),
} as const

// ============================================================================
// Workflow Settings
// ============================================================================

export const WORKFLOW_CONFIG = {
  DEFAULT_SIGNING_ORDER: (process.env.SIGNATURE_DEFAULT_SIGNING_ORDER || 'sequential') as 'sequential' | 'parallel',
  ALLOW_PARALLEL_SIGNING: process.env.SIGNATURE_ALLOW_PARALLEL_SIGNING !== 'false',
  ALLOW_SEQUENTIAL_SIGNING: process.env.SIGNATURE_ALLOW_SEQUENTIAL_SIGNING !== 'false',
} as const

// ============================================================================
// Job/Cron Settings
// ============================================================================

export const JOB_CONFIG = {
  EXPIRATION_CHECK_CRON: process.env.SIGNATURE_EXPIRATION_CHECK_CRON || '0 0 * * *', // Daily at midnight
  REMINDER_CHECK_CRON: process.env.SIGNATURE_REMINDER_CHECK_CRON || '0 */6 * * *', // Every 6 hours
  BATCH_PROCESSING_SIZE: parseInt(process.env.SIGNATURE_BATCH_PROCESSING_SIZE || '100', 10),
} as const

// ============================================================================
// Combined Configuration Object
// ============================================================================

export const SIGNATURE_CONFIG = {
  expiration: EXPIRATION_CONFIG,
  reminder: REMINDER_CONFIG,
  limits: LIMITS_CONFIG,
  cache: CACHE_CONFIG,
  pagination: PAGINATION_CONFIG,
  analytics: ANALYTICS_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  security: SECURITY_CONFIG,
  notification: NOTIFICATION_CONFIG,
  pdf: PDF_CONFIG,
  workflow: WORKFLOW_CONFIG,
  job: JOB_CONFIG,
} as const

// ============================================================================
// Configuration Validation
// ============================================================================

export function validateConfiguration(): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate expiration settings
  if (EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS < 1) {
    errors.push('MIN_EXPIRATION_DAYS must be at least 1')
  }
  if (EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS < EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS) {
    errors.push('MAX_EXPIRATION_DAYS must be greater than MIN_EXPIRATION_DAYS')
  }
  if (EXPIRATION_CONFIG.DEFAULT_EXPIRATION_DAYS < EXPIRATION_CONFIG.MIN_EXPIRATION_DAYS ||
    EXPIRATION_CONFIG.DEFAULT_EXPIRATION_DAYS > EXPIRATION_CONFIG.MAX_EXPIRATION_DAYS) {
    errors.push('DEFAULT_EXPIRATION_DAYS must be between MIN and MAX')
  }

  // Validate limits
  if (LIMITS_CONFIG.MAX_SIGNERS_PER_REQUEST < LIMITS_CONFIG.MIN_SIGNERS_PER_REQUEST) {
    errors.push('MAX_SIGNERS_PER_REQUEST must be greater than MIN_SIGNERS_PER_REQUEST')
  }
  if (LIMITS_CONFIG.MAX_BULK_OPERATION_SIZE < 1) {
    errors.push('MAX_BULK_OPERATION_SIZE must be at least 1')
  }

  // Validate pagination
  if (PAGINATION_CONFIG.MAX_PAGE_SIZE < PAGINATION_CONFIG.MIN_PAGE_SIZE) {
    errors.push('MAX_PAGE_SIZE must be greater than MIN_PAGE_SIZE')
  }
  if (PAGINATION_CONFIG.DEFAULT_PAGE_SIZE < PAGINATION_CONFIG.MIN_PAGE_SIZE ||
    PAGINATION_CONFIG.DEFAULT_PAGE_SIZE > PAGINATION_CONFIG.MAX_PAGE_SIZE) {
    errors.push('DEFAULT_PAGE_SIZE must be between MIN and MAX')
  }

  // Validate cache TTL
  if (CACHE_CONFIG.CACHE_TTL_SECONDS < 0) {
    errors.push('CACHE_TTL_SECONDS must be non-negative')
  }

  // Validate rate limits
  if (RATE_LIMIT_CONFIG.REQUESTS_PER_HOUR < 1) {
    errors.push('REQUESTS_PER_HOUR must be at least 1')
  }

  // Validate PDF settings
  if (PDF_CONFIG.PDF_COMPRESSION_QUALITY < 0 || PDF_CONFIG.PDF_COMPRESSION_QUALITY > 1) {
    errors.push('PDF_COMPRESSION_QUALITY must be between 0 and 1')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getExpirationDate(daysFromNow?: number): string {
  const days = daysFromNow || EXPIRATION_CONFIG.DEFAULT_EXPIRATION_DAYS
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function getDaysUntilExpiration(expiresAt?: string): number | null {
  if (!expiresAt) return null
  const now = new Date()
  const expiration = new Date(expiresAt)
  const diffTime = expiration.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export function shouldSendExpirationWarning(expiresAt?: string): boolean {
  if (!expiresAt) return false
  const daysUntil = getDaysUntilExpiration(expiresAt)
  if (daysUntil === null) return false
  return (EXPIRATION_CONFIG.EXPIRATION_WARNING_DAYS as readonly number[]).includes(daysUntil)
}

// Validate configuration on module load
const validation = validateConfiguration()
if (!validation.valid) {
  console.warn('⚠️ Signature configuration validation failed:', validation.errors)
}


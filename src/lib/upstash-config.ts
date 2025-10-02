import { Redis } from '@upstash/redis'
import { Client } from '@upstash/qstash'
import { Ratelimit } from '@upstash/ratelimit'

// Upstash Redis Configuration
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// QStash Configuration for job queues
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// Rate Limiters Configuration
export const rateLimiters = {
  // General API endpoints
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'rl:api',
  }),

  // Authentication endpoints
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'rl:auth',
  }),

  // Corporate admin actions
  corporateAdmin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 m'),
    analytics: true,
    prefix: 'rl:corp',
  }),

  // Email sending
  email: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    analytics: true,
    prefix: 'rl:email',
  }),

  // PDF generation
  pdfGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'rl:pdf',
  }),

  // TOTP verification
  totp: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '5 m'),
    analytics: true,
    prefix: 'rl:totp',
  }),

  // Document verification
  verify: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    analytics: true,
    prefix: 'rl:verify',
  })
}

// Cache TTL Constants
export const CACHE_TTL = {
  SESSION: 7 * 24 * 60 * 60, // 7 days
  USER_PROFILE: 30 * 60, // 30 minutes
  DOCUMENT_METADATA: 60 * 60, // 1 hour
  TOTP_CONFIG: 10 * 60, // 10 minutes
  DOMAIN_SETTINGS: 2 * 60 * 60, // 2 hours
  DOMAIN_ADMINS: 60 * 60, // 1 hour
  ANALYTICS: 5 * 60, // 5 minutes
  NOTIFICATION_PREFS: 30 * 60, // 30 minutes
  TEMP_DATA: 5 * 60, // 5 minutes
  VERIFICATION_TOKEN: 24 * 60 * 60, // 24 hours
} as const

// Cache Key Prefixes
export const CACHE_KEYS = {
  SESSION: 'session',
  USER_PROFILE: 'user_profile',
  DOCUMENT: 'document',
  TOTP_CONFIG: 'totp_config',
  TOTP_USED: 'totp_used',
  DOMAIN_SETTINGS: 'domain_settings',
  DOMAIN_ADMINS: 'domain_admins',
  DOMAIN_USERS: 'domain_users',
  ANALYTICS: 'analytics',
  NOTIFICATION_PREFS: 'notification_prefs',
  ACTIVE_USERS: 'active_users',
  UNREAD_COUNT: 'unread_count',
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
  SIGNING_REQUEST: 'signing_request',
  PDF_GENERATION: 'pdf_generation',
  DOCUMENT_STATUS: 'doc_status',
  USER_SESSIONS: 'user_sessions',
  FAILED_ATTEMPTS: 'failed_attempts',
} as const

// Job Queue URLs
export const JOB_URLS = {
  SEND_EMAIL: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-email`,
  GENERATE_PDF: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/generate-pdf`,
  SEND_NOTIFICATION: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/send-notification`,
  AUDIT_LOG: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/audit-log`,
  AGGREGATE_ANALYTICS: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/aggregate-analytics`,
  CHECK_REMINDERS: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/check-reminders`,
  CLEANUP_EXPIRED: `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs/cleanup-expired`,
} as const

// Utility functions
export class RedisUtils {
  static buildKey(prefix: string, ...parts: string[]): string {
    return [prefix, ...parts].join(':')
  }

  static async setWithTTL(key: string, value: any, ttl: number): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value))
  }

  static async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key)
    if (!value) return null

    // Upstash Redis REST API returns parsed JSON already
    // Only parse if it's a string
    if (typeof value === 'string') {
      try {
        return JSON.parse(value)
      } catch (error) {
        console.error('Failed to parse Redis value:', error)
        return null
      }
    }

    // Already parsed object
    return value as T
  }

  static async del(key: string): Promise<void> {
    await redis.del(key)
  }

  static async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key)
    return result === 1
  }

  static async incr(key: string): Promise<number> {
    return await redis.incr(key)
  }

  static async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(key, ttl)
  }

  static async sadd(key: string, ...members: string[]): Promise<number> {
    return await redis.sadd(key, members)
  }

  static async scard(key: string): Promise<number> {
    return await redis.scard(key)
  }

  static async smembers(key: string): Promise<string[]> {
    return await redis.smembers(key) as string[]
  }

  static async lpush(key: string, ...values: string[]): Promise<number> {
    return await redis.lpush(key, ...values)
  }

  static async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await redis.lrange(key, start, stop) as string[]
  }

  static async ltrim(key: string, start: number, stop: number): Promise<void> {
    await redis.ltrim(key, start, stop)
  }
}

// Health check function
export async function checkRedisHealth(): Promise<{ status: 'healthy' | 'unhealthy', latency?: number }> {
  try {
    const start = Date.now()
    await redis.ping()
    const latency = Date.now() - start
    return { status: 'healthy', latency }
  } catch (error) {
    console.error('Redis health check failed:', error)
    return { status: 'unhealthy' }
  }
}

// Environment validation
export function validateUpstashConfig(): void {
  const requiredEnvVars = [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'QSTASH_TOKEN',
    'NEXT_PUBLIC_APP_URL'
  ]

  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar])

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
  }
}

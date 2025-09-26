// Comprehensive Redis caching service for SignTusk
import { redis, CACHE_TTL, CACHE_KEYS, RedisUtils } from './upstash-config'

export class RedisCacheService {
  // User Profile Caching
  static async cacheUserProfile(userId: string, profile: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.USER_PROFILE, userId)
    await RedisUtils.setWithTTL(key, profile, CACHE_TTL.USER_PROFILE)
  }

  static async getUserProfile(userId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.USER_PROFILE, userId)
    return await RedisUtils.get(key)
  }

  static async invalidateUserProfile(userId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.USER_PROFILE, userId)
    await RedisUtils.del(key)
  }

  // Document Metadata Caching
  static async cacheDocument(documentId: string, document: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT, documentId)
    await RedisUtils.setWithTTL(key, document, CACHE_TTL.DOCUMENT_METADATA)
  }

  static async getDocument(documentId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT, documentId)
    return await RedisUtils.get(key)
  }

  static async invalidateDocument(documentId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT, documentId)
    await RedisUtils.del(key)
  }

  // TOTP Configuration Caching
  static async cacheTOTPConfig(userId: string, config: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.TOTP_CONFIG, userId)
    await RedisUtils.setWithTTL(key, config, CACHE_TTL.TOTP_CONFIG)
  }

  static async getTOTPConfig(userId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.TOTP_CONFIG, userId)
    return await RedisUtils.get(key)
  }

  static async invalidateTOTPConfig(userId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.TOTP_CONFIG, userId)
    await RedisUtils.del(key)
  }

  // TOTP Token Usage Prevention (Replay Attack Protection)
  static async markTOTPUsed(userId: string, token: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.TOTP_USED, userId, token)
    await RedisUtils.setWithTTL(key, '1', CACHE_TTL.TEMP_DATA)
  }

  static async isTOTPUsed(userId: string, token: string): Promise<boolean> {
    const key = RedisUtils.buildKey(CACHE_KEYS.TOTP_USED, userId, token)
    return await RedisUtils.exists(key)
  }

  // Domain Settings Caching (Corporate Features)
  static async cacheDomainSettings(domain: string, settings: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_SETTINGS, domain)
    await RedisUtils.setWithTTL(key, settings, CACHE_TTL.DOMAIN_SETTINGS)
  }

  static async getDomainSettings(domain: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_SETTINGS, domain)
    return await RedisUtils.get(key)
  }

  static async invalidateDomainSettings(domain: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_SETTINGS, domain)
    await RedisUtils.del(key)
  }

  // Domain Administrators Caching
  static async cacheDomainAdmins(domain: string, admins: any[]): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_ADMINS, domain)
    await RedisUtils.setWithTTL(key, admins, CACHE_TTL.DOMAIN_ADMINS)
  }

  static async getDomainAdmins(domain: string): Promise<any[] | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_ADMINS, domain)
    return await RedisUtils.get(key)
  }

  static async invalidateDomainAdmins(domain: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_ADMINS, domain)
    await RedisUtils.del(key)
  }

  // Domain Users Caching
  static async cacheDomainUsers(domain: string, users: any[]): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_USERS, domain)
    await RedisUtils.setWithTTL(key, users, CACHE_TTL.USER_PROFILE)
  }

  static async getDomainUsers(domain: string): Promise<any[] | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_USERS, domain)
    return await RedisUtils.get(key)
  }

  static async invalidateDomainUsers(domain: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOMAIN_USERS, domain)
    await RedisUtils.del(key)
  }

  // Notification Preferences Caching
  static async cacheNotificationPrefs(userId: string, prefs: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.NOTIFICATION_PREFS, userId)
    await RedisUtils.setWithTTL(key, prefs, CACHE_TTL.NOTIFICATION_PREFS)
  }

  static async getNotificationPrefs(userId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.NOTIFICATION_PREFS, userId)
    return await RedisUtils.get(key)
  }

  static async invalidateNotificationPrefs(userId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.NOTIFICATION_PREFS, userId)
    await RedisUtils.del(key)
  }

  // Signing Request Caching
  static async cacheSigningRequest(requestId: string, request: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNING_REQUEST, requestId)
    await RedisUtils.setWithTTL(key, request, CACHE_TTL.DOCUMENT_METADATA)
  }

  static async getSigningRequest(requestId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNING_REQUEST, requestId)
    return await RedisUtils.get(key)
  }

  static async invalidateSigningRequest(requestId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.SIGNING_REQUEST, requestId)
    await RedisUtils.del(key)
  }

  // Document Status Caching
  static async cacheDocumentStatus(requestId: string, status: any): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT_STATUS, requestId)
    await RedisUtils.setWithTTL(key, status, CACHE_TTL.ANALYTICS)
  }

  static async getDocumentStatus(requestId: string): Promise<any | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT_STATUS, requestId)
    return await RedisUtils.get(key)
  }

  static async invalidateDocumentStatus(requestId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.DOCUMENT_STATUS, requestId)
    await RedisUtils.del(key)
  }

  // Unread Notification Count
  static async incrementUnreadCount(userId: string): Promise<number> {
    const key = RedisUtils.buildKey(CACHE_KEYS.UNREAD_COUNT, userId)
    const count = await RedisUtils.incr(key)
    await RedisUtils.expire(key, CACHE_TTL.NOTIFICATION_PREFS)
    return count
  }

  static async decrementUnreadCount(userId: string): Promise<number> {
    const key = RedisUtils.buildKey(CACHE_KEYS.UNREAD_COUNT, userId)
    const count = await redis.decr(key)
    return Math.max(0, count) // Ensure it doesn't go below 0
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const key = RedisUtils.buildKey(CACHE_KEYS.UNREAD_COUNT, userId)
    const count = await redis.get(key)
    return parseInt(count as string || '0')
  }

  static async resetUnreadCount(userId: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.UNREAD_COUNT, userId)
    await RedisUtils.del(key)
  }

  // Failed Login Attempts Tracking
  static async trackFailedAttempt(identifier: string): Promise<number> {
    const key = RedisUtils.buildKey(CACHE_KEYS.FAILED_ATTEMPTS, identifier)
    const count = await RedisUtils.incr(key)
    await RedisUtils.expire(key, 3600) // 1 hour
    return count
  }

  static async getFailedAttempts(identifier: string): Promise<number> {
    const key = RedisUtils.buildKey(CACHE_KEYS.FAILED_ATTEMPTS, identifier)
    const count = await redis.get(key)
    return parseInt(count as string || '0')
  }

  static async resetFailedAttempts(identifier: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.FAILED_ATTEMPTS, identifier)
    await RedisUtils.del(key)
  }

  // Temporary Token Storage (Email verification, password reset)
  static async storeEmailVerificationToken(email: string, token: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.EMAIL_VERIFY, token)
    await RedisUtils.setWithTTL(key, email, CACHE_TTL.VERIFICATION_TOKEN)
  }

  static async getEmailFromVerificationToken(token: string): Promise<string | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.EMAIL_VERIFY, token)
    return await RedisUtils.get(key)
  }

  static async invalidateEmailVerificationToken(token: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.EMAIL_VERIFY, token)
    await RedisUtils.del(key)
  }

  static async storePasswordResetToken(email: string, token: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.PASSWORD_RESET, token)
    await RedisUtils.setWithTTL(key, email, CACHE_TTL.VERIFICATION_TOKEN)
  }

  static async getEmailFromPasswordResetToken(token: string): Promise<string | null> {
    const key = RedisUtils.buildKey(CACHE_KEYS.PASSWORD_RESET, token)
    return await RedisUtils.get(key)
  }

  static async invalidatePasswordResetToken(token: string): Promise<void> {
    const key = RedisUtils.buildKey(CACHE_KEYS.PASSWORD_RESET, token)
    await RedisUtils.del(key)
  }

  // Bulk Cache Operations
  static async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserProfile(userId),
      this.invalidateTOTPConfig(userId),
      this.invalidateNotificationPrefs(userId),
      this.resetUnreadCount(userId)
    ])
  }

  static async invalidateDomainCache(domain: string): Promise<void> {
    await Promise.all([
      this.invalidateDomainSettings(domain),
      this.invalidateDomainAdmins(domain),
      this.invalidateDomainUsers(domain)
    ])
  }

  // Cache Statistics
  static async getCacheStats(): Promise<any> {
    try {
      // Test connection with a simple ping
      await redis.ping()
      return {
        connected: true,
        status: 'healthy',
        timestamp: Date.now()
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      }
    }
  }

  // Cache Warming (Pre-populate frequently accessed data)
  static async warmUserCache(userId: string, userData: {
    profile?: any,
    totpConfig?: any,
    notificationPrefs?: any
  }): Promise<void> {
    const promises = []

    if (userData.profile) {
      promises.push(this.cacheUserProfile(userId, userData.profile))
    }

    if (userData.totpConfig) {
      promises.push(this.cacheTOTPConfig(userId, userData.totpConfig))
    }

    if (userData.notificationPrefs) {
      promises.push(this.cacheNotificationPrefs(userId, userData.notificationPrefs))
    }

    await Promise.all(promises)
  }
}

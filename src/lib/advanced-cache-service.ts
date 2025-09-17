// Advanced caching service - standalone in-memory and localStorage caching

export interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  tags: string[]
  size: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  evictions: number
  oldestEntry: number
  newestEntry: number
}

export interface CacheConfig {
  maxSize: number // Maximum cache size in bytes
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default TTL in milliseconds
  cleanupInterval: number // Cleanup interval in milliseconds
  persistToStorage: boolean // Whether to persist to localStorage
}

export class AdvancedCacheService {
  private static cache = new Map<string, CacheEntry<any>>()
  private static stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    sets: 0,
    deletes: 0
  }
  
  private static config: CacheConfig = {
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 10000,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    persistToStorage: true
  }

  private static cleanupTimer: NodeJS.Timeout | null = null

  /**
   * Initialize cache service
   */
  static initialize(config?: Partial<CacheConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Load from localStorage if enabled
    if (this.config.persistToStorage && typeof window !== 'undefined') {
      this.loadFromStorage()
    }

    // Start cleanup timer
    this.startCleanupTimer()

    console.log('Advanced Cache Service initialized', this.config)
  }

  /**
   * Set cache entry
   */
  static set<T>(
    key: string,
    value: T,
    ttl?: number,
    tags: string[] = []
  ): boolean {
    try {
      const now = Date.now()
      const entryTTL = ttl || this.config.defaultTTL
      const size = this.calculateSize(value)

      // Check if we need to make space
      if (this.cache.size >= this.config.maxEntries || this.getTotalSize() + size > this.config.maxSize) {
        this.evictEntries(size)
      }

      const entry: CacheEntry<T> = {
        key,
        value,
        timestamp: now,
        ttl: entryTTL,
        accessCount: 0,
        lastAccessed: now,
        tags,
        size
      }

      this.cache.set(key, entry)
      this.stats.sets++

      // Persist to storage if enabled
      if (this.config.persistToStorage) {
        this.persistToStorage(key, entry)
      }

      return true
    } catch (error) {
      console.error('Error setting cache entry:', error)
      return false
    }
  }

  /**
   * Get cache entry
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined

    if (!entry) {
      this.stats.misses++
      return null
    }

    const now = Date.now()

    // Check if expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.removeFromStorage(key)
      this.stats.misses++
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = now
    this.stats.hits++

    return entry.value
  }

  /**
   * Check if key exists and is not expired
   */
  static has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    const now = Date.now()
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      this.removeFromStorage(key)
      return false
    }

    return true
  }

  /**
   * Delete cache entry
   */
  static delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
      this.removeFromStorage(key)
    }
    return deleted
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear()
    if (this.config.persistToStorage && typeof window !== 'undefined') {
      this.clearStorage()
    }
  }

  /**
   * Clear entries by tag
   */
  static clearByTag(tag: string): number {
    let cleared = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        cleared++
      }
    }
    return cleared
  }

  /**
   * Get or set with factory function
   */
  static async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number,
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttl, tags)
    return value
  }

  /**
   * Memoize function with caching
   */
  static memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn | Promise<TReturn>,
    keyGenerator?: (...args: TArgs) => string,
    ttl?: number
  ) {
    return async (...args: TArgs): Promise<TReturn> => {
      const key = keyGenerator ? keyGenerator(...args) : `memoized_${JSON.stringify(args)}`
      
      return this.getOrSet(key, () => fn(...args), ttl, ['memoized'])
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): CacheStats {
    const entries = Array.from(this.cache.values())
    const totalSize = this.getTotalSize()
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    const missRate = totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0

    const timestamps = entries.map(e => e.timestamp)
    const oldestEntry = timestamps.length > 0 ? Math.min(...timestamps) : 0
    const newestEntry = timestamps.length > 0 ? Math.max(...timestamps) : 0

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      evictions: this.stats.evictions,
      oldestEntry,
      newestEntry
    }
  }

  /**
   * Get cache entries by pattern
   */
  static getByPattern(pattern: RegExp): Array<{ key: string; value: any }> {
    const results: Array<{ key: string; value: any }> = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (pattern.test(key)) {
        // Check if not expired
        const now = Date.now()
        if (now <= entry.timestamp + entry.ttl) {
          results.push({ key, value: entry.value })
        }
      }
    }

    return results
  }

  /**
   * Cleanup expired entries
   */
  static cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
        this.removeFromStorage(key)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * Warm up cache with data
   */
  static warmUp(data: Array<{ key: string; value: any; ttl?: number; tags?: string[] }>): void {
    data.forEach(({ key, value, ttl, tags }) => {
      this.set(key, value, ttl, tags)
    })
  }

  /**
   * Export cache data
   */
  static export(): Array<{ key: string; value: any; timestamp: number; ttl: number; tags: string[] }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      tags: entry.tags
    }))
  }

  /**
   * Import cache data
   */
  static import(data: Array<{ key: string; value: any; timestamp: number; ttl: number; tags: string[] }>): void {
    const now = Date.now()
    
    data.forEach(({ key, value, timestamp, ttl, tags }) => {
      // Only import if not expired
      if (now <= timestamp + ttl) {
        this.set(key, value, ttl - (now - timestamp), tags)
      }
    })
  }

  /**
   * Private helper methods
   */
  private static evictEntries(requiredSpace: number): void {
    // LRU eviction strategy
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    let freedSpace = 0
    let evicted = 0

    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace && evicted >= 1) break

      this.cache.delete(key)
      this.removeFromStorage(key)
      freedSpace += entry.size
      evicted++
      this.stats.evictions++
    }
  }

  private static getTotalSize(): number {
    return Array.from(this.cache.values()).reduce((total, entry) => total + entry.size, 0)
  }

  private static calculateSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size
    } catch {
      return JSON.stringify(value).length * 2 // Rough estimate
    }
  }

  private static startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private static persistToStorage(key: string, entry: CacheEntry<any>): void {
    if (typeof window === 'undefined') return

    try {
      const storageKey = `cache_${key}`
      const storageValue = {
        value: entry.value,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        tags: entry.tags
      }
      localStorage.setItem(storageKey, JSON.stringify(storageValue))
    } catch (error) {
      // Storage quota exceeded or other error
      console.warn('Failed to persist cache entry to storage:', error)
    }
  }

  private static removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(`cache_${key}`)
    } catch (error) {
      console.warn('Failed to remove cache entry from storage:', error)
    }
  }

  private static loadFromStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const now = Date.now()
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          const cacheKey = key.substring(6)
          const stored = localStorage.getItem(key)
          
          if (stored) {
            const { value, timestamp, ttl, tags } = JSON.parse(stored)
            
            // Only load if not expired
            if (now <= timestamp + ttl) {
              this.set(cacheKey, value, ttl - (now - timestamp), tags)
            } else {
              localStorage.removeItem(key)
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
    }
  }

  private static clearStorage(): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to clear cache storage:', error)
    }
  }

  /**
   * Destroy cache service
   */
  static destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

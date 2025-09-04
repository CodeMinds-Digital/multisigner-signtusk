import { supabase } from './supabase'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export interface SyncStatus {
  lastSync: number
  pendingChanges: number
  isOnline: boolean
  syncInProgress: boolean
}

export class DataPersistenceManager {
  private static readonly CACHE_PREFIX = 'signtusk_cache_'
  private static readonly SYNC_STATUS_KEY = 'signtusk_sync_status'
  private static readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  private static readonly MAX_RETRY_ATTEMPTS = 3
  private static readonly RETRY_DELAY = 1000 // 1 second

  private static syncStatus: SyncStatus = {
    lastSync: 0,
    pendingChanges: 0,
    isOnline: navigator.onLine,
    syncInProgress: false
  }

  /**
   * Initialize the persistence manager
   */
  static initialize() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true
      this.syncPendingChanges()
    })

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false
    })

    // Load sync status from localStorage
    this.loadSyncStatus()

    // Set up periodic sync
    setInterval(() => {
      if (this.syncStatus.isOnline && !this.syncStatus.syncInProgress) {
        this.syncPendingChanges()
      }
    }, 30000) // Sync every 30 seconds

    console.log('Data Persistence Manager initialized')
  }

  /**
   * Cache data with expiration
   */
  static setCache<T>(key: string, data: T, duration: number = this.DEFAULT_CACHE_DURATION): void {
    try {
      const cacheEntry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration
      }

      localStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(cacheEntry)
      )
    } catch (error) {
      console.warn('Failed to set cache:', error)
    }
  }

  /**
   * Get cached data if not expired
   */
  static getCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`)
      if (!cached) return null

      const cacheEntry: CacheEntry<T> = JSON.parse(cached)
      
      if (Date.now() > cacheEntry.expiresAt) {
        this.clearCache(key)
        return null
      }

      return cacheEntry.data
    } catch (error) {
      console.warn('Failed to get cache:', error)
      return null
    }
  }

  /**
   * Clear specific cache entry
   */
  static clearCache(key: string): void {
    try {
      localStorage.removeItem(`${this.CACHE_PREFIX}${key}`)
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Clear all cache entries
   */
  static clearAllCache(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear all cache:', error)
    }
  }

  /**
   * Get data with caching and fallback
   */
  static async getDataWithCache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    cacheDuration?: number
  ): Promise<T> {
    // Try to get from cache first
    const cached = this.getCache<T>(key)
    if (cached) {
      console.log(`Cache hit for ${key}`)
      return cached
    }

    console.log(`Cache miss for ${key}, fetching fresh data`)

    try {
      // Fetch fresh data
      const data = await this.retryOperation(fetchFunction)
      
      // Cache the result
      this.setCache(key, data, cacheDuration)
      
      return data
    } catch (error) {
      console.error(`Failed to fetch data for ${key}:`, error)
      
      // Try to return stale cache as fallback
      const staleCache = this.getStaleCache<T>(key)
      if (staleCache) {
        console.warn(`Using stale cache for ${key}`)
        return staleCache
      }
      
      throw error
    }
  }

  /**
   * Get stale cache (expired but still available)
   */
  private static getStaleCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`${this.CACHE_PREFIX}${key}`)
      if (!cached) return null

      const cacheEntry: CacheEntry<T> = JSON.parse(cached)
      return cacheEntry.data
    } catch (error) {
      return null
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  private static async retryOperation<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          break
        }

        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1)
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  /**
   * Queue operation for offline sync
   */
  static queueOfflineOperation(operation: {
    type: 'create' | 'update' | 'delete'
    table: string
    data: any
    id?: string
  }): void {
    try {
      const queue = this.getOfflineQueue()
      queue.push({
        ...operation,
        timestamp: Date.now(),
        id: operation.id || `temp_${Date.now()}_${Math.random()}`
      })

      localStorage.setItem('signtusk_offline_queue', JSON.stringify(queue))
      this.syncStatus.pendingChanges = queue.length
      this.saveSyncStatus()
    } catch (error) {
      console.error('Failed to queue offline operation:', error)
    }
  }

  /**
   * Get offline operation queue
   */
  private static getOfflineQueue(): any[] {
    try {
      const queue = localStorage.getItem('signtusk_offline_queue')
      return queue ? JSON.parse(queue) : []
    } catch (error) {
      console.warn('Failed to get offline queue:', error)
      return []
    }
  }

  /**
   * Sync pending offline changes
   */
  static async syncPendingChanges(): Promise<void> {
    if (this.syncStatus.syncInProgress || !this.syncStatus.isOnline) {
      return
    }

    this.syncStatus.syncInProgress = true
    this.saveSyncStatus()

    try {
      const queue = this.getOfflineQueue()
      console.log(`Syncing ${queue.length} pending changes`)

      for (const operation of queue) {
        try {
          await this.executeOperation(operation)
          
          // Remove successful operation from queue
          const updatedQueue = this.getOfflineQueue().filter(op => op.id !== operation.id)
          localStorage.setItem('signtusk_offline_queue', JSON.stringify(updatedQueue))
          
        } catch (error) {
          console.error('Failed to sync operation:', operation, error)
          // Keep failed operations in queue for retry
        }
      }

      this.syncStatus.lastSync = Date.now()
      this.syncStatus.pendingChanges = this.getOfflineQueue().length
      
    } catch (error) {
      console.error('Sync failed:', error)
    } finally {
      this.syncStatus.syncInProgress = false
      this.saveSyncStatus()
    }
  }

  /**
   * Execute a queued operation
   */
  private static async executeOperation(operation: any): Promise<void> {
    const { type, table, data, id } = operation

    switch (type) {
      case 'create':
        const { error: createError } = await supabase
          .from(table)
          .insert([data])
        if (createError) throw createError
        break

      case 'update':
        const { error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
        if (updateError) throw updateError
        break

      case 'delete':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', id)
        if (deleteError) throw deleteError
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }
  }

  /**
   * Load sync status from localStorage
   */
  private static loadSyncStatus(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_STATUS_KEY)
      if (stored) {
        this.syncStatus = { ...this.syncStatus, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Failed to load sync status:', error)
    }
  }

  /**
   * Save sync status to localStorage
   */
  private static saveSyncStatus(): void {
    try {
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(this.syncStatus))
    } catch (error) {
      console.warn('Failed to save sync status:', error)
    }
  }

  /**
   * Get current sync status
   */
  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus }
  }

  /**
   * Invalidate cache for specific patterns
   */
  static invalidateCache(pattern: string): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX) && key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to invalidate cache:', error)
    }
  }

  /**
   * Preload critical data
   */
  static async preloadCriticalData(userId: string): Promise<void> {
    try {
      console.log('Preloading critical data for user:', userId)

      // Preload user documents
      const documentsKey = `user_documents_${userId}`
      if (!this.getCache(documentsKey)) {
        // This would be replaced with actual service calls
        console.log('Preloading user documents...')
      }

      // Preload signature requests
      const requestsKey = `signature_requests_${userId}`
      if (!this.getCache(requestsKey)) {
        console.log('Preloading signature requests...')
      }

      console.log('Critical data preloading completed')
    } catch (error) {
      console.error('Failed to preload critical data:', error)
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    totalEntries: number
    totalSize: number
    expiredEntries: number
  } {
    let totalEntries = 0
    let totalSize = 0
    let expiredEntries = 0

    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          totalEntries++
          const value = localStorage.getItem(key)
          if (value) {
            totalSize += value.length
            
            try {
              const cacheEntry = JSON.parse(value)
              if (now > cacheEntry.expiresAt) {
                expiredEntries++
              }
            } catch (error) {
              // Invalid cache entry
              expiredEntries++
            }
          }
        }
      })
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
    }

    return { totalEntries, totalSize, expiredEntries }
  }

  /**
   * Clean up expired cache entries
   */
  static cleanupExpiredCache(): void {
    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()
      let cleanedCount = 0

      keys.forEach(key => {
        if (key.startsWith(this.CACHE_PREFIX)) {
          const value = localStorage.getItem(key)
          if (value) {
            try {
              const cacheEntry = JSON.parse(value)
              if (now > cacheEntry.expiresAt) {
                localStorage.removeItem(key)
                cleanedCount++
              }
            } catch (error) {
              // Invalid cache entry, remove it
              localStorage.removeItem(key)
              cleanedCount++
            }
          }
        }
      })

      console.log(`Cleaned up ${cleanedCount} expired cache entries`)
    } catch (error) {
      console.warn('Failed to cleanup expired cache:', error)
    }
  }
}

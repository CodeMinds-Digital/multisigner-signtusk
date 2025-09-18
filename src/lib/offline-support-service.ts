// Offline support service - standalone offline functionality and sync

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'document' | 'signature' | 'user' | 'other'
  entityId: string
  data: any
  timestamp: number
  userId: string
  synced: boolean
  retryCount: number
  lastRetry?: number
}

export interface OfflineData {
  documents: any[]
  signatures: any[]
  userProfiles: any[]
  lastSync: number
  version: string
}

export interface SyncResult {
  success: boolean
  syncedActions: number
  failedActions: number
  conflicts: Array<{
    actionId: string
    reason: string
    localData: any
    serverData: any
  }>
}

export class OfflineSupportService {
  private static isOnline = true
  private static pendingActions: OfflineAction[] = []
  private static offlineData: OfflineData = {
    documents: [],
    signatures: [],
    userProfiles: [],
    lastSync: 0,
    version: '1.0.0'
  }
  private static syncInProgress = false
  private static maxRetries = 3
  private static retryDelay = 5000 // 5 seconds

  /**
   * Initialize offline support
   */
  static initialize(): void {
    this.loadFromStorage()
    this.setupNetworkListeners()
    this.setupPeriodicSync()
    
    console.log('Offline Support Service initialized')
  }

  /**
   * Check if online
   */
  static isOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * Queue action for offline execution
   */
  static queueAction(
    type: OfflineAction['type'],
    entity: OfflineAction['entity'],
    entityId: string,
    data: any,
    userId: string
  ): string {
    const action: OfflineAction = {
      id: this.generateId(),
      type,
      entity,
      entityId,
      data,
      timestamp: Date.now(),
      userId,
      synced: false,
      retryCount: 0
    }

    this.pendingActions.push(action)
    this.saveToStorage()

    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingActions()
    }

    return action.id
  }

  /**
   * Store data for offline access
   */
  static storeOfflineData(
    entity: keyof OfflineData,
    data: any[],
    merge: boolean = false
  ): void {
    if (entity === 'lastSync' || entity === 'version') return

    if (merge) {
      // Merge with existing data, avoiding duplicates
      const existing = this.offlineData[entity] as any[]
      const merged = [...existing]
      
      data.forEach(item => {
        const existingIndex = merged.findIndex(existing => existing.id === item.id)
        if (existingIndex >= 0) {
          merged[existingIndex] = item
        } else {
          merged.push(item)
        }
      })
      
      this.offlineData[entity] = merged as any
    } else {
      this.offlineData[entity] = data as any
    }

    this.offlineData.lastSync = Date.now()
    this.saveToStorage()
  }

  /**
   * Get offline data
   */
  static getOfflineData<T>(entity: keyof OfflineData): T[] {
    if (entity === 'lastSync' || entity === 'version') return []
    return (this.offlineData[entity] as T[]) || []
  }

  /**
   * Search offline data
   */
  static searchOfflineData<T>(
    entity: keyof OfflineData,
    predicate: (item: T) => boolean
  ): T[] {
    const data = this.getOfflineData<T>(entity)
    return data.filter(predicate)
  }

  /**
   * Get single item from offline data
   */
  static getOfflineItem<T>(
    entity: keyof OfflineData,
    id: string
  ): T | null {
    const data = this.getOfflineData<T>(entity)
    return data.find((item: any) => item.id === id) || null
  }

  /**
   * Update offline item
   */
  static updateOfflineItem<T>(
    entity: keyof OfflineData,
    id: string,
    updates: Partial<T>
  ): boolean {
    if (entity === 'lastSync' || entity === 'version') return false

    const data = this.offlineData[entity] as any[]
    const index = data.findIndex(item => item.id === id)
    
    if (index >= 0) {
      data[index] = { ...data[index], ...updates }
      this.saveToStorage()
      return true
    }
    
    return false
  }

  /**
   * Delete offline item
   */
  static deleteOfflineItem(
    entity: keyof OfflineData,
    id: string
  ): boolean {
    if (entity === 'lastSync' || entity === 'version') return false

    const data = this.offlineData[entity] as any[]
    const index = data.findIndex(item => item.id === id)
    
    if (index >= 0) {
      data.splice(index, 1)
      this.saveToStorage()
      return true
    }
    
    return false
  }

  /**
   * Sync pending actions with server
   */
  static async syncPendingActions(): Promise<SyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return {
        success: false,
        syncedActions: 0,
        failedActions: 0,
        conflicts: []
      }
    }

    this.syncInProgress = true
    const result: SyncResult = {
      success: true,
      syncedActions: 0,
      failedActions: 0,
      conflicts: []
    }

    try {
      const actionsToSync = this.pendingActions.filter(a => !a.synced)
      
      for (const action of actionsToSync) {
        try {
          const syncSuccess = await this.syncSingleAction(action)
          
          if (syncSuccess) {
            action.synced = true
            result.syncedActions++
          } else {
            action.retryCount++
            action.lastRetry = Date.now()
            result.failedActions++
            
            // Remove action if max retries exceeded
            if (action.retryCount >= this.maxRetries) {
              this.removePendingAction(action.id)
            }
          }
        } catch (error) {
          console.error('Error syncing action:', error)
          result.failedActions++
        }
      }

      // Remove synced actions
      this.pendingActions = this.pendingActions.filter(a => !a.synced)
      this.saveToStorage()

    } catch (error) {
      console.error('Error during sync:', error)
      result.success = false
    } finally {
      this.syncInProgress = false
    }

    return result
  }

  /**
   * Force full sync
   */
  static async forceFullSync(): Promise<SyncResult> {
    // Reset retry counts
    this.pendingActions.forEach(action => {
      action.retryCount = 0
      action.synced = false
    })

    return this.syncPendingActions()
  }

  /**
   * Get sync status
   */
  static getSyncStatus(): {
    isOnline: boolean
    pendingActions: number
    lastSync: number
    syncInProgress: boolean
  } {
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.filter(a => !a.synced).length,
      lastSync: this.offlineData.lastSync,
      syncInProgress: this.syncInProgress
    }
  }

  /**
   * Get pending actions
   */
  static getPendingActions(userId?: string): OfflineAction[] {
    let actions = this.pendingActions.filter(a => !a.synced)
    
    if (userId) {
      actions = actions.filter(a => a.userId === userId)
    }
    
    return actions.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Clear offline data
   */
  static clearOfflineData(): void {
    this.offlineData = {
      documents: [],
      signatures: [],
      userProfiles: [],
      lastSync: 0,
      version: '1.0.0'
    }
    this.pendingActions = []
    this.saveToStorage()
  }

  /**
   * Export offline data
   */
  static exportOfflineData(): {
    offlineData: OfflineData
    pendingActions: OfflineAction[]
  } {
    return {
      offlineData: { ...this.offlineData },
      pendingActions: [...this.pendingActions]
    }
  }

  /**
   * Import offline data
   */
  static importOfflineData(data: {
    offlineData: OfflineData
    pendingActions: OfflineAction[]
  }): void {
    this.offlineData = data.offlineData
    this.pendingActions = data.pendingActions
    this.saveToStorage()
  }

  /**
   * Private helper methods
   */
  private static async syncSingleAction(action: OfflineAction): Promise<boolean> {
    // Simulate API call - in real implementation, this would make actual HTTP requests
    try {
      console.log(`Syncing action: ${action.type} ${action.entity} ${action.entityId}`)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Simulate success/failure (90% success rate)
      const success = Math.random() > 0.1
      
      if (success) {
        console.log(`Successfully synced action ${action.id}`)
        return true
      } else {
        console.log(`Failed to sync action ${action.id}`)
        return false
      }
    } catch (error) {
      console.error('Error in syncSingleAction:', error)
      return false
    }
  }

  private static removePendingAction(actionId: string): void {
    const index = this.pendingActions.findIndex(a => a.id === actionId)
    if (index >= 0) {
      this.pendingActions.splice(index, 1)
    }
  }

  private static setupNetworkListeners(): void {
    if (typeof window === 'undefined') return

    // Initial online status
    this.isOnline = navigator.onLine

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network: Online')
      this.isOnline = true
      this.syncPendingActions()
    })

    window.addEventListener('offline', () => {
      console.log('Network: Offline')
      this.isOnline = false
    })
  }

  private static setupPeriodicSync(): void {
    // Sync every 30 seconds when online
    setInterval(() => {
      if (this.isOnline && this.pendingActions.some(a => !a.synced)) {
        this.syncPendingActions()
      }
    }, 30000)

    // Retry failed actions every 5 minutes
    setInterval(() => {
      if (this.isOnline) {
        const now = Date.now()
        const actionsToRetry = this.pendingActions.filter(a => 
          !a.synced && 
          a.retryCount < this.maxRetries &&
          (!a.lastRetry || now - a.lastRetry > this.retryDelay)
        )

        if (actionsToRetry.length > 0) {
          console.log(`Retrying ${actionsToRetry.length} failed actions`)
          this.syncPendingActions()
        }
      }
    }, 300000) // 5 minutes
  }

  private static saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem('signtusk_offline_data', JSON.stringify(this.offlineData))
      localStorage.setItem('signtusk_pending_actions', JSON.stringify(this.pendingActions))
    } catch (error) {
      console.error('Error saving offline data to storage:', error)
    }
  }

  private static loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const offlineData = localStorage.getItem('signtusk_offline_data')
      if (offlineData) {
        this.offlineData = JSON.parse(offlineData)
      }

      const pendingActions = localStorage.getItem('signtusk_pending_actions')
      if (pendingActions) {
        this.pendingActions = JSON.parse(pendingActions)
      }
    } catch (error) {
      console.error('Error loading offline data from storage:', error)
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * Check storage quota
   */
  static async getStorageQuota(): Promise<{
    used: number
    available: number
    percentage: number
  }> {
    if (typeof navigator === 'undefined' || !navigator.storage) {
      return { used: 0, available: 0, percentage: 0 }
    }

    try {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage || 0
      const available = estimate.quota || 0
      const percentage = available > 0 ? (used / available) * 100 : 0

      return { used, available, percentage }
    } catch (error) {
      console.error('Error getting storage quota:', error)
      return { used: 0, available: 0, percentage: 0 }
    }
  }
}

/**
 * Offline Service
 * Manages offline signing support for mobile devices
 * Note: This is a client-side service that would run in the browser
 */

import {
  Result,
  SignatureRequest,
  OfflineSignature,
  OfflineStatus,
} from '../types/signature-types'
import { createInternalError, serializeError } from '../errors/signature-errors'

/**
 * Offline Service for client-side offline support
 */
export class OfflineService {
  private dbName = 'signatures_offline'
  private storeName = 'pending_signatures'
  private db: IDBDatabase | null = null

  /**
   * Initialize IndexedDB
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return // Server-side, skip initialization
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true })
        }
      }
    })
  }

  /**
   * Save signature for offline processing
   */
  async saveOfflineSignature(signature: OfflineSignature): Promise<Result<void>> {
    try {
      if (!this.db) {
        await this.initialize()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not initialized'))
          return
        }

        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.add({
          ...signature,
          timestamp: new Date().toISOString(),
          synced: false,
        })

        request.onsuccess = () => {
          resolve({ success: true })
        }

        request.onerror = () => {
          resolve({
            success: false,
            error: serializeError(request.error),
          })
        }
      })
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get all pending offline signatures
   */
  async getPendingSignatures(): Promise<Result<OfflineSignature[]>> {
    try {
      if (!this.db) {
        await this.initialize()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not initialized'))
          return
        }

        const transaction = this.db.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.getAll()

        request.onsuccess = () => {
          const signatures = request.result.filter((s: any) => !s.synced)
          resolve({
            success: true,
            data: signatures,
          })
        }

        request.onerror = () => {
          resolve({
            success: false,
            error: serializeError(request.error),
          })
        }
      })
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Sync pending signatures to server
   */
  async syncPendingSignatures(): Promise<Result<{ synced: number; failed: number }>> {
    try {
      const pendingResult = await this.getPendingSignatures()
      if (!pendingResult.success || !pendingResult.data) {
        throw new Error('Failed to get pending signatures')
      }

      const pending = pendingResult.data
      let synced = 0
      let failed = 0

      for (const signature of pending) {
        try {
          // Call API to sync signature - Fixed endpoint path (Comment 5)
          const response = await fetch(`/api/v1/signatures/requests/${signature.signature_request_id}/sign`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              signature_request_id: signature.signature_request_id,
              signer_id: signature.signer_id,
              signature_data: signature.signature_data,
              signature_method: signature.signature_method,
            }),
          })

          if (response.ok) {
            // Mark as synced
            await this.markAsSynced(signature.id!)
            synced++
          } else {
            failed++
          }
        } catch (error) {
          console.error('Failed to sync signature:', error)
          failed++
        }
      }

      return {
        success: true,
        data: { synced, failed },
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Mark signature as synced
   */
  private async markAsSynced(id: number): Promise<void> {
    if (!this.db) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'))
        return
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(id)

      request.onsuccess = () => {
        const signature = request.result
        if (signature) {
          signature.synced = true
          signature.synced_at = new Date().toISOString()
          store.put(signature)
        }
        resolve()
      }

      request.onerror = () => reject(request.error)
    })
  }

  /**
   * Cache request for offline access
   */
  async cacheRequestForOffline(request: SignatureRequest): Promise<Result<void>> {
    try {
      // Store in localStorage for simplicity
      if (typeof window !== 'undefined') {
        const cached = JSON.parse(localStorage.getItem('offline_requests') || '[]')
        cached.push(request)
        localStorage.setItem('offline_requests', JSON.stringify(cached))
      }

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get cached offline requests
   */
  async getOfflineRequests(): Promise<Result<SignatureRequest[]>> {
    try {
      if (typeof window !== 'undefined') {
        const cached = JSON.parse(localStorage.getItem('offline_requests') || '[]')
        return {
          success: true,
          data: cached,
        }
      }

      return {
        success: true,
        data: [],
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Clear offline data
   */
  async clearOfflineData(): Promise<Result<void>> {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('offline_requests')
      }

      if (!this.db) {
        await this.initialize()
      }

      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Database not initialized'))
          return
        }

        const transaction = this.db.transaction([this.storeName], 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.clear()

        request.onsuccess = () => {
          resolve({ success: true })
        }

        request.onerror = () => {
          resolve({
            success: false,
            error: serializeError(request.error),
          })
        }
      })
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }

  /**
   * Get offline status
   */
  async getOfflineStatus(): Promise<Result<OfflineStatus>> {
    try {
      const pendingResult = await this.getPendingSignatures()
      const pending = pendingResult.data?.length || 0

      const status: OfflineStatus = {
        is_online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        pending_signatures: pending,
        last_sync: localStorage.getItem('last_sync') || null,
      }

      return {
        success: true,
        data: status,
      }
    } catch (error) {
      return {
        success: false,
        error: serializeError(error),
      }
    }
  }
}

// Export singleton instance
export const offlineService = new OfflineService()


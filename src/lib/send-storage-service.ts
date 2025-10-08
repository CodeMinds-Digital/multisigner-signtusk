import { supabaseAdmin } from './supabase-admin'

export interface UploadOptions {
  bucket: 'send-documents' | 'send-thumbnails' | 'send-watermarks' | 'send-brand-assets'
  userId: string
  file: File | Buffer
  fileName: string
  contentType?: string
  cacheControl?: string
  upsert?: boolean
}

export interface DownloadOptions {
  bucket: string
  filePath: string
  expiresIn?: number // seconds
}

export interface StorageQuota {
  used: number // bytes
  limit: number // bytes
  percentage: number
  remaining: number
}

export class SendStorageService {
  private static readonly DEFAULT_CACHE_CONTROL = '3600'
  private static readonly DEFAULT_SIGNED_URL_EXPIRY = 3600 // 1 hour
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000 // ms

  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(options: UploadOptions): Promise<{ path: string; url: string }> {
    const { bucket, userId, file, fileName, contentType, cacheControl, upsert } = options

    // Generate file path with user folder
    const timestamp = Date.now()
    const sanitizedFileName = this.sanitizeFileName(fileName)
    const filePath = `${userId}/${timestamp}_${sanitizedFileName}`

    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: cacheControl || this.DEFAULT_CACHE_CONTROL,
            upsert: upsert || false,
            contentType: contentType
          })

        if (error) {
          throw error
        }

        // Get public URL for public buckets, signed URL for private buckets
        const url = await this.getFileUrl(bucket, data.path)

        return {
          path: data.path,
          url
        }
      } catch (error: any) {
        lastError = error
        console.error(`Upload attempt ${attempt} failed:`, error)

        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt)
        }
      }
    }

    throw new Error(`Failed to upload file after ${this.MAX_RETRIES} attempts: ${lastError?.message}`)
  }

  /**
   * Download a file from Supabase Storage
   */
  static async downloadFile(options: DownloadOptions): Promise<Blob> {
    const { bucket, filePath } = options

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(filePath)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    return data
  }

  /**
   * Get a signed URL for a private file
   */
  static async getSignedUrl(
    bucket: string,
    filePath: string,
    expiresIn: number = this.DEFAULT_SIGNED_URL_EXPIRY
  ): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }

  /**
   * Get file URL (public or signed)
   */
  static async getFileUrl(bucket: string, filePath: string): Promise<string> {
    // Check if bucket is public
    const { data: bucketData } = await supabaseAdmin.storage
      .getBucket(bucket)

    if (bucketData?.public) {
      // Get public URL
      const { data } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return data.publicUrl
    } else {
      // Get signed URL for private buckets
      return await this.getSignedUrl(bucket, filePath)
    }
  }

  /**
   * Delete a file from storage
   */
  static async deleteFile(bucket: string, filePath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  /**
   * Delete multiple files from storage
   */
  static async deleteFiles(bucket: string, filePaths: string[]): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove(filePaths)

    if (error) {
      throw new Error(`Failed to delete files: ${error.message}`)
    }
  }

  /**
   * Move a file to a different location
   */
  static async moveFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .move(fromPath, toPath)

    if (error) {
      throw new Error(`Failed to move file: ${error.message}`)
    }
  }

  /**
   * Copy a file to a different location
   */
  static async copyFile(
    bucket: string,
    fromPath: string,
    toPath: string
  ): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .copy(fromPath, toPath)

    if (error) {
      throw new Error(`Failed to copy file: ${error.message}`)
    }
  }

  /**
   * List files in a folder
   */
  static async listFiles(
    bucket: string,
    folderPath: string = '',
    options?: {
      limit?: number
      offset?: number
      sortBy?: { column: string; order: 'asc' | 'desc' }
    }
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(folderPath, options)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data
  }

  /**
   * Get storage quota for a user
   */
  static async getUserStorageQuota(userId: string): Promise<StorageQuota> {
    // Get all user's files across all send buckets
    const buckets = ['send-documents', 'send-thumbnails', 'send-watermarks', 'send-brand-assets']
    let totalSize = 0

    for (const bucket of buckets) {
      try {
        const files = await this.listFiles(bucket, userId)
        totalSize += files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
      } catch (error) {
        console.error(`Error getting files from ${bucket}:`, error)
      }
    }

    // Default limit: 10GB per user
    const limit = 10 * 1024 * 1024 * 1024 // 10GB in bytes

    return {
      used: totalSize,
      limit,
      percentage: (totalSize / limit) * 100,
      remaining: limit - totalSize
    }
  }

  /**
   * Check if user has enough storage quota
   */
  static async checkStorageQuota(userId: string, fileSize: number): Promise<boolean> {
    const quota = await this.getUserStorageQuota(userId)
    return quota.remaining >= fileSize
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(bucket: string, filePath: string) {
    const files = await this.listFiles(bucket, filePath.split('/').slice(0, -1).join('/'))
    const fileName = filePath.split('/').pop()
    return files.find(f => f.name === fileName)
  }

  /**
   * Sanitize file name to prevent path traversal and special characters
   */
  private static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255) // Limit length
  }

  /**
   * Delay helper for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeType(fileName: string): string {
    const ext = this.getFileExtension(fileName)
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml'
    }
    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Format file size to human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
}


import { supabase } from './supabase'

export interface DocumentRecord {
  id: string
  title: string
  description?: string
  file_name?: string
  file_url?: string
  file_size_mb?: number
  status: 'draft' | 'ready' | 'published' | 'archived'
  user_id: string
  user_email: string
  signers: Array<{ name: string; email: string; status?: string }>
  signature_fields: any[]
  settings: Record<string, any>
  completion_percentage: number
  reminder_count: number
  view_count: number
  download_count: number
  created_at: string
  updated_at: string
  expires_at?: string
  completed_at?: string
  last_activity_at: string
  category?: string
  document_type?: string
  signature_type: 'single' | 'multi'
  pdf_url?: string
  template_url?: string
  schemas: any[]
  template_data?: any
  is_public: boolean
  is_system_template: boolean
  usage_count: number
  metadata: Record<string, any>
}

export interface DocumentListItem {
  id: string
  name: string
  type: string
  status: string
  recipients: string[]
  due_date: string
  created_at: string
  completion_percentage: number
}

export class DocumentsService {
  /**
   * Get all documents for a user
   */
  static async getDocuments(userId: string): Promise<DocumentListItem[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching documents:', error)
        throw error
      }

      // Transform the data to match the expected format
      return (data || []).map((doc: DocumentRecord) => ({
        id: doc.id,
        name: doc.title || doc.file_name || 'Untitled Document',
        type: doc.document_type || doc.category || 'document',
        status: this.formatStatus(doc.status),
        recipients: doc.signers?.map(signer => signer.email) || [],
        due_date: doc.expires_at || this.calculateDueDate(doc.created_at),
        created_at: doc.created_at,
        completion_percentage: doc.completion_percentage || 0
      }))
    } catch (error) {
      console.error('Error in getDocuments:', error)
      throw error
    }
  }

  /**
   * Get a single document by ID
   */
  static async getDocument(documentId: string, userId: string): Promise<DocumentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching document:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getDocument:', error)
      return null
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error deleting document:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in deleteDocument:', error)
      return false
    }
  }

  /**
   * Update document status
   */
  static async updateDocumentStatus(
    documentId: string,
    userId: string,
    status: DocumentRecord['status']
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', documentId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error updating document status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateDocumentStatus:', error)
      return false
    }
  }

  /**
   * Get document statistics for dashboard
   */
  static async getDocumentStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('status, completion_percentage')
        .eq('user_id', userId)

      if (error) {
        console.error('Error fetching document stats:', error)
        return {
          total: 0,
          completed: 0,
          pending: 0,
          draft: 0
        }
      }

      const stats = {
        total: data.length,
        completed: data.filter(doc => doc.status === 'published').length,
        pending: data.filter(doc => doc.status === 'ready').length,
        draft: data.filter(doc => doc.status === 'draft').length
      }

      return stats
    } catch (error) {
      console.error('Error in getDocumentStats:', error)
      return {
        total: 0,
        completed: 0,
        pending: 0,
        draft: 0
      }
    }
  }

  /**
   * Format status for display
   */
  private static formatStatus(status: string): string {
    switch (status) {
      case 'published':
        return 'Completed'
      case 'ready':
        return 'Pending'
      case 'draft':
        return 'Draft'
      case 'archived':
        return 'Archived'
      default:
        return 'Unknown'
    }
  }

  /**
   * Calculate due date (7 days from creation if not set)
   */
  private static calculateDueDate(createdAt: string): string {
    const created = new Date(createdAt)
    const dueDate = new Date(created.getTime() + (7 * 24 * 60 * 60 * 1000)) // 7 days
    return dueDate.toISOString()
  }

  /**
   * Get recent documents (last 5)
   */
  static async getRecentDocuments(userId: string): Promise<DocumentListItem[]> {
    try {
      const documents = await this.getDocuments(userId)
      return documents.slice(0, 5)
    } catch (error) {
      console.error('Error in getRecentDocuments:', error)
      return []
    }
  }
}

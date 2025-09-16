import { supabase } from './supabase'

export interface DocumentType {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  is_system: boolean
  user_id?: string
  created_at: string
  updated_at: string
  template_count?: number // For UI display
}

export interface CreateDocumentTypeData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UpdateDocumentTypeData {
  name?: string
  description?: string
  color?: string
  icon?: string
}

export class DocumentTypesService {
  private static readonly TABLE_NAME = 'document_types'

  /**
   * Get all document types for a user (system + user's own)
   */
  static async getDocumentTypes(userId: string): Promise<DocumentType[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${userId}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching document types:', error)
        return []
      }

      // Get template counts for each document type
      const typesWithCounts = await Promise.all(
        (data || []).map(async (type: any) => {
          const { count } = await supabase
            .from('document_templates')
            .select('*', { count: 'exact', head: true })
            .eq('type', type.name)
            .eq('user_id', userId)

          return {
            ...type,
            template_count: count || 0
          }
        })
      )

      return typesWithCounts
    } catch (error) {
      console.error('Error fetching document types:', error)
      return []
    }
  }

  /**
   * Create a new document type
   */
  static async createDocumentType(
    userId: string,
    typeData: CreateDocumentTypeData
  ): Promise<DocumentType | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...typeData,
          user_id: userId,
          is_system: false,
          color: typeData.color || '#3B82F6',
          icon: typeData.icon || 'file-text'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating document type:', error)
        return null
      }

      return { ...data, template_count: 0 }
    } catch (error) {
      console.error('Error creating document type:', error)
      return null
    }
  }

  /**
   * Update a document type
   */
  static async updateDocumentType(
    typeId: string,
    userId: string,
    updateData: UpdateDocumentTypeData
  ): Promise<DocumentType | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', typeId)
        .eq('user_id', userId)
        .eq('is_system', false) // Only allow updating user types
        .select()
        .single()

      if (error) {
        console.error('Error updating document type:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating document type:', error)
      return null
    }
  }

  /**
   * Check if a document type can be deleted
   */
  static async canDeleteDocumentType(typeName: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_delete_document_type', {
          type_name: typeName,
          user_id_param: userId
        })

      if (error) {
        console.warn('RPC function not available, using fallback method:', error.message)
        // Fallback: manually check template count
        return await this.canDeleteDocumentTypeFallback(typeName, userId)
      }

      return data === true
    } catch (error) {
      console.warn('Error checking if document type can be deleted, using fallback:', error)
      return await this.canDeleteDocumentTypeFallback(typeName, userId)
    }
  }

  /**
   * Fallback method to check if document type can be deleted
   */
  private static async canDeleteDocumentTypeFallback(typeName: string, userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('document_templates')
        .select('*', { count: 'exact', head: true })
        .eq('type', typeName)
        .eq('user_id', userId)

      if (error) {
        console.error('Error in fallback check:', error)
        return false
      }

      return (count || 0) === 0
    } catch (error) {
      console.error('Error in fallback check:', error)
      return false
    }
  }

  /**
   * Move templates from one document type to another
   */
  static async moveTemplatesToDocumentType(
    oldType: string,
    newType: string,
    userId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('move_templates_to_document_type', {
          old_type: oldType,
          new_type: newType,
          user_id_param: userId
        })

      if (error) {
        console.error('Error moving templates to document type:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error moving templates to document type:', error)
      return 0
    }
  }

  /**
   * Delete a document type (with optional template reassignment)
   */
  static async deleteDocumentType(
    typeId: string,
    typeName: string,
    userId: string,
    newTypeName?: string
  ): Promise<boolean> {
    try {
      // If new type is specified, move templates first
      if (newTypeName) {
        const movedCount = await this.moveTemplatesToDocumentType(
          typeName,
          newTypeName,
          userId
        )
        console.log(`Moved ${movedCount} templates to ${newTypeName}`)
      }

      // Delete the document type
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', typeId)
        .eq('user_id', userId)
        .eq('is_system', false) // Only allow deleting user types

      if (error) {
        console.error('Error deleting document type:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting document type:', error)
      return false
    }
  }

  /**
   * Get document types for dropdown (name and display label)
   */
  static async getDocumentTypesForDropdown(userId: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const types = await this.getDocumentTypes(userId)
      return types.map(type => ({
        value: type.name,
        label: type.is_system ? type.name : `${type.name} (Custom)`
      }))
    } catch (error) {
      console.error('Error fetching document types for dropdown:', error)
      return [{ value: 'Contract', label: 'Contract' }]
    }
  }
}

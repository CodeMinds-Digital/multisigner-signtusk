import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
}

export interface DocumentCategory {
  id: string
  name: string
  description?: string
  color: string
  icon: string
  is_system: boolean
  user_id?: string
  created_at: string
  updated_at: string
}

export interface CreateDocumentTypeData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface CreateDocumentCategoryData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export class DocumentMetadataService {
  // Document Types
  static async getDocumentTypes(userId: string): Promise<DocumentType[]> {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${userId}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching document types:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching document types:', error)
      return []
    }
  }

  static async createDocumentType(
    userId: string,
    typeData: CreateDocumentTypeData
  ): Promise<DocumentType | null> {
    try {
      const { data, error } = await supabase
        .from('document_types')
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

      return data
    } catch (error) {
      console.error('Error creating document type:', error)
      return null
    }
  }

  static async updateDocumentType(
    typeId: string,
    userId: string,
    updates: Partial<CreateDocumentTypeData>
  ): Promise<DocumentType | null> {
    try {
      const { data, error } = await supabase
        .from('document_types')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', typeId)
        .eq('user_id', userId)
        .eq('is_system', false)
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

  static async deleteDocumentType(typeId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('document_types')
        .delete()
        .eq('id', typeId)
        .eq('user_id', userId)
        .eq('is_system', false)

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

  // Document Categories
  static async getDocumentCategories(userId: string): Promise<DocumentCategory[]> {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${userId}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching document categories:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching document categories:', error)
      return []
    }
  }

  static async createDocumentCategory(
    userId: string,
    categoryData: CreateDocumentCategoryData
  ): Promise<DocumentCategory | null> {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .insert({
          ...categoryData,
          user_id: userId,
          is_system: false,
          color: categoryData.color || '#10B981',
          icon: categoryData.icon || 'folder'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating document category:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating document category:', error)
      return null
    }
  }

  static async updateDocumentCategory(
    categoryId: string,
    userId: string,
    updates: Partial<CreateDocumentCategoryData>
  ): Promise<DocumentCategory | null> {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .eq('user_id', userId)
        .eq('is_system', false)
        .select()
        .single()

      if (error) {
        console.error('Error updating document category:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating document category:', error)
      return null
    }
  }

  static async deleteDocumentCategory(categoryId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('document_categories')
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId)
        .eq('is_system', false)

      if (error) {
        console.error('Error deleting document category:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting document category:', error)
      return false
    }
  }
}

import { supabase } from './supabase'

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
  template_count?: number // For UI display
}

export interface CreateCategoryData {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UpdateCategoryData {
  name?: string
  description?: string
  color?: string
  icon?: string
}

export class CategoriesService {
  private static readonly TABLE_NAME = 'document_categories'

  /**
   * Get all categories for a user (system + user's own)
   */
  static async getCategories(userId: string): Promise<DocumentCategory[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${userId}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return []
      }

      // Get template counts for each category
      const categoriesWithCounts = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('document_templates')
            .select('*', { count: 'exact', head: true })
            .eq('category', category.name)
            .eq('user_id', userId)

          return {
            ...category,
            template_count: count || 0
          }
        })
      )

      return categoriesWithCounts
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  /**
   * Create a new category
   */
  static async createCategory(
    userId: string,
    categoryData: CreateCategoryData
  ): Promise<DocumentCategory | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...categoryData,
          user_id: userId,
          is_system: false,
          color: categoryData.color || '#3B82F6',
          icon: categoryData.icon || 'folder'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating category:', error)
        return null
      }

      return { ...data, template_count: 0 }
    } catch (error) {
      console.error('Error creating category:', error)
      return null
    }
  }

  /**
   * Update a category
   */
  static async updateCategory(
    categoryId: string,
    userId: string,
    updateData: UpdateCategoryData
  ): Promise<DocumentCategory | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .eq('user_id', userId)
        .eq('is_system', false) // Only allow updating user categories
        .select()
        .single()

      if (error) {
        console.error('Error updating category:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating category:', error)
      return null
    }
  }

  /**
   * Check if a category can be deleted
   */
  static async canDeleteCategory(categoryName: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('can_delete_category', {
          category_name: categoryName,
          user_id_param: userId
        })

      if (error) {
        console.warn('RPC function not available, using fallback method:', error.message)
        // Fallback: manually check template count
        return await this.canDeleteCategoryFallback(categoryName, userId)
      }

      return data === true
    } catch (error) {
      console.warn('Error checking if category can be deleted, using fallback:', error)
      return await this.canDeleteCategoryFallback(categoryName, userId)
    }
  }

  /**
   * Fallback method to check if category can be deleted
   */
  private static async canDeleteCategoryFallback(categoryName: string, userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('document_templates')
        .select('*', { count: 'exact', head: true })
        .eq('category', categoryName)
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
   * Move templates from one category to another
   */
  static async moveTemplatesToCategory(
    oldCategory: string,
    newCategory: string,
    userId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase
        .rpc('move_templates_to_category', {
          old_category: oldCategory,
          new_category: newCategory,
          user_id_param: userId
        })

      if (error) {
        console.error('Error moving templates to category:', error)
        return 0
      }

      return data || 0
    } catch (error) {
      console.error('Error moving templates to category:', error)
      return 0
    }
  }

  /**
   * Delete a category (with optional template reassignment)
   */
  static async deleteCategory(
    categoryId: string,
    categoryName: string,
    userId: string,
    newCategoryName?: string
  ): Promise<boolean> {
    try {
      // If new category is specified, move templates first
      if (newCategoryName) {
        const movedCount = await this.moveTemplatesToCategory(
          categoryName,
          newCategoryName,
          userId
        )
        console.log(`Moved ${movedCount} templates to ${newCategoryName}`)
      }

      // Delete the category
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', categoryId)
        .eq('user_id', userId)
        .eq('is_system', false) // Only allow deleting user categories

      if (error) {
        console.error('Error deleting category:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting category:', error)
      return false
    }
  }

  /**
   * Get categories for dropdown (name and display label)
   */
  static async getCategoriesForDropdown(userId: string): Promise<Array<{ value: string; label: string }>> {
    try {
      const categories = await this.getCategories(userId)
      return categories.map(category => ({
        value: category.name,
        label: category.is_system ? category.name : `${category.name} (Custom)`
      }))
    } catch (error) {
      console.error('Error fetching categories for dropdown:', error)
      return [{ value: 'General', label: 'General' }]
    }
  }
}

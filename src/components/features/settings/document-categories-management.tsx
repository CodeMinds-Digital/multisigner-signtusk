'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Folder, Save, X } from 'lucide-react'
import { DocumentMetadataService, DocumentCategory, CreateDocumentCategoryData } from '@/lib/document-metadata-service'
import { useAuth } from '@/components/providers/auth-provider'

export function DocumentCategoriesManagement() {
  const { user } = useAuth()
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<CreateDocumentCategoryData>({
    name: '',
    description: '',
    color: '#10B981',
    icon: 'folder'
  })

  useEffect(() => {
    loadDocumentCategories()
  }, [user?.id])

  const loadDocumentCategories = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const categories = await DocumentMetadataService.getDocumentCategories(user.id)
      setDocumentCategories(categories)
    } catch (error) {
      console.error('Error loading document categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!user?.id || !formData.name.trim()) return

    try {
      const newCategory = await DocumentMetadataService.createDocumentCategory(user.id, formData)
      if (newCategory) {
        setDocumentCategories(prev => [...prev, newCategory])
        setFormData({ name: '', description: '', color: '#10B981', icon: 'folder' })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error creating document category:', error)
    }
  }

  const handleUpdate = async () => {
    if (!user?.id || !editingCategory) return

    try {
      const updatedCategory = await DocumentMetadataService.updateDocumentCategory(
        editingCategory.id,
        user.id,
        formData
      )
      if (updatedCategory) {
        setDocumentCategories(prev => 
          prev.map(category => category.id === editingCategory.id ? updatedCategory : category)
        )
        setEditingCategory(null)
        setFormData({ name: '', description: '', color: '#10B981', icon: 'folder' })
      }
    } catch (error) {
      console.error('Error updating document category:', error)
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!user?.id) return

    if (confirm('Are you sure you want to delete this document category?')) {
      try {
        const success = await DocumentMetadataService.deleteDocumentCategory(categoryId, user.id)
        if (success) {
          setDocumentCategories(prev => prev.filter(category => category.id !== categoryId))
        }
      } catch (error) {
        console.error('Error deleting document category:', error)
      }
    }
  }

  const startEdit = (category: DocumentCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setShowAddForm(false)
    setFormData({ name: '', description: '', color: '#10B981', icon: 'folder' })
  }

  if (loading) {
    return <div className="p-6">Loading document categories...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Document Categories</h3>
          <p className="text-sm text-gray-500">Manage document categories for your organization</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingCategory) && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingCategory ? 'Edit Document Category' : 'Add New Document Category'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., Legal, Financial, HR"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={editingCategory ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingCategory ? 'Update' : 'Create'}
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Document Categories List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900">Current Document Categories</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {documentCategories.map((category) => (
            <div key={category.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Folder className="w-5 h-5" style={{ color: category.color }} />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">{category.name}</h5>
                  {category.description && (
                    <p className="text-sm text-gray-500">{category.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {category.is_system ? 'System' : 'Custom'}
                    </span>
                  </div>
                </div>
              </div>
              {!category.is_system && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

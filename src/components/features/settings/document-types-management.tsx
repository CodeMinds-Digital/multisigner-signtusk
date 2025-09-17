'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, FileText, Save, X } from 'lucide-react'
import { DocumentMetadataService, DocumentType, CreateDocumentTypeData } from '@/lib/document-metadata-service'
import { useAuth } from '@/components/providers/secure-auth-provider'

export function DocumentTypesManagement() {
  const { user } = useAuth()
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingType, setEditingType] = useState<DocumentType | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<CreateDocumentTypeData>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'file-text'
  })

  const loadDocumentTypes = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const types = await DocumentMetadataService.getDocumentTypes(user.id)
      setDocumentTypes(types)
    } catch (error) {
      console.error('Error loading document types:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])



  useEffect(() => {
    loadDocumentTypes()
  }, [user?.id, loadDocumentTypes])

  const handleCreate = async () => {
    if (!user?.id || !formData.name.trim()) return

    try {
      const newType = await DocumentMetadataService.createDocumentType(user.id, formData)
      if (newType) {
        setDocumentTypes(prev => [...prev, newType])
        setFormData({ name: '', description: '', color: '#3B82F6', icon: 'file-text' })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error creating document type:', error)
    }
  }

  const handleUpdate = async () => {
    if (!user?.id || !editingType) return

    try {
      const updatedType = await DocumentMetadataService.updateDocumentType(
        editingType.id,
        user.id,
        formData
      )
      if (updatedType) {
        setDocumentTypes(prev =>
          prev.map(type => type.id === editingType.id ? updatedType : type)
        )
        setEditingType(null)
        setFormData({ name: '', description: '', color: '#3B82F6', icon: 'file-text' })
      }
    } catch (error) {
      console.error('Error updating document type:', error)
    }
  }

  const handleDelete = async (typeId: string) => {
    if (!user?.id) return

    if (confirm('Are you sure you want to delete this document type?')) {
      try {
        const success = await DocumentMetadataService.deleteDocumentType(typeId, user.id)
        if (success) {
          setDocumentTypes(prev => prev.filter(type => type.id !== typeId))
        }
      } catch (error) {
        console.error('Error deleting document type:', error)
      }
    }
  }

  const startEdit = (type: DocumentType) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      description: type.description || '',
      color: type.color,
      icon: type.icon
    })
    setShowAddForm(false)
  }

  const cancelEdit = () => {
    setEditingType(null)
    setShowAddForm(false)
    setFormData({ name: '', description: '', color: '#3B82F6', icon: 'file-text' })
  }

  if (loading) {
    return <div className="p-6">Loading document types...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Document Types</h3>
          <p className="text-sm text-gray-500">Manage document types for your organization</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Type
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingType) && (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {editingType ? 'Edit Document Type' : 'Add New Document Type'}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Contract, Invoice"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <button
              onClick={editingType ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingType ? 'Update' : 'Create'}
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

      {/* Document Types List */}
      <div className="bg-white rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900">Current Document Types</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {documentTypes.map((type) => (
            <div key={type.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  <FileText className="w-5 h-5" style={{ color: type.color }} />
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-900">{type.name}</h5>
                  {type.description && (
                    <p className="text-sm text-gray-500">{type.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-400">
                      {type.is_system ? 'System' : 'Custom'}
                    </span>
                  </div>
                </div>
              </div>
              {!type.is_system && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(type)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
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

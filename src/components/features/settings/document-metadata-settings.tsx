'use client'

import React, { useState } from 'react'
import { FileText, Folder, Hash } from 'lucide-react'
import { DocumentTypesManagement } from './document-types-management'
import { DocumentCategoriesManagement } from './document-categories-management'
import { DocumentIdSettings } from './document-id-settings'

export function DocumentMetadataSettings() {
  const [activeTab, setActiveTab] = useState<'types' | 'categories' | 'sign-ids'>('types')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Document Settings</h2>
        <p className="text-gray-600 mt-1">Manage document types and categories for your organization</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('types')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'types'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Document Types</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'categories'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4" />
              <span>Document Categories</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('sign-ids')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'sign-ids'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Hash className="w-4 h-4" />
              <span>Document Sign IDs</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'types' && <DocumentTypesManagement />}
        {activeTab === 'categories' && <DocumentCategoriesManagement />}
        {activeTab === 'sign-ids' && <DocumentIdSettings />}
      </div>
    </div>
  )
}

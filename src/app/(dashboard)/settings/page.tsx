'use client'

import { useState } from 'react'
import { FileText, Shield } from 'lucide-react'
import { DocumentMetadataSettings } from '@/components/features/settings/document-metadata-settings'
import { SecuritySettings } from '@/components/features/settings/security-settings'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'documents' | 'security'>('documents')

  return (
    <div className="max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
        </div>

        {/* Main Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Documents</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'security'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'documents' && <DocumentMetadataSettings />}
          {activeTab === 'security' && <SecuritySettings />}
        </div>
      </div>
    </div>
  )
}

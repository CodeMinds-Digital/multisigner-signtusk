'use client'

import React, { useState } from 'react'
import { Shield, Key, Smartphone } from 'lucide-react'
import { TOTPSettings } from './totp-settings'
import { SigningSecuritySettings } from './signing-security-settings'
import { GeneralSecuritySettings } from './general-security-settings'

export function SecuritySettings() {
  const [activeTab, setActiveTab] = useState<'totp' | 'signing' | 'general'>('totp')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account security and authentication preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('totp')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'totp'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4" />
              <span>Two-Factor Authentication</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('signing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'signing'
              ? 'border-green-500 text-green-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Key className="w-4 h-4" />
              <span>Signing Security</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'general'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>General Security</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'totp' && <TOTPSettings />}
        {activeTab === 'signing' && <SigningSecuritySettings />}
        {activeTab === 'general' && <GeneralSecuritySettings />}
      </div>
    </div>
  )
}

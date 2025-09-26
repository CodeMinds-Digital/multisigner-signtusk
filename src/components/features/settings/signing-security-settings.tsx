'use client'

import React, { useState, useEffect } from 'react'
import {
  Key,
  Shield,
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/secure-auth-provider'

interface SigningSecurityConfig {
  totpEnabled: boolean
  signingMFAEnabled: boolean
  defaultRequireTOTP: boolean
  backupCodesCount: number
}

export function SigningSecuritySettings() {
  const { user: _user } = useAuth()
  const [config, setConfig] = useState<SigningSecurityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadSigningConfig()
  }, [])

  const loadSigningConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/totp/config', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setConfig({
          totpEnabled: result.data.enabled,
          signingMFAEnabled: result.data.signingMFAEnabled,
          defaultRequireTOTP: result.data.defaultRequireTOTP,
          backupCodesCount: result.data.backupCodesCount
        })
      } else {
        setError('Failed to load signing security configuration')
      }
    } catch (error) {
      console.error('Error loading signing config:', error)
      setError('Failed to load signing security configuration')
    } finally {
      setLoading(false)
    }
  }

  const updateSigningSettings = async (settings: Partial<SigningSecurityConfig>) => {
    try {
      setError('')

      const response = await fetch('/api/auth/totp/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          signingMFA: settings.signingMFAEnabled,
          defaultRequireTOTP: settings.defaultRequireTOTP
        })
      })

      if (response.ok) {
        setSuccess('Signing security settings updated successfully!')
        await loadSigningConfig()
        setTimeout(() => setSuccess(''), 3000)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating signing settings:', error)
      setError('Failed to update signing settings')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading signing security settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700 font-medium">Success</span>
          </div>
          <p className="text-green-700 mt-1">{success}</p>
        </div>
      )}

      {/* Signing Security Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`p-2 rounded-lg ${config?.signingMFAEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
            <Key className={`w-6 h-6 ${config?.signingMFAEnabled ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Document Signing Security</h3>
            <p className="text-sm text-gray-600">
              Configure security requirements for document signing
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">TOTP Status</div>
            <div className={`text-xs ${config?.totpEnabled ? 'text-green-600' : 'text-gray-500'}`}>
              {config?.totpEnabled ? 'Configured' : 'Not Setup'}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Signing Protection</div>
            <div className={`text-xs ${config?.signingMFAEnabled ? 'text-green-600' : 'text-gray-500'}`}>
              {config?.signingMFAEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Users className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-900">Default Policy</div>
            <div className={`text-xs ${config?.defaultRequireTOTP ? 'text-green-600' : 'text-gray-500'}`}>
              {config?.defaultRequireTOTP ? 'TOTP Required' : 'Optional'}
            </div>
          </div>
        </div>
      </div>

      {/* TOTP Setup Required */}
      {!config?.totpEnabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900">TOTP Setup Required</h3>
              <p className="text-blue-700 mt-1 mb-4">
                To enable signing security features, you need to set up Two-Factor Authentication first.
              </p>
              <Button
                onClick={() => window.location.hash = '#totp'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Setup TOTP Authentication
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Signing Security Settings */}
      {config?.totpEnabled && (
        <div className="space-y-4">
          {/* Personal Signing Protection */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Signing Protection</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Require TOTP for My Signatures</label>
                  <p className="text-xs text-gray-600">
                    Always require TOTP verification when you sign documents
                  </p>
                </div>
                <button
                  onClick={() => updateSigningSettings({
                    ...config,
                    signingMFAEnabled: !config.signingMFAEnabled
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.signingMFAEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.signingMFAEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Default TOTP for New Requests</label>
                  <p className="text-xs text-gray-600">
                    Automatically require TOTP for all signers in new requests you create
                  </p>
                </div>
                <button
                  onClick={() => updateSigningSettings({
                    ...config,
                    defaultRequireTOTP: !config.defaultRequireTOTP
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.defaultRequireTOTP ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.defaultRequireTOTP ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">How Signing Security Works</h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Request Creation</h4>
                  <p className="text-xs text-gray-600">
                    When creating a signing request, you can choose to require TOTP for all signers
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Signer Experience</h4>
                  <p className="text-xs text-gray-600">
                    Signers will be prompted to set up TOTP if they haven't already, then verify before signing
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Audit Trail</h4>
                  <p className="text-xs text-gray-600">
                    All TOTP verifications are logged for compliance and security auditing
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Backup Codes Status */}
          {config.backupCodesCount > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Emergency Access</h3>
                  <p className="text-sm text-gray-600">
                    You have {config.backupCodesCount} backup codes for emergency signing access
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.hash = '#totp'}
                  size="sm"
                >
                  Manage Backup Codes
                </Button>
              </div>

              {config.backupCodesCount < 3 && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ You're running low on backup codes. Consider generating new ones.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

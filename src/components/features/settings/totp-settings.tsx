'use client'

import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  Shield,
  Key,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomSwitch } from '@/components/ui/custom-switch'
import { useAuth } from '@/components/providers/secure-auth-provider'

interface TOTPConfig {
  enabled: boolean
  loginMFAEnabled: boolean
  signingMFAEnabled: boolean
  defaultRequireTOTP: boolean
  backupCodesCount: number
  lastUsedAt?: string
  createdAt?: string
}

interface TOTPSetupData {
  qrCodeUrl: string
  manualEntryKey: string
  backupCodes: string[]
}

export function TOTPSettings() {
  const { user: _user } = useAuth()
  const [config, setConfig] = useState<TOTPConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupMode, setSetupMode] = useState(false)
  const [setupData, setSetupData] = useState<TOTPSetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [showManualKey, setShowManualKey] = useState(false)

  useEffect(() => {
    loadTOTPConfig()
  }, [])

  const loadTOTPConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/totp/config', {
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setConfig(result.data)
      } else {
        setError('Failed to load TOTP configuration')
      }
    } catch (error) {
      console.error('Error loading TOTP config:', error)
      setError('Failed to load TOTP configuration')
    } finally {
      setLoading(false)
    }
  }

  const startSetup = async () => {
    try {
      setError('')
      setSetupMode(true)

      const response = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setSetupData(result.data)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to setup TOTP')
        setSetupMode(false)
      }
    } catch (error) {
      console.error('Error starting TOTP setup:', error)
      setError('Failed to setup TOTP')
      setSetupMode(false)
    }
  }

  const verifyAndEnable = async (enableLogin: boolean, enableSigning: boolean) => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    try {
      setVerifying(true)
      setError('')

      const response = await fetch('/api/auth/totp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          token: verificationCode,
          enableLogin,
          enableSigning,
          context: 'setup'
        })
      })

      if (response.ok) {
        setSuccess('TOTP authentication enabled successfully!')
        setSetupMode(false)
        setSetupData(null)
        setVerificationCode('')
        await loadTOTPConfig()
      } else {
        const error = await response.json()
        setError(error.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      setError('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const updateSettings = async (settings: Partial<TOTPConfig>) => {
    try {
      setError('')

      const response = await fetch('/api/auth/totp/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          loginMFA: settings.loginMFAEnabled,
          signingMFA: settings.signingMFAEnabled,
          defaultRequireTOTP: settings.defaultRequireTOTP
        })
      })

      if (response.ok) {
        setSuccess('Settings updated successfully!')
        await loadTOTPConfig()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setError('Failed to update settings')
    }
  }

  const disableTOTP = async () => {
    if (!confirm('Are you sure you want to disable TOTP authentication? This will reduce your account security.')) {
      return
    }

    try {
      setError('')

      const response = await fetch('/api/auth/totp/config', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        setSuccess('TOTP authentication disabled')
        await loadTOTPConfig()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to disable TOTP')
      }
    } catch (error) {
      console.error('Error disabling TOTP:', error)
      setError('Failed to disable TOTP')
    }
  }

  const generateNewBackupCodes = async () => {
    try {
      setError('')

      const response = await fetch('/api/auth/totp/backup-codes', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        setSetupData({ ...setupData!, backupCodes: result.data.backupCodes })
        setShowBackupCodes(true)
        setSuccess('New backup codes generated!')
        await loadTOTPConfig()
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to generate backup codes')
      }
    } catch (error) {
      console.error('Error generating backup codes:', error)
      setError('Failed to generate backup codes')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading TOTP settings...</span>
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

      {/* TOTP Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${config?.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Shield className={`w-6 h-6 ${config?.enabled ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-gray-600">
                {config?.enabled
                  ? 'TOTP authentication is enabled for your account'
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {config?.enabled ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Enabled
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Disabled
              </span>
            )}
          </div>
        </div>

        {config?.enabled && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">Login Protection</div>
              <div className={`text-xs ${config.loginMFAEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {config.loginMFAEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">Signing Protection</div>
              <div className={`text-xs ${config.signingMFAEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {config.signingMFAEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-900">Backup Codes</div>
              <div className="text-xs text-gray-600">
                {config.backupCodesCount} remaining
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Setup or Management Interface */}
      {!config?.enabled && !setupMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Smartphone className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-blue-900">Enable Two-Factor Authentication</h3>
              <p className="text-blue-700 mt-1">
                Secure your account with TOTP authentication using <strong>Zoho OneAuth</strong> (recommended), Google Authenticator, Microsoft Authenticator, or any RFC 6238 compatible authenticator app.
              </p>
              <div className="mt-4">
                <Button onClick={startSetup} className="bg-blue-600 hover:bg-blue-700">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Setup TOTP Authentication
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Flow */}
      {setupMode && setupData && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Setup TOTP Authentication</h3>

          <div className="space-y-6">
            {/* Step 1: QR Code */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Step 1: Scan QR Code</h4>
              <p className="text-sm text-gray-600 mb-4">
                Open your authenticator app and scan this QR code:
              </p>
              <div className="flex justify-center">
                <img
                  src={setupData.qrCodeUrl}
                  alt="TOTP QR Code"
                  className="border border-gray-300 rounded-lg"
                />
              </div>

              {/* Manual Entry Option */}
              <div className="mt-4">
                <button
                  onClick={() => setShowManualKey(!showManualKey)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                >
                  <Key className="w-4 h-4 mr-1" />
                  Can't scan? Enter code manually
                </button>

                {showManualKey && (
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <p className="text-xs text-gray-600 mb-1">Manual entry key:</p>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {setupData.manualEntryKey}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Verification */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Step 2: Verify Setup</h4>
              <p className="text-sm text-gray-600 mb-4">
                Enter the 6-digit code from your authenticator app:
              </p>
              <div className="flex space-x-2 mb-4">
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Step 3: Choose Protection Level */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-2">Step 3: Choose Protection Level</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enable-login"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enable-login" className="text-sm text-gray-700">
                    <span className="font-medium">Protect Login</span> - Require TOTP when signing in
                  </label>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="enable-signing"
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="enable-signing" className="text-sm text-gray-700">
                    <span className="font-medium">Protect Signing</span> - Require TOTP when signing documents
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  const enableLogin = (document.getElementById('enable-login') as HTMLInputElement)?.checked || false
                  const enableSigning = (document.getElementById('enable-signing') as HTMLInputElement)?.checked || false
                  verifyAndEnable(enableLogin, enableSigning)
                }}
                disabled={verifying || verificationCode.length !== 6}
                className="bg-green-600 hover:bg-green-700"
              >
                {verifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Enable TOTP
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSetupMode(false)
                  setSetupData(null)
                  setVerificationCode('')
                  setError('')
                }}
              >
                Cancel
              </Button>
            </div>

            {/* Backup Codes */}
            {setupData.backupCodes && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-900">Backup Codes</h4>
                  <button
                    onClick={() => setShowBackupCodes(!showBackupCodes)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    {showBackupCodes ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {showBackupCodes ? 'Hide' : 'Show'} Codes
                  </button>
                </div>

                {showBackupCodes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <p className="text-sm text-yellow-800 mb-3">
                      ⚠️ Save these backup codes in a secure location. Each code can only be used once.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {setupData.backupCodes.map((code, index) => (
                        <code key={index} className="text-sm font-mono bg-white px-2 py-1 rounded border">
                          {code}
                        </code>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const codesText = setupData.backupCodes.join('\n')
                        const blob = new Blob([codesText], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = 'signtusk-backup-codes.txt'
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Codes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Management Interface */}
      {config?.enabled && !setupMode && (
        <div className="space-y-4">
          {/* Settings Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">TOTP Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Login Protection</label>
                  <p className="text-xs text-gray-600">Require TOTP when signing in to your account</p>
                </div>
                <CustomSwitch
                  checked={config.loginMFAEnabled}
                  onCheckedChange={(checked) => updateSettings({ ...config, loginMFAEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Signing Protection</label>
                  <p className="text-xs text-gray-600">Require TOTP when signing documents</p>
                </div>
                <CustomSwitch
                  checked={config.signingMFAEnabled}
                  onCheckedChange={(checked) => updateSettings({ ...config, signingMFAEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-900">Default TOTP for New Requests</label>
                  <p className="text-xs text-gray-600">Automatically require TOTP for new signing requests you create</p>
                </div>
                <CustomSwitch
                  checked={config.defaultRequireTOTP}
                  onCheckedChange={(checked) => updateSettings({ ...config, defaultRequireTOTP: checked })}
                />
              </div>
            </div>
          </div>

          {/* Backup Codes Management */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Backup Codes</h3>
                <p className="text-sm text-gray-600">
                  You have {config.backupCodesCount} backup codes remaining
                </p>
              </div>
              <Button
                variant="outline"
                onClick={generateNewBackupCodes}
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate New Codes
              </Button>
            </div>

            {config.backupCodesCount < 3 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ You're running low on backup codes. Consider generating new ones.
                </p>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="bg-white border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-900 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              Disabling TOTP will reduce your account security. Make sure you have alternative security measures in place.
            </p>
            <Button
              variant="outline"
              onClick={disableTOTP}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Disable TOTP Authentication
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

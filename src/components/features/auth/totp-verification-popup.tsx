'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  Smartphone,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Key,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface TOTPVerificationPopupProps {
  isOpen: boolean
  onClose: () => void
  onVerified: (usedBackupCode?: boolean) => void
  context: 'login' | 'signing'
  requestId?: string
  title?: string
  description?: string
  // For login context
  email?: string
  password?: string
}

export function TOTPVerificationPopup({
  isOpen,
  onClose,
  onVerified,
  context,
  requestId,
  title,
  description,
  email,
  password
}: TOTPVerificationPopupProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [showBackupCode, setShowBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(30)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // TOTP timer countdown
  useEffect(() => {
    if (!isOpen) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 30 // Reset to 30 seconds
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Reset state when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setVerificationCode('')
      setBackupCode('')
      setError('')
      setShowBackupCode(false)
      setVerifying(false)
      setTimeRemaining(30)
    }
  }, [isOpen])

  const handleVerify = async () => {
    const code = showBackupCode ? backupCode : verificationCode

    if (!code || (showBackupCode ? code.length !== 8 : code.length !== 6)) {
      setError(showBackupCode ? 'Please enter a valid 8-character backup code' : 'Please enter a valid 6-digit code')
      return
    }

    try {
      setVerifying(true)
      setError('')

      let endpoint: string
      let body: any

      if (context === 'signing') {
        endpoint = '/api/signing/totp-verify'
        body = { requestId, token: code }
      } else {
        // For login, use the dedicated login-totp endpoint
        endpoint = '/api/auth/login-totp'
        body = { email, password, totpCode: code }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const result = await response.json()
        onVerified(result.usedBackupCode || showBackupCode)
      } else {
        const error = await response.json()
        setError(error.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying TOTP:', error)
      setError('Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !verifying) {
      handleVerify()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {title || 'Security Verification Required'}
              </h3>
              <p className="text-sm text-gray-600">
                {description || `Enter your TOTP code to ${context === 'signing' ? 'sign this document' : 'continue'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Verification Form */}
        <div className="space-y-4">
          {!showBackupCode ? (
            <>
              {/* TOTP Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Smartphone className="w-4 h-4 inline mr-1" />
                  Authentication Code
                </label>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyPress={handleKeyPress}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={6}
                  disabled={verifying}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    Enter the 6-digit code from your authenticator app
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeRemaining}s
                  </div>
                </div>
              </div>

              {/* Backup Code Option */}
              <div className="text-center">
                <button
                  onClick={() => setShowBackupCode(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center mx-auto"
                  disabled={verifying}
                >
                  <Key className="w-4 h-4 mr-1" />
                  Use backup code instead
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Backup Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Key className="w-4 h-4 inline mr-1" />
                  Backup Code
                </label>
                <Input
                  type="text"
                  placeholder="XXXXXXXX"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  onKeyPress={handleKeyPress}
                  className="text-center text-lg font-mono tracking-wider"
                  maxLength={8}
                  disabled={verifying}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter one of your 8-character backup codes
                </p>
              </div>

              {/* Back to TOTP Option */}
              <div className="text-center">
                <button
                  onClick={() => setShowBackupCode(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center mx-auto"
                  disabled={verifying}
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Use authenticator app instead
                </button>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleVerify}
              disabled={verifying || (!showBackupCode ? verificationCode.length !== 6 : backupCode.length !== 8)}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Verify & Continue
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={verifying}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 bg-gray-50 rounded border">
          <p className="text-xs text-gray-600">
            🔒 This verification ensures that only you can {context === 'signing' ? 'sign documents' : 'access your account'}.
            Your code is encrypted and never stored.
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { X, Mail, CheckCircle, AlertCircle } from 'lucide-react'

interface ResendVerificationPopupProps {
  isOpen: boolean
  onClose: () => void
  email: string
}

export function ResendVerificationPopup({ isOpen, onClose, email }: ResendVerificationPopupProps) {
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (!isOpen) return null

  const handleResend = async () => {
    setIsResending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Verification email sent! Please check your inbox and spam folder.'
        })
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to send verification email'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Network error. Please try again.'
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Email Verification Required
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-center mb-6">
          Your email address <span className="font-semibold text-gray-900">{email}</span> needs to be verified before you can log in.
        </p>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-semibold mb-2">
            Didn't receive the email?
          </p>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Check your spam/junk folder</li>
            <li>Make sure the email address is correct</li>
            <li>Wait a few minutes for the email to arrive</li>
            <li>Click the button below to resend</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={isResending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isResending ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Resend Verification Email
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Close
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center mt-4">
          Still having trouble? Contact support at{' '}
          <a href="mailto:support@signtusk.com" className="text-blue-600 hover:underline">
            support@signtusk.com
          </a>
        </p>
      </div>
    </div>
  )
}


'use client'

import { useState, useCallback } from 'react'
import { Users, Plus, X, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Signer {
  id: string
  name: string
  email: string
  role: string
}

interface SignatureSelectionStepProps {
  data?: {
    signatureType?: 'single' | 'multi'
    signers?: Signer[]
  }
  onDataChange?: (data: any) => void
  onNext?: () => void
  canProceed?: boolean
}

export function SignatureSelectionStep({
  data = {},
  onDataChange,
  onNext,
  canProceed
}: SignatureSelectionStepProps) {
  const [newSigner, setNewSigner] = useState({ name: '', email: '', role: '' })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const { signers = [] } = data

  // Note: signatureType and handleSignatureTypeChange are currently unused but may be needed for future functionality

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateSigner = (signer: { name: string; email: string; role: string }): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    if (!signer.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!signer.email.trim()) {
      errors.email = 'Email is required'
    } else if (!validateEmail(signer.email)) {
      errors.email = 'Please enter a valid email address'
    } else if (signers.some(s => s.email === signer.email)) {
      errors.email = 'This email is already added'
    }

    if (!signer.role.trim()) {
      errors.role = 'Role is required'
    }

    return errors
  }

  const handleAddSigner = useCallback(() => {
    const validationErrors = validateSigner(newSigner)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length === 0) {
      const signer: Signer = {
        id: `signer-${Date.now()}`,
        name: newSigner.name.trim(),
        email: newSigner.email.trim(),
        role: newSigner.role.trim()
      }

      onDataChange?.({
        ...data,
        signers: [...signers, signer]
      })

      setNewSigner({ name: '', email: '', role: '' })
      setErrors({})
    }
  }, [newSigner, signers, data, onDataChange])

  const handleRemoveSigner = useCallback((signerId: string) => {
    onDataChange?.({
      ...data,
      signers: signers.filter(s => s.id !== signerId)
    })
  }, [signers, data, onDataChange])

  const handleInputChange = useCallback((field: string, value: string) => {
    setNewSigner(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }, [errors])

  // Always allow proceeding since signature type will be determined automatically
  const isFormValid = true

  return (
    <div className="space-y-6">
      {/* Information Section */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configure Signers</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-900">Automatic Signature Type Detection</h4>
              <p className="text-sm text-blue-800 mt-1">
                The signature type (single or multi-signature) will be automatically determined based on the number of signature fields you add in the PDF designer.
                You can optionally add signers here, or they will be generated automatically from your signature fields.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Signer Configuration (Optional) */}
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">Add Signers (Optional)</h4>
        <p className="text-sm text-gray-600 mb-4">
          You can pre-configure signers here, or they will be automatically generated based on the signature fields you add in the designer.
        </p>
        <div className="space-y-6">
          {/* Add Signer Form */}
          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Add Signers</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={newSigner.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  className={errors.name ? 'border-red-300' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={newSigner.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                  className={errors.email ? 'border-red-300' : ''}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role/Title
                </label>
                <Input
                  type="text"
                  value={newSigner.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  placeholder="e.g., Manager, Client"
                  className={errors.role ? 'border-red-300' : ''}
                />
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={handleAddSigner} className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Add Signer
              </Button>
            </div>
          </div>

          {/* Signers List */}
          {signers.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Signers ({signers.length})
              </h4>

              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{signer.name}</p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="mr-1 h-3 w-3" />
                          {signer.email}
                          <span className="mx-2">•</span>
                          {signer.role}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSigner(signer.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">Next Steps:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Proceed to the PDF designer to add signature fields</li>
          <li>• The document type (single/multi-signature) will be automatically determined</li>
          <li>• Add one signature field for single signature documents</li>
          <li>• Add multiple signature fields for multi-signature documents</li>
          {signers.length > 0 && (
            <li>• Your pre-configured signers will be assigned to signature fields</li>
          )}
        </ul>
      </div>

      {/* Next Button */}
      {canProceed && isFormValid && (
        <div className="flex justify-end">
          <Button onClick={onNext} className="flex items-center">
            Continue to Schema Setup
          </Button>
        </div>
      )}
    </div>
  )
}

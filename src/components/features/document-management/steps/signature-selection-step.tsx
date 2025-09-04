'use client'

import { useState, useCallback } from 'react'
import { User, Users, Plus, X, Mail, CheckCircle } from 'lucide-react'
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

  const { signatureType = 'single', signers = [] } = data

  const handleSignatureTypeChange = useCallback((type: 'single' | 'multi') => {
    onDataChange?.({
      ...data,
      signatureType: type,
      signers: type === 'single' ? [] : signers
    })
  }, [data, signers, onDataChange])

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

  const isFormValid = signatureType === 'single' || (signatureType === 'multi' && signers.length > 0)

  return (
    <div className="space-y-6">
      {/* Signature Type Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Signature Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Single Signature */}
          <div
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              signatureType === 'single'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSignatureTypeChange('single')}
          >
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h4 className="text-lg font-medium text-gray-900">Single Signature</h4>
                <p className="text-sm text-gray-500">Only you will sign this document</p>
              </div>
            </div>
            {signatureType === 'single' && (
              <CheckCircle className="absolute top-4 right-4 h-6 w-6 text-blue-600" />
            )}
          </div>

          {/* Multi Signature */}
          <div
            className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
              signatureType === 'multi'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSignatureTypeChange('multi')}
          >
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h4 className="text-lg font-medium text-gray-900">Multi Signature</h4>
                <p className="text-sm text-gray-500">Multiple people will sign this document</p>
              </div>
            </div>
            {signatureType === 'multi' && (
              <CheckCircle className="absolute top-4 right-4 h-6 w-6 text-blue-600" />
            )}
          </div>
        </div>
      </div>

      {/* Multi Signature Configuration */}
      {signatureType === 'multi' && (
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
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {signatureType === 'single' ? (
            <>
              <li>• You have selected single signature mode</li>
              <li>• Only you will be able to sign this document</li>
              <li>• Proceed to the next step to configure signature fields</li>
            </>
          ) : (
            <>
              <li>• Add all people who need to sign this document</li>
              <li>• Each signer will receive an email invitation</li>
              <li>• Signers will sign in the order they are listed</li>
              <li>• You can reorder signers by removing and re-adding them</li>
            </>
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

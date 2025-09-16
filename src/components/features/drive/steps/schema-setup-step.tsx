'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw, Eye, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SchemaSetupStepProps {
  data?: {
    file?: File
    signatureType?: 'single' | 'multi'
    signers?: Array<{ id: string; name: string; email: string; role: string }>
    schema?: any[]
    pdfTemplate?: any
  }
  onDataChange?: (data: any) => void
  onNext?: () => void
  canProceed?: boolean
}

export function SchemaSetupStep({
  data = {},
  onDataChange,
  onNext,
  canProceed
}: SchemaSetupStepProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const { file, signatureType, signers = [], schema = [] } = data

  // Add field to schema
  const addField = useCallback((type: string) => {
    const newField = {
      id: `field-${Date.now()}`,
      type: type,
      name: `${type}_${schema.length + 1}`,
      x: 100,
      y: 100,
      width: 150,
      height: 30
    }

    const updatedSchema = [...schema, newField]
    onDataChange?.({
      ...data,
      schema: updatedSchema,
      pdfTemplate: {
        basePdf: 'mock-base64-data',
        schemas: [updatedSchema]
      }
    })
    setHasChanges(true)
  }, [schema, data, onDataChange])

  // Initialize Schema Editor
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleSaveSchema = useCallback(() => {
    setHasChanges(false)
  }, [])

  const handleResetSchema = useCallback(() => {
    onDataChange?.({
      ...data,
      schema: [],
      pdfTemplate: {
        basePdf: 'mock-base64-data',
        schemas: [[]]
      }
    })
    setHasChanges(false)
  }, [data, onDataChange])

  const getFieldSuggestions = () => {
    const suggestions = []

    if (signatureType === 'single') {
      suggestions.push(
        { type: 'signature', label: 'Your Signature' },
        { type: 'text', label: 'Your Name' },
        { type: 'dateTime', label: 'Date Signed' }
      )
    } else {
      signers.forEach((signer) => {
        suggestions.push(
          { type: 'signature', label: `${signer.name} Signature` },
          { type: 'text', label: `${signer.name} Name` },
          { type: 'dateTime', label: `${signer.name} Date` }
        )
      })
    }

    return suggestions
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PDF editor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Settings className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-900 font-medium">Error loading PDF editor</p>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Schema Setup Instructions:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click the buttons below to add signature fields, text fields, and date fields</li>
          <li>• Fields will be positioned automatically on the document</li>
          <li>• You can add multiple fields of each type</li>
          <li>• Save your changes before proceeding to the next step</li>
        </ul>
      </div>

      {/* Field Suggestions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Suggested Fields:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {getFieldSuggestions().map((suggestion, index) => (
            <div
              key={index}
              className="flex items-center p-2 bg-white border border-gray-200 rounded text-sm"
            >
              <Plus className="h-3 w-3 text-gray-400 mr-2" />
              <span className="text-gray-700">{suggestion.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleSaveSchema}
            disabled={!hasChanges}
            className="flex items-center"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Schema
          </Button>

          <Button
            variant="outline"
            onClick={handleResetSchema}
            className="flex items-center text-red-600 hover:text-red-700"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="text-sm text-gray-500">
          {hasChanges && (
            <span className="text-orange-600">• Unsaved changes</span>
          )}
        </div>
      </div>

      {/* PDF Editor Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700">Document Schema Editor</h4>
        </div>

        <div className="p-6">
          <div className="bg-white border border-gray-300 rounded-lg p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Schema Editor (Development Mode)</h3>
              <p className="text-gray-600">File: {file?.name || 'document.pdf'}</p>
            </div>

            <div className="flex justify-center space-x-4 mb-6">
              <Button
                onClick={() => addField('signature')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Signature Field
              </Button>
              <Button
                onClick={() => addField('text')}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Text Field
              </Button>
              <Button
                onClick={() => addField('date')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Add Date Field
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h4>
              <p className="text-gray-500 mb-4">Click the buttons above to add fields to your document</p>

              {schema.length > 0 && (
                <div className="mt-6">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Configured Fields:</h5>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {schema.map((field: any, index: number) => (
                      <span
                        key={field.id}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {field.type?.charAt(0).toUpperCase() + field.type?.slice(1)} Field {index + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schema Summary */}
      {schema.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Schema Summary:</h4>
          <p className="text-sm text-green-800">
            {schema.length} field{schema.length !== 1 ? 's' : ''} configured
          </p>
        </div>
      )}

      {/* Next Button */}
      {canProceed && schema.length > 0 && !hasChanges && (
        <div className="flex justify-end">
          <Button onClick={onNext} className="flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            Continue to Preview
          </Button>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Eye, Save, Download, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PreviewSaveStepProps {
  data?: {
    file?: File
    fileName?: string
    signatureType?: 'single' | 'multi'
    signers?: Array<{ id: string; name: string; email: string; role: string }>
    schema?: any[]
    pdfTemplate?: any
  }
  onDataChange?: (data: any) => void
  onComplete?: () => void
  canProceed?: boolean
}

export function PreviewSaveStep({
  data = {},
  onDataChange,
  onComplete,
  canProceed
}: PreviewSaveStepProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewGenerated, setPreviewGenerated] = useState(false)
  const [viewer, setViewer] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { file, fileName, signatureType, signers = [], schema = [], pdfTemplate } = data

  // Generate dummy data for preview
  const generateDummyData = useCallback(() => {
    const dummyData: { [key: string]: any } = {}

    if (signatureType === 'single') {
      dummyData['signature_1'] = 'John Doe'
      dummyData['name_1'] = 'John Doe'
      dummyData['date_1'] = new Date().toLocaleDateString()
    } else {
      signers.forEach((signer, index) => {
        dummyData[`signature_${index + 1}`] = signer.name
        dummyData[`name_${index + 1}`] = signer.name
        dummyData[`date_${index + 1}`] = new Date().toLocaleDateString()
        dummyData[`role_${index + 1}`] = signer.role
      })
    }

    dummyData['company'] = 'Sample Company Inc.'
    dummyData['address'] = '123 Business Street, City, State 12345'
    dummyData['phone'] = '(555) 123-4567'
    dummyData['email'] = 'contact@example.com'

    return dummyData
  }, [signatureType, signers])

  // Initialize preview
  useEffect(() => {
    console.log('Preview step - starting initialization')

    setIsLoading(true)
    setError(null)

    const initializePreview = () => {
      console.log('Development mode: Creating mock preview')

      try {
        const dummyData = generateDummyData()
        const schemaFields = schema || []

        const fieldsHtml = schemaFields.map((field: any, index: number) => {
          const fieldValue = dummyData[field.name] || `[${field.type || 'field'}]`
          return `
            <div class="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-gray-700">${field.type || 'Field'} ${index + 1}:</span>
                <span class="text-sm text-blue-600">${fieldValue}</span>
              </div>
            </div>
          `
        }).join('')

        const previewHtml = `
          <div class="bg-white border border-gray-300 rounded-lg overflow-hidden">
            <div class="bg-gray-100 px-4 py-3 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Document Preview (Development Mode)</h3>
              <p class="text-sm text-gray-600">File: ${fileName || 'document.pdf'}</p>
            </div>
            <div class="p-6">
              <div class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
                <div class="text-gray-400 mb-4">
                  <svg class="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 class="text-xl font-medium text-gray-900 mb-2">PDF Document Preview</h3>
                <p class="text-gray-500 mb-6">This preview shows how your document will look with sample data</p>
                
                <div class="text-left max-w-md mx-auto">
                  <h4 class="text-sm font-medium text-gray-700 mb-3">Applied Fields:</h4>
                  ${fieldsHtml || '<p class="text-sm text-gray-500">No fields configured</p>'}
                </div>
              </div>
              
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center">
                  <svg class="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 class="text-sm font-medium text-blue-900">Development Preview</h4>
                    <p class="text-sm text-blue-800">In production, this would show the actual PDF with applied data</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `

        // Set container content when available
        const setContainerContent = () => {
          if (containerRef.current) {
            containerRef.current.innerHTML = previewHtml
            console.log('Preview content set successfully')
          } else {
            setTimeout(setContainerContent, 100)
          }
        }

        setContainerContent()

        // Create mock viewer
        const mockViewer = {
          getPdf: async () => new Uint8Array([37, 80, 68, 70]),
          destroy: () => console.log('Mock: Viewer destroyed')
        }

        setViewer(mockViewer)
        setPreviewGenerated(true)
        setIsLoading(false)
        console.log('Preview generation completed')
      } catch (err) {
        console.error('Error generating preview:', err)
        setError('Failed to generate preview')
        setIsLoading(false)
      }
    }

    // Start preview generation after a short delay
    setTimeout(initializePreview, 500)

    // Cleanup function
    return () => {
      if (viewer) {
        try {
          viewer.destroy?.()
        } catch (err) {
          console.error('Error destroying viewer:', err)
        }
      }
    }
  }, [])

  const handleSaveDocument = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const savedDocument = {
        ...data,
        status: 'completed',
        completedAt: new Date().toISOString(),
        previewGenerated: true
      }

      onDataChange?.(savedDocument)

      if (onComplete) {
        onComplete()
      }
    } catch (err) {
      console.error('Error saving document:', err)
      setError('Failed to save document. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }, [data, onDataChange, onComplete])

  const handleDownloadPreview = useCallback(async () => {
    if (!viewer) return

    try {
      const pdf = await viewer.getPdf()
      const blob = new Blob([pdf], { type: 'application/pdf' })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileName?.replace('.pdf', '') || 'document'}_preview.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading preview:', err)
      setError('Failed to download preview')
    }
  }, [viewer, fileName])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating preview with dummy data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-900 font-medium">Error generating preview</p>
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
      {/* Document Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Document Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">File:</span>
                <span className="ml-2 font-medium">{fileName}</span>
              </div>
              <div className="flex items-center">
                <Eye className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Type:</span>
                <span className="ml-2 font-medium capitalize">{signatureType} Signature</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">Fields:</span>
                <span className="ml-2 font-medium">{schema.length} configured</span>
              </div>
            </div>
          </div>

          {signatureType === 'multi' && signers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Signers ({signers.length})</h4>
              <div className="space-y-2">
                {signers.slice(0, 3).map((signer, index) => (
                  <div key={signer.id} className="text-sm">
                    <span className="font-medium">{signer.name}</span>
                    <span className="text-gray-500 ml-2">({signer.role})</span>
                  </div>
                ))}
                {signers.length > 3 && (
                  <div className="text-sm text-gray-500">
                    +{signers.length - 3} more signers
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Preview Information:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• This preview shows how the document will look with sample data</li>
          <li>• Actual signatures and data will be filled when the document is signed</li>
          <li>• You can download this preview for review before finalizing</li>
          <li>• Once saved, the document will be ready for the signing process</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleDownloadPreview}
          disabled={!previewGenerated}
          className="flex items-center"
        >
          <Download className="mr-2 h-4 w-4" />
          Download Preview
        </Button>

        <Button
          onClick={handleSaveDocument}
          disabled={!canProceed || isSaving}
          className="flex items-center bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save & Complete
            </>
          )}
        </Button>
      </div>

      {/* PDF Preview Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-700">Document Preview with Sample Data</h4>
        </div>
        <div
          ref={containerRef}
          className="w-full bg-white"
          style={{ minHeight: '600px' }}
        />
      </div>

      {/* Completion Status */}
      {previewGenerated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Preview Generated Successfully</h4>
              <p className="text-sm text-green-800 mt-1">
                Your document is ready to be saved and used for signing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Designer, generate, text, image, barcodes, dateTime } from '@codeminds-digital/pdfme-complete'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Save,
  Download,
  FileText,
  X,
  Check,
  ArrowLeft
} from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { supabase } from '@/lib/supabase'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadingOverlay } from '@/components/ui/loading'

interface DocumentEditorProps {
  fileUrl: string
  fileName: string
  onClose?: () => void
}

interface PDFTemplate {
  basePdf: string
  schemas: unknown[][]
}

interface DesignerInstance {
  destroy?: () => void
  updateInputs?: (inputs: Record<string, unknown>) => void
  setInputs?: (inputs: Record<string, unknown>) => void
}

const convertToBase64 = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const blob = await response.blob();

    if (blob.type === 'text/plain') {
      const text = await blob.text();

      if (text.startsWith('data:')) {
        return text;
      }

      const imageHeaders = ['/9j/', 'iVBORw0KGgo', 'R0lGOD', 'UklGR'];
      const startsWithImageHeader = imageHeaders.some(header => text.startsWith(header));

      if (startsWithImageHeader) {
        if (text.startsWith('/9j/')) {
          return `data:image/jpeg;base64,${text}`;
        } else if (text.startsWith('iVBORw0KGgo')) {
          return `data:image/png;base64,${text}`;
        } else if (text.startsWith('R0lGOD')) {
          return `data:image/gif;base64,${text}`;
        } else if (text.startsWith('UklGR')) {
          return `data:image/webp;base64,${text}`;
        } else {
          return `data:image/png;base64,${text}`;
        }
      }
    }

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    throw error;
  }
};



function DocumentEditor({
  fileUrl,
  fileName,
  onClose
}: DocumentEditorProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfTemplate, setPdfTemplate] = useState<PDFTemplate | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(true)
  const [userInputName, setUserInputName] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const designerRef = useRef<DesignerInstance | null>(null)

  useEffect(() => {
    const getSignature = async () => {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('signatures')
          .select('signature_data')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single()

        if (error) {
          console.warn('No default signature found')
          return
        }

        if (data?.signature_data) {
          setSignatureImage(data.signature_data)
        }
      } catch (error) {
        console.error('Failed to fetch signature:', error)
      }
    }

    getSignature()
  }, [user?.id])

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true)
        const base64String = await convertToBase64(fileUrl)

        // Create template with basic schema for signature and text
        const basicSchema = [
          {
            name: 'signature',
            type: 'image',
            position: { x: 50, y: 50 },
            width: 40,
            height: 20,
          },
          {
            name: 'name',
            type: 'text',
            position: { x: 50, y: 80 },
            width: 40,
            height: 8,
          },
          {
            name: 'date',
            type: 'dateTime',
            position: { x: 50, y: 110 },
            width: 45,
            height: 10,
            format: 'yyyy/MM/dd',
          }
        ]

        const template = {
          basePdf: base64String,
          schemas: [basicSchema],
        }
        setPdfTemplate(template)
        setError(null)
      } catch (error) {
        console.error('PDF load error:', error)
        setError('Failed to load PDF document')
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl) {
      fetchPdf()
    }
  }, [fileUrl])

  const initializeDesigner = useCallback(async () => {
    if (!containerRef.current || !pdfTemplate) return

    try {
      if (designerRef.current) {
        designerRef.current.destroy?.()
        containerRef.current.innerHTML = ''
      }

      const inputs = {
        signature: signatureImage || '',
        name: userInputName || '',
        date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      }

      const designerConfig = {
        domContainer: containerRef.current,
        template: pdfTemplate,
        plugins: { text, image, dateTime, qrcode: barcodes.qrcode },
        options: {
          zoom: 1.5,
          initialZoom: 1.5,
          readOnly: false,
          showToolbar: true
        },
      }

      // Create designer with type assertion for external library
      const designer = new Designer(designerConfig as never) as DesignerInstance

      // Update inputs after a delay to ensure designer is ready
      setTimeout(() => {
        try {
          if (designer.updateInputs) {
            designer.updateInputs(inputs)
          } else if (designer.setInputs) {
            designer.setInputs(inputs)
          }
        } catch (updateError) {
          console.warn('Error updating designer inputs:', updateError)
        }
      }, 1000)

      designerRef.current = designer
    } catch (error) {
      console.error('Failed to initialize designer:', error)
      setError('Failed to initialize document editor')
    }
  }, [pdfTemplate, signatureImage, userInputName])

  useEffect(() => {
    if (!showConfirmDialog && pdfTemplate && !loading) {
      const timer = setTimeout(initializeDesigner, 500)
      return () => clearTimeout(timer)
    }
  }, [showConfirmDialog, pdfTemplate, loading, initializeDesigner])

  const generateSignedPdf = async () => {
    try {
      setIsProcessing(true)
      if (!pdfTemplate) throw new Error('Template not ready')

      const inputs = {
        signature: signatureImage || '',
        name: userInputName || '[Name]',
        date: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
      }

      const pdf = await generate({
        template: pdfTemplate as never, // Type assertion for external library
        inputs: [inputs],
        plugins: { text, image, dateTime, qrcode: barcodes.qrcode },
      })

      return pdf
    } catch (error) {
      setError('Error generating signed PDF: ' + (error as Error).message)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!userInputName.trim()) {
      setError('Please enter your name before saving')
      return
    }

    try {
      setIsProcessing(true)
      const signedPdfBytes = await generateSignedPdf()
      const fileNameSigned = `signed_${Date.now()}.pdf`

      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(`public/${fileNameSigned}`, signedPdfBytes, {
          contentType: 'application/pdf'
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(`public/${fileNameSigned}`)

      // Update document with signed version
      await supabase
        .from('documents')
        .update({
          file_url: publicUrl,
          updated_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('file_url', fileUrl)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      setError('Failed to save document: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (!userInputName.trim()) {
      setError('Please enter your name before downloading')
      return
    }

    try {
      setIsProcessing(true)
      const signedPdfBytes = await generateSignedPdf()
      const blob = new Blob([signedPdfBytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `signed_${fileName}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setError('Failed to download document: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmDialog = () => {
    if (!userInputName.trim()) {
      setError('Please enter your name')
      return
    }
    setShowConfirmDialog(false)
  }

  if (showConfirmDialog) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              You are about to edit and sign this document. Please enter your name to continue.
            </p>

            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                type="text"
                value={userInputName}
                onChange={(e) => setUserInputName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDialog}
                disabled={!userInputName.trim()}
                className="flex-1"
              >
                <Check className="w-4 h-4 mr-2" />
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <LoadingOverlay isLoading={isProcessing} message="Processing document...">
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b bg-white px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <h1 className="text-xl font-semibold">{fileName}</h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={isProcessing || !userInputName.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isProcessing ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={handleDownload}
                  disabled={isProcessing || !userInputName.trim()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading document...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-8">
                  <p className="text-red-600 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div
                ref={containerRef}
                className="w-full h-full"
              />
            )}
          </div>

          {/* Success Message */}
          {saveSuccess && (
            <div className="fixed top-4 right-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md z-50">
              <div className="flex items-center">
                <Check className="w-5 h-5 mr-2" />
                <span>Document saved successfully!</span>
              </div>
            </div>
          )}

        </div>
      </LoadingOverlay>
    </ErrorBoundary>
  )
}

export { DocumentEditor }
export default DocumentEditor

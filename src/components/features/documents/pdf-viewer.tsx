'use client'

import { useState, useRef, useEffect } from 'react'
import { text, image, barcodes, dateTime, Designer } from 'pdfme-complete'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2
} from 'lucide-react'

interface PDFTemplate {
  basePdf: string
  schemas: unknown[][]
}

interface DesignerConfig {
  domContainer: HTMLElement
  template: PDFTemplate
  plugins: Record<string, unknown>
  options: {
    zoom?: number
    initialZoom?: number
    readOnly?: boolean
    showToolbar?: boolean
  }
}

interface PDFViewerProps {
  fileUrl: string
  fileName: string
  onClose?: () => void
  showSignatureTools?: boolean
  onAddSignature?: (pageNumber: number, x: number, y: number) => void
}

const convertToBase64 = async (url: string): Promise<string> => {
  try {
    // Validate URL
    if (!url) {
      throw new Error('URL is required')
    }

    // Handle data URLs
    if (url.startsWith('data:')) {
      return url
    }

    // Fetch with proper error handling and timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/pdf,*/*',
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()

    // Validate content type
    if (blob.type && !blob.type.includes('pdf') && !blob.type.includes('application/octet-stream')) {
      console.warn(`Unexpected content type: ${blob.type}`)
    }

    // Convert to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        if (result) {
          resolve(result)
        } else {
          reject(new Error('Failed to convert file to base64'))
        }
      }
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please try again')
      }
      throw error
    }
    throw new Error('Unknown error occurred while loading document')
  }
}

export default function PDFViewer({
  fileUrl,
  fileName,
  onClose,
  showSignatureTools = false,
  onAddSignature
}: PDFViewerProps) {
  const [scale, setScale] = useState<number>(1.0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfTemplate, setPdfTemplate] = useState<PDFTemplate | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const designerRef = useRef<{ destroy?: () => void } | null>(null)

  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true)
        setError(null)

        const base64String = await convertToBase64(fileUrl)

        // Create basic template with proper typing
        const template: PDFTemplate = {
          basePdf: base64String,
          schemas: [[]], // Empty schema for viewing
        }
        setPdfTemplate(template)
      } catch (error) {
        console.error('PDF load error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load PDF document'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl) {
      fetchPdf()
    }
  }, [fileUrl])

  useEffect(() => {
    const initializeDesigner = async () => {
      if (!containerRef.current || !pdfTemplate) return

      try {
        if (designerRef.current) {
          designerRef.current.destroy?.()
          containerRef.current.innerHTML = ''
        }

        // Create designer with proper error handling
        const designerConfig: DesignerConfig = {
          domContainer: containerRef.current,
          template: pdfTemplate,
          plugins: { text, image, dateTime, qrcode: barcodes.qrcode },
          options: {
            zoom: scale,
            initialZoom: scale,
            readOnly: !showSignatureTools,
            showToolbar: showSignatureTools
          },
        }

        // Create designer with type assertion for external library compatibility
        // The pdfme-complete Designer expects specific schema types that may not match our PDFTemplate
        const designer = new Designer(designerConfig as never)
        designerRef.current = designer

        // Add signature event listener if needed
        if (showSignatureTools && onAddSignature) {
          // This would be implemented based on the Designer API
          console.log('Signature tools enabled for', fileName)
        }
      } catch (error) {
        console.error('Failed to initialize designer:', error)
        setError('Failed to initialize document viewer')
      }
    }

    if (pdfTemplate && !loading) {
      const timer = setTimeout(initializeDesigner, 500)
      return () => clearTimeout(timer)
    }
  }, [pdfTemplate, loading, scale, showSignatureTools, fileName, onAddSignature])

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3.0)
    setScale(newScale)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5)
    setScale(newScale)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <div
      className={`bg-white ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}
    >
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold truncate">
              {fileName}
            </CardTitle>
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {onClose && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          </div>

          {showSignatureTools && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                Use the toolbar to add signatures and other elements to the document
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading PDF...</span>
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
              style={{ minHeight: '500px' }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

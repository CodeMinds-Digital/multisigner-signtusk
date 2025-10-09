'use client'

import { useState, useRef, useEffect } from 'react'
import { text, image, barcodes, Designer } from '@codeminds-digital/pdfme-complete'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare
} from 'lucide-react'
import { SendAnalyticsService } from '@/lib/send-analytics-service'
import { AIDocumentAssistant } from './ai-document-assistant'

interface PDFTemplate {
  basePdf: string
  schemas: unknown[][]
}

interface SendDocumentViewerProps {
  fileUrl: string
  fileName: string
  linkId?: string
  documentId?: string
  viewerEmail?: string
  allowDownload?: boolean
  allowPrinting?: boolean
  watermarkText?: string
  onView?: () => void
  onDownload?: () => void
  onPrint?: () => void
}

// Convert file URL to base64
async function convertToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Error converting to base64:', error)
    throw error
  }
}

export default function SendDocumentViewer({
  fileUrl,
  fileName,
  linkId,
  documentId,
  viewerEmail,
  allowDownload = true,
  allowPrinting = true,
  watermarkText,
  onView,
  onDownload,
  onPrint
}: SendDocumentViewerProps) {
  const [scale, setScale] = useState<number>(1.0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfTemplate, setPdfTemplate] = useState<PDFTemplate | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const designerRef = useRef<{ destroy?: () => void } | null>(null)

  // Page tracking
  const [pageStartTime, setPageStartTime] = useState<number>(Date.now())
  const [scrollDepth, setScrollDepth] = useState<number>(0)
  const [sessionStartTime] = useState<number>(Date.now())

  // AI Assistant
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false)

  // Load PDF
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setLoading(true)
        setError(null)

        const base64String = await convertToBase64(fileUrl)

        const template: PDFTemplate = {
          basePdf: base64String,
          schemas: [[]], // Empty schema for viewing
        }
        setPdfTemplate(template)

        // Trigger view event
        if (onView) {
          onView()
        }

        // Setup exit tracking
        if (linkId && documentId) {
          SendAnalyticsService.setupExitTracking(linkId, documentId, viewerEmail)
        }
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
  }, [fileUrl, onView, linkId, documentId, viewerEmail])

  // Initialize PDF viewer
  useEffect(() => {
    const initializeDesigner = async () => {
      if (!containerRef.current || !pdfTemplate) return

      try {
        if (designerRef.current) {
          designerRef.current.destroy?.()
          containerRef.current.innerHTML = ''
        }

        const designer = new Designer({
          domContainer: containerRef.current,
          template: pdfTemplate,
          plugins: { text, image, qrcode: barcodes.qrcode },
          options: {
            zoom: scale,
            initialZoom: scale,
            readOnly: true,
            showToolbar: false
          },
        } as never)

        designerRef.current = designer
      } catch (error) {
        console.error('Failed to initialize viewer:', error)
        setError('Failed to initialize document viewer')
      }
    }

    if (pdfTemplate && !loading) {
      const timer = setTimeout(initializeDesigner, 500)
      return () => clearTimeout(timer)
    }

    return () => {
      if (designerRef.current) {
        designerRef.current.destroy?.()
      }
    }
  }, [pdfTemplate, scale, loading])

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleDownload = async () => {
    if (!allowDownload) return

    try {
      const response = await fetch(fileUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      // Track download
      if (linkId && documentId) {
        await SendAnalyticsService.trackDownload(linkId, documentId, viewerEmail)
      }

      if (onDownload) {
        onDownload()
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handlePrint = async () => {
    if (!allowPrinting) return

    window.print()

    // Track print
    if (linkId && documentId) {
      await SendAnalyticsService.trackPrint(linkId, documentId, viewerEmail)
    }

    if (onPrint) {
      onPrint()
    }
  }

  return (
    <div className={`bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      <Card className="h-full flex flex-col border-0 shadow-none">
        {/* Toolbar */}
        <div className="flex-shrink-0 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold truncate max-w-md">
                {fileName}
              </h2>
              {watermarkText && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {watermarkText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
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

              <div className="w-px h-6 bg-gray-300 mx-2" />

              {/* Download Button */}
              {allowDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}

              {/* Print Button */}
              {allowPrinting && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              )}

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>

              {/* AI Assistant Toggle */}
              <Button
                variant={showAIAssistant ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className="flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <CardContent className="flex-1 p-0 overflow-hidden relative">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-600">Loading document...</p>
              </div>
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
            <div className="w-full h-full overflow-auto bg-gray-100">
              <div
                ref={containerRef}
                className="w-full h-full"
                style={{ minHeight: '600px' }}
              />

              {/* Watermark Overlay */}
              {watermarkText && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className="text-gray-300 text-6xl font-bold opacity-10 transform rotate-[-45deg]"
                    style={{ userSelect: 'none' }}
                  >
                    {watermarkText}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Document Assistant */}
      <AIDocumentAssistant
        documentId={documentId || ''}
        documentTitle={fileName}
        linkId={linkId}
        isVisible={showAIAssistant}
        onToggle={() => setShowAIAssistant(false)}
      />
    </div>
  )
}


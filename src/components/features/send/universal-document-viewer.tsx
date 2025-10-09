'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ZoomIn,
  ZoomOut,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Eye,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react'
import { SendAnalyticsService } from '@/lib/send-analytics-service'
import { AIDocumentAssistant } from './ai-document-assistant'

interface UniversalDocumentViewerProps {
  fileUrl: string
  fileName: string
  fileType?: string
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

export default function UniversalDocumentViewer({
  fileUrl,
  fileName,
  fileType,
  linkId,
  documentId,
  viewerEmail,
  allowDownload = true,
  allowPrinting = true,
  watermarkText,
  onView,
  onDownload,
  onPrint
}: UniversalDocumentViewerProps) {
  const [scale, setScale] = useState<number>(1.0)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false)

  // Determine document type and how to display it
  const getDocumentType = (fileName: string, fileType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const mimeType = fileType?.toLowerCase()

    if (mimeType?.includes('pdf') || extension === 'pdf') {
      return 'pdf'
    }
    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image'
    }
    if (['doc', 'docx'].includes(extension || '') || mimeType?.includes('word')) {
      return 'document'
    }
    if (['xls', 'xlsx'].includes(extension || '') || mimeType?.includes('sheet')) {
      return 'spreadsheet'
    }
    if (['ppt', 'pptx'].includes(extension || '') || mimeType?.includes('presentation')) {
      return 'presentation'
    }
    if (['txt', 'md'].includes(extension || '') || mimeType?.includes('text')) {
      return 'text'
    }
    return 'unknown'
  }

  const documentType = getDocumentType(fileName, fileType)

  // Load document
  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true)
        setError(null)

        let url = fileUrl

        // Use proxy API if linkId is available (for public viewer)
        if (linkId) {
          console.log('🔗 Using proxy API for linkId:', linkId)
          const response = await fetch(`/api/send/documents/content/${linkId}`)

          if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          if (!data.success) {
            throw new Error(data.error || 'Failed to load document')
          }

          // Use the URL provided by the API (either public URL for PDFs or base64 data URL for others)
          if (data.data?.url) {
            url = data.data.url
          } else if (data.data?.base64) {
            url = data.data.base64
          }

          console.log('✅ Document loaded via proxy API, URL type:', url.startsWith('data:') ? 'base64' : 'public')
        }

        setDocumentUrl(url)

        // Trigger view event
        if (onView) {
          onView()
        }

        // Setup exit tracking
        if (linkId && documentId) {
          SendAnalyticsService.setupExitTracking(linkId, documentId, viewerEmail)
        }
      } catch (error) {
        console.error('Document load error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load document'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl || linkId) {
      loadDocument()
    }
  }, [fileUrl, linkId, documentType, onView, documentId, viewerEmail])

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0))
  }

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const handleDownload = async () => {
    if (!allowDownload || !documentUrl) return

    try {
      // Create download link
      const link = document.createElement('a')
      link.href = documentUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Track download
      if (linkId && documentId) {
        await SendAnalyticsService.trackDownload(linkId, documentId, viewerEmail)
      }

      if (onDownload) {
        onDownload()
      }
    } catch (error) {
      console.error('Download failed:', error)
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

  const renderDocumentContent = () => {
    if (!documentUrl) return null

    switch (documentType) {
      case 'pdf':
        return (
          <iframe
            src={documentUrl}
            className="w-full h-full border-0"
            title={`PDF Preview - ${fileName}`}
            style={{
              minHeight: '600px',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`
            }}
          />
        )

      case 'image':
        return (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={documentUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'center'
              }}
            />
          </div>
        )

      case 'text':
        return (
          <div className="p-6 h-full overflow-auto">
            <pre
              className="whitespace-pre-wrap font-mono text-sm"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
              }}
            >
              {/* Text content would be loaded here */}
              Loading text content...
            </pre>
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {fileName}
              </h3>
              <p className="text-gray-600 mb-4">
                Preview not available for this file type
              </p>
              {allowDownload && (
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download to View
                </Button>
              )}
            </div>
          </div>
        )
    }
  }

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-600" />
      default:
        return <File className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className={`bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      <Card className="h-full flex flex-col border-0 shadow-none">
        {/* Toolbar */}
        <div className="flex-shrink-0 bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {getDocumentIcon()}
                <h2 className="text-lg font-semibold truncate max-w-md">
                  {fileName}
                </h2>
              </div>
              {watermarkText && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {watermarkText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              {(documentType === 'pdf' || documentType === 'image') && (
                <>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </>
              )}

              {/* Action Buttons */}
              {allowDownload && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                </Button>
              )}

              {allowPrinting && (
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4" />
                </Button>
              )}

              <Button variant="outline" size="sm" onClick={handleFullscreen}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <Button variant="outline" size="sm" onClick={() => setShowAIAssistant(true)}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Document Content */}
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
              {renderDocumentContent()}

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

      {/* Branding Footer */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-sm flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">ST</span>
            </div>
            <span>Powered by <span className="font-semibold text-gray-800">SignTusk</span></span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">Document Sharing Platform</span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PDFPreviewProps {
  pdfUrl?: string
  fileName?: string
}

export function PDFPreview({ pdfUrl = "/sample.pdf", fileName = "Agreement Document.pdf" }: PDFPreviewProps) {
  const [zoom, setZoom] = useState(100)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const handleZoomIn = () => {
    if (zoom < 200) {
      setZoom(prev => prev + 10)
    }
  }

  const handleZoomOut = () => {
    if (zoom > 50) {
      setZoom(prev => prev - 10)
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = fileName
    link.click()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartY(e.pageY - scrollTop)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const y = e.pageY - startY
    const container = document.getElementById('pdf-container')
    if (container) {
      container.scrollTop = y
      setScrollTop(y)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Card className="mx-auto max-w-5xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Document Preview</CardTitle>
              <p className="text-sm text-gray-500">{fileName}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-sm text-gray-500">
              Page 1 of 1
            </div>
          </div>

          <div 
            id="pdf-container"
            className="bg-gray-100 p-8 h-[600px] overflow-auto scroll-smooth rounded-lg"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="bg-white shadow-lg rounded-sm p-8 relative mx-auto transition-all duration-200"
              style={{
                width: `${zoom}%`,
                maxWidth: '2000px',
                minWidth: '320px'
              }}
            >
              <iframe 
                src={pdfUrl} 
                className="w-full h-[800px] max-w-5xl border-0" 
                title="PDF Preview"
              />
              <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2">
                <div className="w-24 h-8 border-b border-gray-300"></div>
                <div className="w-16 h-8 border-b border-gray-300"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

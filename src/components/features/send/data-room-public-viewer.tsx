'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Folder,
  FileText,
  Download,
  Eye,
  ArrowLeft,
  File,
  Image,
  FileSpreadsheet,
  FileVideo,
  Music,
  Archive
} from 'lucide-react'
import UniversalDocumentViewer from './universal-document-viewer'

interface Document {
  id: string
  title: string
  file_url: string
  file_name: string
  file_type: string
  file_size: number
  thumbnail_url?: string
  folder_path: string
  sort_order: number
}

interface DataRoom {
  id: string
  name: string
  description: string
  folderStructure: any
}

interface Link {
  id: string
  slug?: string
  name: string
  allowDownload: boolean
  allowPrinting: boolean
  enableWatermark: boolean
  watermarkText: string | null
  viewCount: number
  expiresAt: string | null
  screenshotProtection?: boolean
}

interface DataRoomPublicViewerProps {
  dataRoom: DataRoom
  documents: Document[]
  link: Link
  linkId: string
  viewerEmail?: string
  onView?: () => void
  onDownload?: () => void
  onPrint?: () => void
}

export function DataRoomPublicViewer({
  dataRoom,
  documents,
  link,
  linkId,
  viewerEmail,
  onView,
  onDownload,
  onPrint
}: DataRoomPublicViewerProps) {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [currentFolder, setCurrentFolder] = useState('/')

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-blue-500" />
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />
    if (fileType.includes('video')) return <FileVideo className="h-5 w-5 text-purple-500" />
    if (fileType.includes('audio')) return <Music className="h-5 w-5 text-orange-500" />
    if (fileType.includes('zip') || fileType.includes('archive')) return <Archive className="h-5 w-5 text-gray-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get documents in current folder
  const documentsInFolder = documents.filter(doc => doc.folder_path === currentFolder)

  // Get unique folders
  const folders = [...new Set(documents.map(doc => doc.folder_path))]
    .filter(path => path !== currentFolder && path.startsWith(currentFolder))
    .map(path => {
      const parts = path.replace(currentFolder, '').split('/').filter(Boolean)
      return parts[0]
    })
    .filter((folder, index, arr) => arr.indexOf(folder) === index)

  // Handle document selection
  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
    if (onView) onView()
  }

  // Handle back to data room
  const handleBackToDataRoom = () => {
    setSelectedDocument(null)
  }

  // Handle folder navigation
  const handleFolderClick = (folderName: string) => {
    const newPath = currentFolder === '/' ? `/${folderName}` : `${currentFolder}/${folderName}`
    setCurrentFolder(newPath)
  }

  // Handle back to parent folder
  const handleBackToParent = () => {
    if (currentFolder === '/') return
    const parts = currentFolder.split('/').filter(Boolean)
    parts.pop()
    setCurrentFolder(parts.length === 0 ? '/' : '/' + parts.join('/'))
  }

  // If a document is selected, show the document viewer
  if (selectedDocument) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToDataRoom}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Data Room
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{selectedDocument.title}</h1>
                <p className="text-sm text-gray-600">{dataRoom.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Eye className="h-3 w-3 mr-1" />
                {link.viewCount} views
              </Badge>
            </div>
          </div>
        </div>

        <UniversalDocumentViewer
          fileUrl={selectedDocument.file_url}
          fileName={selectedDocument.file_name}
          fileType={selectedDocument.file_type}
          linkId={linkId}
          documentId={selectedDocument.id}
          viewerEmail={viewerEmail}
          allowDownload={link.allowDownload}
          allowPrinting={link.allowPrinting}
          watermarkText={link.enableWatermark ? link.watermarkText || undefined : undefined}
          isDataRoom={true}
          onView={onView}
          onDownload={onDownload}
          onPrint={onPrint}
        />
      </div>
    )
  }

  // Show data room folder view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dataRoom.name}</h1>
              {dataRoom.description && (
                <p className="mt-2 text-lg text-gray-600">{dataRoom.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                <Eye className="h-3 w-3 mr-1" />
                {link.viewCount} views
              </Badge>
              <Badge variant="outline">
                {documents.length} documents
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        {currentFolder !== '/' && (
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToParent}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {currentFolder.split('/').slice(-2, -1)[0] || 'Root'}
            </Button>
          </div>
        )}

        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Folders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {folders.map((folder) => (
                <Card
                  key={folder}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleFolderClick(folder)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Folder className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium text-gray-900">{folder}</h3>
                        <p className="text-sm text-gray-500">
                          {documents.filter(doc => doc.folder_path.startsWith(
                            currentFolder === '/' ? `/${folder}` : `${currentFolder}/${folder}`
                          )).length} items
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {documentsInFolder.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documentsInFolder.map((document) => (
                <Card
                  key={document.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleDocumentSelect(document)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getFileIcon(document.file_type)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{document.title}</h3>
                        <p className="text-sm text-gray-500 truncate">{document.file_name}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatFileSize(document.file_size)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {folders.length === 0 && documentsInFolder.length === 0 && (
          <div className="text-center py-12">
            <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
            <p className="text-gray-500">This folder is empty.</p>
          </div>
        )}
      </div>

      {/* SignTusk Branding */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-sm flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">ST</span>
            </div>
            <span>Powered by <span className="font-semibold text-gray-800">SignTusk</span></span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">Data Room Platform</span>
          </div>
        </div>
      </div>
    </div>
  )
}

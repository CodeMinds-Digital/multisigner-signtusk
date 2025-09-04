'use client'

import { useState, useRef } from 'react'
import { X, ChevronDown, File, User, Upload } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { uploadDocument, type Document as DocumentType } from '@/lib/document-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UploadDocumentProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: (document: DocumentType) => void
}

export function UploadDocument({ isOpen, onClose, onSuccess }: UploadDocumentProps) {
    const [selectedDocument, setSelectedDocument] = useState<File | null>(null)
    const [documentType, setDocumentType] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { user } = useAuth()

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            // Validate file type
            if (file.type !== 'application/pdf') {
                setError('Please select a PDF file')
                return
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB')
                return
            }

            setSelectedDocument(file)
            setError('')
        }
    }

    const handleUpload = async () => {
        if (!selectedDocument || !documentType || !user) {
            setError('Please select a document and choose document type')
            return
        }

        setIsUploading(true)
        setError('')

        try {
            const result = await uploadDocument(selectedDocument, documentType, user.id)

            if (result.success && result.document) {
                onSuccess?.(result.document)
                onClose()
                // Reset form
                setSelectedDocument(null)
                setDocumentType('')
            } else {
                setError(result.error || 'Upload failed')
            }
        } catch (error) {
            setError('An unexpected error occurred')
            console.error('Upload error:', error)
        } finally {
            setIsUploading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>Request Signature</CardTitle>
                        <CardDescription>Upload a document to request signatures</CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={isUploading}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Document Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Select Document
                        </label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf"
                            disabled={isUploading}
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full justify-between h-auto p-4"
                        >
                            <div className="flex items-center space-x-2">
                                <File className="w-5 h-5 text-gray-400" />
                                <span className={selectedDocument ? "text-gray-900" : "text-gray-500"}>
                                    {selectedDocument ? selectedDocument.name : "Choose a PDF document"}
                                </span>
                            </div>
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        </Button>
                        {selectedDocument && (
                            <p className="text-sm text-gray-500">
                                File size: {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        )}
                    </div>

                    {/* Document Type Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Document Type
                        </label>
                        <div className="relative">
                            <div className="flex items-center border rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                                <div className="px-3 py-2.5">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <select
                                    value={documentType}
                                    onChange={(e) => setDocumentType(e.target.value)}
                                    disabled={isUploading}
                                    className="w-full py-2.5 pr-4 focus:outline-none text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                                >
                                    <option value="">--Select an option--</option>
                                    <option value="Personal">Personal</option>
                                    <option value="Corporate">Corporate</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Loading indicator */}
                    {isUploading && (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Uploading document...</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isUploading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedDocument || !documentType || isUploading}
                        >
                            {isUploading ? (
                                <>
                                    <Upload className="w-4 h-4 mr-2 animate-pulse" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Document
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
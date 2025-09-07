'use client'

import { useState } from 'react'
import { X, Calendar, Clock, Users, FileText, Mail, Phone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SigningProgressStepper } from './signing-progress-stepper'
import { cn } from '@/lib/utils'
import { DriveService } from '@/lib/drive-service'

interface RequestDetailsModalProps {
  request: {
    id: string
    title: string
    status: string
    progress: {
      viewed: number
      signed: number
      total: number
    }
    signers: Array<{
      name: string
      email: string
      status: string
      viewed_at?: string
      signed_at?: string
    }>
    initiated_at: string
    expires_at?: string
    days_remaining?: number
    type: 'sent' | 'received'
    sender_name?: string
    document_url?: string
    document_id?: string
  }
  isOpen: boolean
  onClose: () => void
}

export function RequestDetailsModal({ request, isOpen, onClose }: RequestDetailsModalProps) {
  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleOpenDocument = async () => {
    try {
      if (!request.document_url) {
        alert('Document URL not available')
        return
      }

      console.log('🔗 Opening document with URL:', request.document_url)

      let documentUrl = request.document_url

      // If it's already a full URL, use it directly
      if (documentUrl.startsWith('http')) {
        console.log('✅ Using direct URL:', documentUrl)
        window.open(documentUrl, '_blank')
        return
      }

      // For storage paths, try multiple buckets (documents, files, uploads)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gzxfsojbbfipzvjxucci.supabase.co'
      const buckets = ['documents', 'files', 'uploads']

      // Try each bucket until we find the file
      for (const bucket of buckets) {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${documentUrl}`
        console.log(`🔗 Trying ${bucket} bucket:`, publicUrl)

        try {
          const response = await fetch(publicUrl, { method: 'HEAD' })
          if (response.ok) {
            console.log(`✅ Found document in ${bucket} bucket, opening document`)
            window.open(publicUrl, '_blank')
            return
          }
        } catch (fetchError) {
          console.log(`❌ Document not found in ${bucket} bucket:`, fetchError)
        }
      }

      console.log('❌ Document not found in any public bucket')

      // If public URL fails, try the API approach as fallback
      try {
        console.log('🔄 Trying API fallback...')
        const response = await fetch('/api/drive/document-url', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pdfUrl: documentUrl })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.url) {
            console.log('✅ API resolved URL:', data.data.url)
            window.open(data.data.url, '_blank')
            return
          }
        }
      } catch (apiError) {
        console.log('❌ API fallback failed:', apiError)
      }

      // If all approaches fail, show helpful error
      alert('Document is not currently accessible. This may be because:\n\n• The document is still being processed\n• Storage permissions need to be configured\n• The document was not properly uploaded\n\nPlease contact support if this issue persists.')

    } catch (error) {
      console.error('❌ Error opening document:', error)
      alert(`Error opening document: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getSignerStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'signed':
        return 'bg-green-100 text-green-800'
      case 'viewed':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'declined':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Signature Request Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {request.type === 'sent' ? 'Sent by you' : `Received from ${(request as any).sender_name || 'Unknown Sender'}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Document Info */}
              <div className="space-y-6">
                {/* Document Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{request.title}</p>
                        <p className="text-sm text-gray-600">Document ID: {request.id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm text-gray-900">Initiated: {formatDate(request.initiated_at)}</p>
                        {request.expires_at && (
                          <p className="text-sm text-gray-600">
                            Expires: {formatDate(request.expires_at)}
                            {request.days_remaining !== undefined && (
                              <span className={cn(
                                'ml-2 px-2 py-1 text-xs rounded-full',
                                request.days_remaining <= 1 ? 'bg-red-100 text-red-800' :
                                  request.days_remaining <= 3 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                              )}>
                                {request.days_remaining === 0 ? 'Expires today' :
                                  request.days_remaining === 1 ? '1 day left' :
                                    `${request.days_remaining} days left`}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Signers List */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Signers ({request.signers.length})
                  </h3>
                  <div className="space-y-3">
                    {request.signers.map((signer, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-blue-600">
                                {signer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{signer.name}</p>
                              <p className="text-sm text-gray-600">{signer.email}</p>
                            </div>
                          </div>
                          <Badge className={getSignerStatusColor(signer.status)}>
                            {signer.status}
                          </Badge>
                        </div>

                        {/* Signer Timeline */}
                        <div className="text-xs text-gray-600 space-y-1">
                          {signer.viewed_at && (
                            <p>👁️ Viewed: {formatDate(signer.viewed_at)}</p>
                          )}
                          {signer.signed_at && (
                            <p>✅ Signed: {formatDate(signer.signed_at)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Progress Stepper */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Signing Progress</h3>
                <SigningProgressStepper
                  progress={request.progress}
                  status={request.status}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              {request.type === 'sent' && (
                <>
                  <Button variant="outline" size="sm">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </>
              )}
              {request.type === 'received' && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleOpenDocument}
                  disabled={!request.document_url}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Open Document
                </Button>
              )}
            </div>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

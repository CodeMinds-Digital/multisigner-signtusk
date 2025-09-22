'use client'

import { useState } from 'react'

import Image from 'next/image'
import { X, Calendar, FileText, Mail, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SigningProgressStepper } from './signing-progress-stepper'
import { PDFSigningScreen } from './pdf-signing-screen'
import { cn } from '@/lib/utils'

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
      declined_at?: string
      decline_reason?: string
      signature_data?: any
      location?: any
      ip_address?: string
      user_agent?: string
    }>
    initiated_at: string
    expires_at?: string
    days_remaining?: number
    type: 'sent' | 'received'
    sender_name?: string
    document_url?: string
    document_id?: string
    document_sign_id?: string // NEW: Document Sign ID
    document_type?: string
    document_category?: string
  }
  isOpen: boolean
  onClose: () => void
  currentUserEmail?: string
}

export function RequestDetailsModal({ request, isOpen, onClose, currentUserEmail }: RequestDetailsModalProps) {
  const [showSigningScreen, setShowSigningScreen] = useState(false)

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

  const handleSignatureAccept = async (signatureData: any) => {
    try {
      console.log('✅ Signature accepted:', signatureData)

      const response = await fetch('/api/signature-requests/sign', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          signatureData
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save signature')
      }

      const result = await response.json()
      console.log('✅ Signature saved successfully:', result)

      // Show success message
      alert(`Signature saved successfully! ${result.allSignersCompleted ? 'All signers have completed. Final PDF will be generated.' : `${result.signedCount}/${result.totalSigners} signers completed.`}`)

      setShowSigningScreen(false)
      onClose()

      // Add a small delay before refresh to ensure database update is complete
      setTimeout(() => {
        console.log('🔄 Refreshing page to show updated signature status...')
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('❌ Error accepting signature:', error)
      alert(`Error saving signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleSignatureDecline = async (reason: string) => {
    try {
      console.log('❌ Signature declined:', reason)

      const response = await fetch('/api/signature-requests/decline', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request.id,
          reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to decline signature')
      }

      const result = await response.json()
      console.log('✅ Signature declined successfully:', result)

      alert('Document declined successfully. All other signers have been notified.')

      setShowSigningScreen(false)
      onClose()

      // Refresh the page to show updated status
      window.location.reload()
    } catch (error) {
      console.error('❌ Error declining signature:', error)
      alert(`Error declining signature: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop - no opacity overlay */}
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
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
          <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Document Info */}
              <div className="space-y-6">
                {/* Document Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{request.title}</p>

                        {/* Document Sign ID - Prominently displayed */}
                        {request.document_sign_id ? (
                          <div className="mt-2 mb-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              🆔 {request.document_sign_id}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">Internal ID: {request.id.slice(0, 8)}...</p>
                        )}

                        {/* Category and Type Display */}
                        <div className="flex gap-2 mt-2">
                          {request.document_category && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              📁 {request.document_category}
                            </span>
                          )}
                          {request.document_type && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                              📄 {request.document_type}
                            </span>
                          )}
                          {!request.document_category && !request.document_type && (
                            <span className="text-xs text-gray-400">Category/Type not specified</span>
                          )}
                        </div>
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
                            {signer.status === 'signed' ? 'Signed' :
                              signer.status === 'viewed' ? 'Viewed' :
                                signer.status === 'declined' ? 'Declined' :
                                  signer.status === 'pending' ? 'Pending' :
                                    signer.status}
                          </Badge>
                        </div>

                        {/* Signer Details */}
                        <div className="space-y-3">
                          {/* Timeline */}
                          <div className="text-xs text-gray-600 space-y-1">
                            {signer.viewed_at && (
                              <p>👁️ Viewed: {formatDate(signer.viewed_at)}</p>
                            )}
                            {signer.signed_at && (
                              <p>✅ Signed: {formatDate(signer.signed_at)}</p>
                            )}
                            {signer.declined_at && (
                              <p>❌ Declined: {formatDate(signer.declined_at)}</p>
                            )}
                          </div>

                          {/* Signature Image */}
                          {signer.signature_data && signer.status === 'signed' && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">Signature:</p>
                              <div className="bg-white border border-gray-200 rounded p-2 max-w-xs">
                                {typeof signer.signature_data === 'string' ? (
                                  <Image
                                    src={signer.signature_data}
                                    alt="Signature"
                                    width={200}
                                    height={50}
                                    className="max-h-12 max-w-full object-contain"
                                  />
                                ) : signer.signature_data.signature_image ? (
                                  <Image
                                    src={signer.signature_data.signature_image}
                                    alt="Signature"
                                    width={200}
                                    height={50}
                                    className="max-h-12 max-w-full object-contain"
                                  />
                                ) : (
                                  <p className="text-xs text-gray-500">Signature data available</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Location Information */}
                          {signer.location && signer.status === 'signed' && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Signing Location:</p>
                              <div className="text-xs text-gray-600 space-y-1">
                                {signer.location.address && (
                                  <p>📍 {signer.location.address}</p>
                                )}
                                {signer.location.latitude && signer.location.longitude && (
                                  <p>🌐 {signer.location.latitude.toFixed(6)}, {signer.location.longitude.toFixed(6)}</p>
                                )}
                                {signer.location.timestamp && (
                                  <p>⏰ {formatDate(signer.location.timestamp)}</p>
                                )}
                                {signer.ip_address && (
                                  <p>🌐 IP: {signer.ip_address}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Decline Reason */}
                          {signer.decline_reason && signer.status === 'declined' && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-1">Decline Reason:</p>
                              <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                                {signer.decline_reason}
                              </p>
                            </div>
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
              {/* Removed Open Document & Sign Document buttons from info popup as requested */}
            </div>

            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Signing Screen */}
      {showSigningScreen && (
        <PDFSigningScreen
          request={{
            id: request.id,
            title: request.title,
            document_url: request.document_url || '',
            expires_at: request.expires_at || '',
            signers: request.signers.map(s => ({
              id: s.email,
              name: s.name,
              email: s.email,
              status: s.status,
              signing_order: 1
            }))
          }}
          currentUserEmail={currentUserEmail || ''}
          onClose={() => setShowSigningScreen(false)}
          onSign={handleSignatureAccept}
          onDecline={handleSignatureDecline}
        />
      )}
    </div>
  )
}

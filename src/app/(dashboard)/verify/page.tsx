'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Shield
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface VerificationResult {
  success: boolean
  data?: {
    qr_verification: any
    signing_request: any
    verification_status: string
    verified_at: string
  }
  error?: string
}

export default function VerifyPage() {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [documentId, setDocumentId] = useState('') // NEW: Document ID input
  const [showInputForm, setShowInputForm] = useState(false) // NEW: Show input form
  const searchParams = useSearchParams()
  const toast = useToast()

  // Handle URL parameters for pre-filling Document Sign ID
  useEffect(() => {
    const documentSignId = searchParams.get('documentSignId')
    const requestId = searchParams.get('requestId')

    if (documentSignId) {
      setDocumentId(documentSignId)
      setShowInputForm(true)
    } else if (requestId) {
      setDocumentId(requestId)
      setShowInputForm(true)
    }
  }, [searchParams])



  const verifyDocument = async (requestId: string) => {
    setIsVerifying(true)
    setVerificationResult(null) // Clear previous results
    try {
      const response = await fetch(`/api/verify/${requestId}`)
      const result = await response.json()

      setVerificationResult(result)

      if (result.success) {
        toast.success('Document verified successfully')
      } else {
        toast.error(result.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Verification failed')
      setVerificationResult({ success: false, error: 'Network error' })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleDirectVerification = async () => {
    if (!showInputForm) {
      setShowInputForm(true)
      return
    }

    if (!documentId.trim()) {
      toast.error('Please enter a Document Sign ID')
      return
    }

    setIsVerifying(true)
    try {
      console.log('🔄 Starting document verification...')

      let cleanDocumentId = documentId.trim()

      // Check if it's a URL and extract the request ID
      const urlMatch = documentId.match(/\/verify\/([a-f0-9-]{36})/i)
      if (urlMatch) {
        cleanDocumentId = urlMatch[1]
        await verifyDocument(cleanDocumentId)
        return
      }

      // Check if it's a UUID (Request ID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (uuidRegex.test(cleanDocumentId)) {
        await verifyDocument(cleanDocumentId)
        return
      }

      // If it's not a UUID, treat it as a Document Sign ID
      if (cleanDocumentId.length >= 3 && cleanDocumentId.length <= 50) {
        await verifyByDocumentSignId(cleanDocumentId)
        return
      }

      toast.error('Invalid format. Please enter a valid Document Sign ID.')
      setIsVerifying(false)

    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Verification failed')
      setVerificationResult({ success: false, error: 'Network error' })
      setIsVerifying(false)
    }
  }

  const verifyByDocumentSignId = async (documentSignId: string) => {
    try {
      console.log('🔍 Looking up Request ID by Document Sign ID:', documentSignId)

      // First, lookup the Request ID using the Document Sign ID
      const response = await fetch(`/api/verify/lookup?documentSignId=${encodeURIComponent(documentSignId)}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Document not found with that Sign ID')
        setIsVerifying(false)
        return
      }

      // Use the found Request ID to verify the document
      await verifyDocument(result.requestId)

    } catch (error) {
      console.error('Document Sign ID lookup error:', error)
      toast.error('Failed to lookup document by Sign ID')
      setIsVerifying(false)
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const capitalizeFirst = (str: string) => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const getSignatureType = (totalSigners: number, metadata?: any) => {
    if (totalSigners === 1) return 'Single'

    // For multi-signature, check the signing mode from metadata
    let signingMode = 'Sequential' // default
    if (metadata) {
      try {
        const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata
        if (parsedMetadata.signing_mode) {
          signingMode = parsedMetadata.signing_mode === 'parallel' ? 'Parallel' : 'Sequential'
        }
      } catch (e) {
        console.log('Could not parse metadata for signing mode:', e)
      }
    }

    return `Multi (${signingMode})`
  }

  const getVerificationBadge = (status: string, expiresAt?: string) => {
    // Check status first
    const statusLower = status.toLowerCase()

    // Completed documents are always valid, regardless of expiration date
    if (statusLower === 'completed') {
      return {
        icon: '✓',
        text: 'Valid Document',
        className: 'bg-green-100 text-green-800 border-green-200'
      }
    }

    // Check if document is expired (only for non-completed documents)
    const isExpired = status === 'expired' || (expiresAt && new Date(expiresAt) < new Date())

    if (isExpired) {
      return {
        icon: '⚠️',
        text: 'Expired Document',
        className: 'bg-orange-100 text-orange-800 border-orange-200'
      }
    }

    // Check other statuses
    switch (statusLower) {
      case 'pending':
      case 'initiated':
      case 'in_progress':
        return {
          icon: '⏳',
          text: 'Pending Signatures',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        }
      case 'cancelled':
        return {
          icon: '✕',
          text: 'Cancelled Document',
          className: 'bg-gray-100 text-gray-800 border-gray-200'
        }
      case 'declined':
        return {
          icon: '✕',
          text: 'Declined Document',
          className: 'bg-red-100 text-red-800 border-red-200'
        }
      default:
        return {
          icon: '✓',
          text: 'Valid Document',
          className: 'bg-green-100 text-green-800 border-green-200'
        }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
        <p className="text-gray-600 mt-2">
          Upload signed PDF documents to verify their authenticity and view signing details.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Direct Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Document Verification
            </CardTitle>
            <CardDescription>
              Verify a signed document using its Document Sign ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Enter the <strong>Document Sign ID</strong> (e.g., DOC-ABCD123456) to verify the document's authenticity and view signing details.
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> You can find the Document Sign ID:
                <ul className="mt-1 ml-4 list-disc text-xs">
                  <li>In the Sign ID column of your signature requests</li>
                  <li>In the signature area of generated PDFs</li>
                  <li>In document info popups</li>
                </ul>
              </div>
            </div>

            {/* Document ID Input Form */}
            {showInputForm && (
              <div className="space-y-3 border-t pt-4">
                <Label htmlFor="document-id">Document Sign ID</Label>
                <Input
                  id="document-id"
                  type="text"
                  value={documentId}
                  onChange={(e) => {
                    setDocumentId(e.target.value)
                    // Clear previous verification result when user changes input
                    if (verificationResult) {
                      setVerificationResult(null)
                    }
                  }}
                  placeholder="Enter DOC-ABCD123456"
                  className="w-full"
                  maxLength={50}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleDirectVerification}
                    disabled={isVerifying || !documentId.trim()}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {isVerifying ? 'Verifying...' : 'Verify Document'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInputForm(false)
                      setDocumentId('')
                    }}
                    disabled={isVerifying}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Show Input Form Button */}
            {!showInputForm && (
              <Button
                onClick={handleDirectVerification}
                disabled={isVerifying}
                className="w-full flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Verify Document
              </Button>
            )}
          </CardContent>
        </Card>


      </div>

      {/* Verification Results */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.success ? (
                (() => {
                  const status = verificationResult.data?.signing_request.status
                  const expiresAt = verificationResult.data?.signing_request.expires_at
                  const statusLower = status?.toLowerCase()

                  // Completed documents are always valid (green)
                  if (statusLower === 'completed') {
                    return <CheckCircle className="w-5 h-5 text-green-600" />
                  }

                  // Check expiration only for non-completed documents
                  const isExpired = status === 'expired' || (expiresAt && new Date(expiresAt) < new Date())

                  if (isExpired) {
                    return <AlertTriangle className="w-5 h-5 text-orange-600" />
                  } else {
                    return <CheckCircle className="w-5 h-5 text-blue-600" />
                  }
                })()
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              Verification Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {verificationResult.success && verificationResult.data ? (
              <div className="space-y-6">
                {/* Status Badge */}
                {(() => {
                  const badge = getVerificationBadge(
                    verificationResult.data.signing_request.status,
                    verificationResult.data.signing_request.expires_at
                  )
                  return (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={badge.className}>
                        {badge.icon} {badge.text}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Verified on {formatDate(verificationResult.data.verified_at)}
                      </span>
                    </div>
                  )
                })()}

                {/* Document Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Document Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Title:</span>
                        <span className="font-medium">{verificationResult.data.signing_request.document?.title || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <Badge variant="outline">
                          {capitalizeFirst(verificationResult.data.signing_request.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category:</span>
                        <span className="font-medium">{verificationResult.data.signing_request.document?.category || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Document Type:</span>
                        <span className="font-medium">{verificationResult.data.signing_request.document?.document_type || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Signature Type:</span>
                        <span className="font-medium">{getSignatureType(verificationResult.data.signing_request.total_signers || verificationResult.data.signing_request.signers?.length || 0, verificationResult.data.signing_request.metadata)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{formatDate(verificationResult.data.signing_request.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Completed:</span>
                        <span>{verificationResult.data.signing_request.status === 'completed' ? formatDate(verificationResult.data.signing_request.updated_at) : 'Not completed'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expires:</span>
                        <span>{verificationResult.data.signing_request.expires_at ? formatDate(verificationResult.data.signing_request.expires_at) : 'No expiry'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Signature Requester:</span>
                        <span className="font-medium">
                          {verificationResult.data.signing_request.user?.email ||
                            verificationResult.data.signing_request.user?.name ||
                            verificationResult.data.signing_request.document?.user_email ||
                            'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Signing Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Signers:</span>
                        <span className="font-medium">{verificationResult.data.signing_request.signers?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Completed:</span>
                        <span className="font-medium">
                          {verificationResult.data.signing_request.signers?.filter((s: any) => s.status === 'signed').length || 0}
                        </span>
                      </div>
                      {verificationResult.data.signing_request.require_totp && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">TOTP Authentication:</span>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                          >
                            🔐 Required
                          </Badge>
                        </div>
                      )}
                      {verificationResult.data.qr_verification?.document_hash && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Document Hash:</span>
                          <span className="font-mono text-xs">
                            {verificationResult.data.qr_verification.document_hash.substring(0, 16)}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Signers List */}
                {verificationResult.data.signing_request.signers && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Signers
                    </h4>
                    <div className="space-y-2">
                      {verificationResult.data.signing_request.signers.map((signer: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{signer.signer_name || signer.signer_email}</div>
                            <div className="text-sm text-gray-500">{signer.signer_email}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={signer.status === 'signed' ? 'default' : 'secondary'}
                                className={signer.status === 'signed' ? 'bg-green-100 text-green-800' : ''}
                              >
                                {signer.status === 'signed' ? '✓ Signed' : signer.status}
                              </Badge>
                              {verificationResult.data?.signing_request.require_totp && signer.totp_verified && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                  🔐 TOTP Verified
                                </Badge>
                              )}
                            </div>
                            {signer.signed_at && (
                              <span className="text-xs text-gray-500">
                                {formatDate(signer.signed_at)}
                              </span>
                            )}
                            {verificationResult.data?.signing_request.require_totp && signer.totp_verified_at && (
                              <span className="text-xs text-blue-500">
                                TOTP: {formatDate(signer.totp_verified_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Trail */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Audit Trail
                  </h4>
                  <div className="space-y-3">
                    {/* Create chronological timeline */}
                    {(() => {
                      const activities = []

                      // Document Creation
                      activities.push({
                        type: 'created',
                        timestamp: verificationResult.data.signing_request.created_at,
                        title: 'Document Created',
                        description: `Document "${verificationResult.data.signing_request.document?.title || 'Unknown'}" was created`,
                        color: 'blue'
                      })

                      // Signer Activities (viewed and signed)
                      verificationResult.data.signing_request.signers?.forEach((signer: any) => {
                        if (signer.viewed_at) {
                          activities.push({
                            type: 'viewed',
                            timestamp: signer.viewed_at,
                            title: 'Document Viewed',
                            description: `${signer.signer_name} (${signer.signer_email}) viewed the document`,
                            color: 'yellow'
                          })
                        }
                        if (signer.signed_at) {
                          activities.push({
                            type: 'signed',
                            timestamp: signer.signed_at,
                            title: 'Document Signed',
                            description: `${signer.signer_name} (${signer.signer_email}) digitally signed the document`,
                            color: 'green'
                          })
                        }
                      })

                      // QR Code Generation (after all signing activities) - only if qr_verification exists
                      if (verificationResult.data.qr_verification?.created_at) {
                        activities.push({
                          type: 'qr_generated',
                          timestamp: verificationResult.data.qr_verification.created_at,
                          title: 'QR Code Generated',
                          description: 'Document verification QR code was generated and embedded',
                          color: 'purple'
                        })
                      }

                      // Document Verification
                      activities.push({
                        type: 'verified',
                        timestamp: verificationResult.data.verified_at,
                        title: 'Document Verified',
                        description: 'Document authenticity and integrity verified via QR code',
                        color: 'emerald'
                      })

                      // Sort by timestamp
                      activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

                      return activities.map((activity, index) => (
                        <div key={index} className={`flex items-start gap-3 p-3 bg-${activity.color}-50 rounded-lg`}>
                          <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full mt-2 flex-shrink-0`}></div>
                          <div>
                            <div className={`font-medium text-${activity.color}-900`}>{activity.title}</div>
                            <div className={`text-sm text-${activity.color}-700`}>
                              {activity.description}
                            </div>
                            <div className={`text-xs text-${activity.color}-600 mt-1`}>
                              {formatDate(activity.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">Verification Failed</h3>
                <p className="text-red-600">
                  {verificationResult.error || 'The document could not be verified. It may be invalid or corrupted.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

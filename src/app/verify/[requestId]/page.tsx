'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  Calendar,
  Shield,
  Download,
  ExternalLink,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface VerificationData {
  qr_verification: {
    verification_url: string
    document_hash: string
    created_at: string
  }
  signing_request: {
    id: string
    status: string
    document_status: string
    final_pdf_url?: string
    created_at: string
    total_signers: number
    completed_signers: number
    viewed_signers: number
    metadata?: {
      signing_mode?: string
      message?: string
      created_at?: string
    }
    signers: Array<{
      signer_name: string
      signer_email: string
      status: string
      signed_at?: string
      signing_order: number
      viewed_at?: string
      reminder_count?: number
    }>
    document: {
      title: string
      file_name: string
    }
  }
  verification_status: string
  verified_at: string
}

export default function VerifyPage() {
  const params = useParams()
  const requestId = params.requestId as string

  const [verificationData, setVerificationData] = useState<VerificationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (requestId) {
      verifyDocument()
    }
  }, [requestId])

  const verifyDocument = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/verify/${requestId}`)
      const result = await response.json()

      if (result.success) {
        setVerificationData(result.data)
      } else {
        setError(result.error || 'Document verification failed')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setError('Network error during verification')
    } finally {
      setIsLoading(false)
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
        console.log('Could not parse metadata for signing mode')
      }
    }

    return `Multi (${signingMode})`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'signed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Document</h2>
          <p className="text-gray-600">Please wait while we verify the document authenticity...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-900 mb-2">Verification Failed</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={verifyDocument} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!verificationData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Not Found</h2>
            <p className="text-gray-600">The requested document could not be found or verified.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-green-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Document Verification</h1>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800 text-lg px-4 py-2">
            ✓ Valid Document
          </Badge>
          <p className="text-gray-600 mt-2">
            Verified on {formatDate(verificationData.verified_at)}
          </p>
        </div>

        <div className="space-y-6">
          {/* Document Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Title:</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {verificationData.signing_request.document.title}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status:</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(verificationData.signing_request.status)}>
                        {capitalizeFirst(verificationData.signing_request.status)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created:</label>
                    <p className="text-gray-900">{formatDate(verificationData.signing_request.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completed:</label>
                    <p className="text-gray-900">{verificationData.signing_request.status === 'completed' ? formatDate((verificationData.signing_request as any).updated_at || verificationData.signing_request.created_at) : 'Not completed'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category:</label>
                    <p className="text-gray-900">{(verificationData.signing_request.document as any).category || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Document Type:</label>
                    <p className="text-gray-900">{(verificationData.signing_request.document as any).document_type || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Signers:</label>
                    <p className="text-gray-900">{verificationData.signing_request.total_signers || verificationData.signing_request.signers.length}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completed:</label>
                    <p className="text-gray-900">{verificationData.signing_request.completed_signers || verificationData.signing_request.signers.filter(s => s.status === 'signed').length}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Signature Type:</label>
                    <p className="text-gray-900">{getSignatureType(verificationData.signing_request.total_signers, verificationData.signing_request.metadata)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Signature Requester:</label>
                    <p className="text-gray-900">{(verificationData.signing_request.document as any).user_email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expires:</label>
                    <p className="text-gray-900">{(verificationData.signing_request as any).expires_at ? formatDate((verificationData.signing_request as any).expires_at) : 'No expiry'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Document Hash:</label>
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {verificationData.qr_verification.document_hash.substring(0, 16)}...
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-6 border-t">
                {verificationData.signing_request.final_pdf_url && (
                  <Button asChild>
                    <a
                      href={verificationData.signing_request.final_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Document
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <Link href="/" className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Visit SignTusk
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Signing Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Signing Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {verificationData.signing_request.total_signers || verificationData.signing_request.signers.length}
                  </div>
                  <div className="text-sm text-blue-700">Total Signers:</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {verificationData.signing_request.completed_signers || verificationData.signing_request.signers.filter(s => s.status === 'signed').length}
                  </div>
                  <div className="text-sm text-green-700">Completed:</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {verificationData.signing_request.viewed_signers || verificationData.signing_request.signers.filter(s => s.viewed_at).length}
                  </div>
                  <div className="text-sm text-purple-700">Viewed:</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 mb-3">Signers</h4>
                {verificationData.signing_request.signers
                  .sort((a, b) => a.signing_order - b.signing_order)
                  .map((signer, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {signer.signing_order}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{signer.signer_name}</div>
                            <div className="text-sm text-gray-500">{signer.signer_email}</div>
                            {signer.viewed_at && (
                              <div className="text-xs text-gray-400 mt-1">
                                Viewed: {formatDate(signer.viewed_at)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(signer.status)}>
                            {signer.status === 'signed' ? '✓ Signed' : signer.status}
                          </Badge>
                          {signer.signed_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(signer.signed_at)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>
                Complete document activity history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Create chronological timeline */}
                {(() => {
                  const activities = []

                  // Document Creation
                  activities.push({
                    type: 'created',
                    timestamp: verificationData.signing_request.created_at,
                    title: 'Document Created',
                    description: `Document "${verificationData.signing_request.document.title}" was created`,
                    color: 'blue'
                  })

                  // Signer Activities (viewed and signed)
                  verificationData.signing_request.signers.forEach((signer) => {
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

                  // QR Code Generation (after all signing activities)
                  activities.push({
                    type: 'qr_generated',
                    timestamp: verificationData.qr_verification.created_at,
                    title: 'QR Code Generated',
                    description: 'Document verification QR code was generated and embedded',
                    color: 'purple'
                  })

                  // Document Verification
                  activities.push({
                    type: 'verified',
                    timestamp: verificationData.verified_at,
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
            </CardContent>
          </Card>

          {/* Security Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-green-900">Authentic Document</h4>
                  <p className="text-sm text-green-700">Document integrity verified</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-blue-900">Secure Signatures</h4>
                  <p className="text-sm text-blue-700">Cryptographically signed</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <h4 className="font-semibold text-purple-900">Timestamped</h4>
                  <p className="text-sm text-purple-700">Immutable audit trail</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

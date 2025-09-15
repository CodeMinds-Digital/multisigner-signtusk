'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  FileText,
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const toast = useToast()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
      toast.success('PDF uploaded successfully')
    } else {
      toast.error('Please upload a valid PDF file')
    }
  }

  const verifyDocument = async (requestId: string) => {
    setIsVerifying(true)
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
    setIsVerifying(true)
    try {
      console.log('🔄 Starting document verification...')

      // Prompt user for request ID
      const requestId = prompt('Please enter the document request ID for verification:')

      if (!requestId) {
        toast.info('Verification cancelled')
        setIsVerifying(false)
        return
      }

      // Clean the request ID if it's a URL
      let cleanRequestId = requestId.trim()
      const urlMatch = requestId.match(/\/verify\/([a-f0-9-]{36})/i)
      if (urlMatch) {
        cleanRequestId = urlMatch[1]
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(cleanRequestId)) {
        toast.error('Invalid request ID format. Please enter a valid UUID.')
        setIsVerifying(false)
        return
      }

      await verifyDocument(cleanRequestId)

    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Verification failed')
      setVerificationResult({ success: false, error: 'Network error' })
      setIsVerifying(false)
    }
  }

  const handlePDFVerification = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a PDF file first')
      return
    }

    // For now, just use the direct verification method
    await handleDirectVerification()
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
    if (totalSigners > 1) return 'Multi'
    return 'Single'
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
              Verify a signed document using its request ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600">
              Enter the document request ID to verify its authenticity and view signing details.
            </div>

            <Button
              onClick={handleDirectVerification}
              disabled={isVerifying}
              className="w-full flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {isVerifying ? 'Verifying...' : 'Verify Document'}
            </Button>
          </CardContent>
        </Card>

        {/* PDF Upload (Optional) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              PDF Upload (Optional)
            </CardTitle>
            <CardDescription>
              Upload a signed PDF document for additional verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-upload">Select PDF File</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                ref={fileInputRef}
              />
            </div>

            {uploadedFile && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileText className="w-4 h-4 text-green-600" />
                <span className="text-green-700 text-sm">{uploadedFile.name}</span>
              </div>
            )}

            <Button
              onClick={handlePDFVerification}
              disabled={!uploadedFile || isVerifying}
              className="w-full flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              {isVerifying ? 'Verifying...' : 'Verify with PDF'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Verification Results */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {verificationResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
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
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✓ Valid Document
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Verified on {formatDate(verificationResult.data.verified_at)}
                  </span>
                </div>

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
                        <span className="font-medium">{getSignatureType(verificationResult.data.signing_request.total_signers, verificationResult.data.signing_request.metadata)}</span>
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
                      <div className="flex justify-between">
                        <span className="text-gray-500">Document Hash:</span>
                        <span className="font-mono text-xs">
                          {verificationResult.data.qr_verification.document_hash.substring(0, 16)}...
                        </span>
                      </div>
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
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={signer.status === 'signed' ? 'default' : 'secondary'}
                              className={signer.status === 'signed' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {signer.status === 'signed' ? '✓ Signed' : signer.status}
                            </Badge>
                            {signer.signed_at && (
                              <span className="text-xs text-gray-500">
                                {formatDate(signer.signed_at)}
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

                      // QR Code Generation (after all signing activities)
                      activities.push({
                        type: 'qr_generated',
                        timestamp: verificationResult.data.qr_verification.created_at,
                        title: 'QR Code Generated',
                        description: 'Document verification QR code was generated and embedded',
                        color: 'purple'
                      })

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

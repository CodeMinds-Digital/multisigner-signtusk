'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import UniversalDocumentViewer from '@/components/features/send/universal-document-viewer'
import { DataRoomPublicViewer } from '@/components/features/send/data-room-public-viewer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Mail, FileText, Eye, AlertCircle } from 'lucide-react'
import { SendVisitorTracking } from '@/lib/send-visitor-tracking'
import { useViewerTracking } from '@/hooks/use-realtime-analytics'
import { useSendNotifications } from '@/hooks/use-send-notifications'
import { EnhancedWatermark } from '@/components/features/send/enhanced-watermark'
import { EnhancedWatermarkConfig } from '@/lib/enhanced-watermark-service'
import { AccessGateLayout } from '@/components/features/send/share-page-layout'

interface LinkData {
  type?: 'document' | 'dataroom'
  link: {
    id: string
    linkId?: string
    slug?: string
    name: string
    allowDownload: boolean
    allowPrinting: boolean
    enableWatermark: boolean
    watermarkText: string | null
    enhancedWatermarkConfig?: EnhancedWatermarkConfig | null
    viewCount: number
    expiresAt: string | null
    screenshotProtection?: boolean
  }
  document?: {
    id: string
    title: string
    file_url: string
    file_name: string
    file_type: string
    file_size: number
  }
  dataRoom?: {
    id: string
    name: string
    description: string
    folderStructure: any
  }
  documents?: Array<{
    id: string
    title: string
    file_url: string
    file_name: string
    file_type: string
    file_size: number
    thumbnail_url?: string
    folder_path: string
    sort_order: number
  }>
}

export default function PublicDocumentViewerPage() {
  const params = useParams()
  const linkId = params.linkId as string
  const { notifyDocumentViewed, notifyNDAAccepted, notifyReturningVisitor } = useSendNotifications()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkData, setLinkData] = useState<LinkData | null>(null)

  // Access control states
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [requiresEmail, setRequiresEmail] = useState(false)
  const [requiresNda, setRequiresNda] = useState(false)
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [ndaAccepted, setNdaAccepted] = useState(false)
  const [ndaText, setNdaText] = useState('')

  // UI states
  const [verifying, setVerifying] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  // Visitor tracking
  const [visitorSession, setVisitorSession] = useState<any>(null)

  // Initialize visitor session
  useEffect(() => {
    const initVisitorSession = async () => {
      if (linkData) {
        try {
          // For data rooms, we don't need a specific document ID for session init
          const documentId = linkData.type === 'dataroom' ? 'dataroom' : linkData.document?.id
          if (documentId) {
            const session = await SendVisitorTracking.initSession(
              linkId,
              documentId,
              email || undefined
            )
            setVisitorSession(session)

            // Trigger notification for document viewed (non-blocking)
            if (linkData.document) {
              try {
                const fingerprint = await SendVisitorTracking.generateFingerprint()
                await notifyDocumentViewed(
                  linkData.document.id,
                  email || undefined,
                  fingerprint
                )

                // Check if returning visitor and notify
                if (session.isReturningVisitor) {
                  await notifyReturningVisitor(
                    linkData.document.id,
                    email || undefined,
                    fingerprint,
                    undefined,
                    session.previousVisits
                  )
                }
              } catch (notificationError) {
                // Silently handle notification failures - don't block the viewer
                console.warn('Notification failed (non-critical):', notificationError)
              }
            }
          }
        } catch (error) {
          console.error('Failed to initialize visitor session:', error)
        }
      }
    }

    initVisitorSession()
  }, [linkData, linkId, email])

  // Real-time viewer tracking
  const { updatePage } = useViewerTracking(
    linkId,
    visitorSession?.sessionId || '',
    visitorSession?.fingerprint || '',
    email || undefined
  )

  // Fetch link data
  const fetchLinkData = async (pwd?: string, eml?: string) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (pwd) params.append('password', pwd)
      if (eml) params.append('email', eml)

      // Try single document link first
      let response = await fetch(`/api/send/links/${linkId}?${params.toString()}`)
      let data = await response.json()

      // If single document link not found, try data room link
      if (!response.ok && response.status === 404) {
        console.log('🔄 Single document link not found, trying data room link...')
        response = await fetch(`/api/send/dataroom-links/${linkId}?${params.toString()}`)
        data = await response.json()
      }

      if (!response.ok) {
        if (data.requiresPassword) {
          setRequiresPassword(true)
          setError(null)
          return
        }
        if (data.requiresEmail) {
          setRequiresEmail(true)
          setError(null)
          return
        }
        if (data.requiresNda) {
          setRequiresNda(true)
          setNdaText(data.ndaText || '')
          setError(null)
          return
        }

        // Handle specific error cases with user-friendly messages
        if (response.status === 401) {
          if (data.error?.includes('password') || data.error?.includes('Password')) {
            setError('Incorrect password. Please try again.')
            setRequiresPassword(true) // Show password form with error
          } else {
            setError('Authentication required. Please check your credentials.')
          }
        } else if (response.status === 403) {
          if (data.error?.includes('expired') || data.error?.includes('Expired')) {
            setError('This link has expired and is no longer accessible.')
          } else if (data.error?.includes('limit') || data.error?.includes('View limit')) {
            setError('View limit exceeded. This link has reached its maximum number of views.')
          } else {
            setError('Access denied. You do not have permission to view this content.')
          }
        } else if (response.status === 404) {
          setError('Document not found. This link may have been removed or is invalid.')
        } else {
          setError(data.error || 'Failed to load content. Please try again.')
        }
        return
      }

      setLinkData(data)
      setRequiresPassword(false)
      setRequiresEmail(false)
      setRequiresNda(false)
    } catch (err: any) {
      console.error('Link fetch error:', err)
      setError(err.message || 'Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (linkId) {
      fetchLinkData()
    }
  }, [linkId])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetchLinkData(password, email)
  }

  const handleSendVerification = async () => {
    try {
      setVerifying(true)

      // Determine API endpoint based on link type
      const apiEndpoint = linkData?.type === 'dataroom'
        ? `/api/send/dataroom-links/${linkId}`
        : `/api/send/links/${linkId}`

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send-verification',
          email
        })
      })

      const data = await response.json()
      if (data.success) {
        setVerificationSent(true)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError('Failed to send verification code')
    } finally {
      setVerifying(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setVerifying(true)

      // Determine API endpoint based on link type
      const apiEndpoint = linkData?.type === 'dataroom'
        ? `/api/send/dataroom-links/${linkId}`
        : `/api/send/links/${linkId}`

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify-code',
          email,
          code: verificationCode
        })
      })

      const data = await response.json()
      if (data.success) {
        await fetchLinkData(password, email)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError('Failed to verify code')
    } finally {
      setVerifying(false)
    }
  }

  const handleAcceptNda = async () => {
    try {
      setVerifying(true)
      const response = await fetch(`/api/send/links/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept-nda',
          email,
          ndaText,
          ipAddress: '', // TODO: Get client IP
          userAgent: navigator.userAgent
        })
      })

      const data = await response.json()
      if (data.success) {
        // Trigger NDA accepted notification
        if (linkData && linkData.document) {
          const fingerprint = await SendVisitorTracking.generateFingerprint()
          await notifyNDAAccepted(
            linkData.document.id,
            email || undefined,
            fingerprint
          )
        }

        await fetchLinkData(password, email)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError('Failed to accept NDA')
    } finally {
      setVerifying(false)
    }
  }

  const handleView = async () => {
    // Track view event
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: linkData?.link.linkId,
          documentId: linkData?.type === 'dataroom' ? null : linkData?.document?.id,
          eventType: 'view',
          email: email || undefined
        })
      })
    } catch (err) {
      console.error('Failed to track view:', err)
    }
  }

  const handleDownload = async () => {
    // Track download event
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: linkData?.link.linkId,
          documentId: linkData?.document?.id,
          eventType: 'download',
          email: email || undefined
        })
      })
    } catch (err) {
      console.error('Failed to track download:', err)
    }
  }

  const handlePrint = async () => {
    // Track print event
    try {
      await fetch('/api/send/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: linkData?.link.linkId,
          documentId: linkData?.document?.id,
          eventType: 'print',
          email: email || undefined
        })
      })
    } catch (err) {
      console.error('Failed to track print:', err)
    }
  }

  // Password gate
  if (requiresPassword) {
    return (
      <AccessGateLayout
        title="Password Required"
        description="This document is password protected"
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="text-center text-lg tracking-wider"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Verifying...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Access Document
              </>
            )}
          </Button>
        </form>
      </AccessGateLayout>
    )
  }

  // Email verification gate
  if (requiresEmail && !verificationSent) {
    return (
      <AccessGateLayout
        title="Email Verification Required"
        description="Please verify your email to access this document"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="text-center"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}
          <Button
            onClick={handleSendVerification}
            className="w-full"
            disabled={verifying || !email}
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>
        </div>
      </AccessGateLayout>
    )
  }

  // Verification code input
  if (requiresEmail && verificationSent) {
    return (
      <AccessGateLayout
        title="Enter Verification Code"
        description={`We sent a code to ${email}`}
      >
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              required
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={verifying}>
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Verifying...
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Verify & Access
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-sm"
            onClick={handleSendVerification}
            disabled={verifying}
          >
            Didn't receive the code? Resend
          </Button>
        </form>
      </AccessGateLayout>
    )
  }

  // NDA acceptance gate
  if (requiresNda && !ndaAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Non-Disclosure Agreement
            </CardTitle>
            <CardDescription>
              Please review and accept the NDA to access this document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {ndaText}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="nda-accept"
                checked={ndaAccepted}
                onChange={(e) => setNdaAccepted(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="nda-accept" className="cursor-pointer">
                I have read and agree to the terms of this NDA
              </Label>
            </div>
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            <Button
              onClick={handleAcceptNda}
              className="w-full"
              disabled={!ndaAccepted || verifying}
            >
              {verifying ? 'Processing...' : 'Accept & Continue'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <AccessGateLayout
        title="Access Error"
        description="There was a problem accessing this document"
      >
        <div className="text-center space-y-4">
          <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5 inline mr-2" />
            {error}
          </div>
          <Button onClick={() => window.location.reload()} className="w-full">
            Try Again
          </Button>
        </div>
      </AccessGateLayout>
    )
  }

  // Content viewer (document or data room)
  if (linkData) {
    // Data room viewer
    if (linkData.type === 'dataroom' && linkData.dataRoom && linkData.documents) {
      return (
        <DataRoomPublicViewer
          dataRoom={linkData.dataRoom}
          documents={linkData.documents}
          link={linkData.link}
          linkId={linkId}
          viewerEmail={email || undefined}
          onView={handleView}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />
      )
    }

    // Single document viewer
    if (linkData.document) {
      return (
        <div className="min-h-screen bg-gray-50">
          {linkData.link.enhancedWatermarkConfig?.enabled ? (
            <EnhancedWatermark
              config={linkData.link.enhancedWatermarkConfig}
              context={{
                userEmail: email || undefined,
                userIP: 'Unknown', // Would be populated from server
                timestamp: new Date().toISOString(),
                documentTitle: linkData.document.title,
                linkId: linkId,
                sessionId: 'session_' + Date.now() // Would be actual session ID
              }}
            >
              <UniversalDocumentViewer
                fileUrl={linkData.document.file_url}
                fileName={linkData.document.file_name}
                fileType={linkData.document.file_type}
                linkId={linkId}
                documentId={linkData.document.id}
                viewerEmail={email || undefined}
                allowDownload={linkData.link.allowDownload}
                allowPrinting={linkData.link.allowPrinting}
                watermarkText={linkData.link.enableWatermark ? linkData.link.watermarkText || undefined : undefined}
                onView={handleView}
                onDownload={handleDownload}
                onPrint={handlePrint}
              />
            </EnhancedWatermark>
          ) : (
            <UniversalDocumentViewer
              fileUrl={linkData.document.file_url}
              fileName={linkData.document.file_name}
              fileType={linkData.document.file_type}
              linkId={linkId}
              documentId={linkData.document.id}
              viewerEmail={email || undefined}
              allowDownload={linkData.link.allowDownload}
              allowPrinting={linkData.link.allowPrinting}
              watermarkText={linkData.link.enableWatermark ? linkData.link.watermarkText || undefined : undefined}
              onView={handleView}
              onDownload={handleDownload}
              onPrint={handlePrint}
            />
          )}
        </div>
      )
    }

    // Fallback for invalid link data
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Invalid Link
            </CardTitle>
            <CardDescription>
              This link appears to be invalid or corrupted.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return null
}


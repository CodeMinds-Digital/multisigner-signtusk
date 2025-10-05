'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import SendDocumentViewer from '@/components/features/send/send-document-viewer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Mail, FileText, Eye, AlertCircle } from 'lucide-react'
import { SendVisitorTracking } from '@/lib/send-visitor-tracking'
import { useViewerTracking } from '@/hooks/use-realtime-analytics'
import { useSendNotifications } from '@/hooks/use-send-notifications'

interface LinkData {
  link: {
    id: string
    linkId: string
    name: string
    allowDownload: boolean
    allowPrinting: boolean
    enableWatermark: boolean
    watermarkText: string | null
    viewCount: number
    expiresAt: string | null
  }
  document: {
    id: string
    title: string
    file_url: string
    file_name: string
    file_type: string
    file_size: number
  }
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
          const session = await SendVisitorTracking.initSession(
            linkId,
            linkData.document.id,
            email || undefined
          )
          setVisitorSession(session)

          // Trigger notification for document viewed
          const fingerprint = await SendVisitorTracking.generateFingerprint()
          await notifyDocumentViewed(
            linkData.document.id,
            email || undefined,
            fingerprint
          )

          // Check if returning visitor and notify
          if (session.isReturning) {
            await notifyReturningVisitor(
              linkData.document.id,
              email || undefined,
              fingerprint,
              undefined,
              session.visitCount
            )
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

      const response = await fetch(`/api/send/links/${linkId}?${params.toString()}`)
      const data = await response.json()

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
        throw new Error(data.error || 'Failed to load document')
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
      const response = await fetch(`/api/send/links/${linkId}`, {
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
      const response = await fetch(`/api/send/links/${linkId}`, {
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
        if (linkData) {
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
          documentId: linkData?.document.id,
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
          documentId: linkData?.document.id,
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
          documentId: linkData?.document.id,
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Required
            </CardTitle>
            <CardDescription>
              This document is password protected
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Access Document'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Email verification gate
  if (requiresEmail && !verificationSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Email Verification Required
            </CardTitle>
            <CardDescription>
              Please verify your email to access this document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <Button
              onClick={handleSendVerification}
              className="w-full"
              disabled={verifying || !email}
            >
              {verifying ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Verification code input
  if (requiresEmail && verificationSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              We sent a code to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={verifying}>
                {verifying ? 'Verifying...' : 'Verify'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Document viewer
  if (linkData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SendDocumentViewer
          fileUrl={linkData.document.file_url}
          fileName={linkData.document.file_name}
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
      </div>
    )
  }

  return null
}


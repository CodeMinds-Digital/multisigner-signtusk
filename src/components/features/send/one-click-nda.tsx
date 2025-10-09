'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Shield, Check, Clock, User, Mail, AlertCircle } from 'lucide-react'
import { OneClickNDAService, NDATemplate, OneClickNDAConfig } from '@/lib/one-click-nda-service'
import { toast } from 'sonner'

interface OneClickNDAProps {
  linkId: string
  config: OneClickNDAConfig
  documentTitle: string
  onAccepted: () => void
  prefilledEmail?: string
  prefilledName?: string
}

export function OneClickNDA({
  linkId,
  config,
  documentTitle,
  onAccepted,
  prefilledEmail = '',
  prefilledName = ''
}: OneClickNDAProps) {
  const [template, setTemplate] = useState<NDATemplate | null>(null)
  const [processedContent, setProcessedContent] = useState('')
  const [acceptorEmail, setAcceptorEmail] = useState(prefilledEmail)
  const [acceptorName, setAcceptorName] = useState(prefilledName)
  const [signature, setSignature] = useState('')
  const [witnessEmail, setWitnessEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load NDA template
  useEffect(() => {
    const templates = OneClickNDAService.getDefaultTemplates()
    const selectedTemplate = templates.find(t => t.id === config.templateId) || templates[0]
    setTemplate(selectedTemplate)
  }, [config.templateId])

  // Process template content when template or user data changes
  useEffect(() => {
    if (!template) return

    const variables = {
      company_name: config.customVariables.company_name || 'Company',
      document_title: documentTitle,
      ...config.customVariables
    }

    const processed = OneClickNDAService.processNDATemplate(
      template,
      variables,
      {
        email: acceptorEmail,
        name: acceptorName,
        ipAddress: 'Will be captured on submission'
      }
    )

    setProcessedContent(processed)
  }, [template, acceptorEmail, acceptorName, documentTitle, config.customVariables])

  // Check if domain is auto-approved
  const isAutoApproved = acceptorEmail ? 
    OneClickNDAService.isAutoApprovedDomain(acceptorEmail, config.autoAcceptDomains) : 
    false

  const handleAccept = async () => {
    if (!template) return

    setLoading(true)
    setError(null)

    try {
      // Validate inputs
      const validation = OneClickNDAService.validateAcceptance({
        acceptorEmail,
        ndaContent: processedContent,
        ipAddress: 'placeholder',
        userAgent: navigator.userAgent
      })

      if (!validation.valid) {
        setError(validation.errors.join(', '))
        return
      }

      if (!agreed) {
        setError('You must agree to the terms to proceed')
        return
      }

      if (config.requireFullName && !acceptorName.trim()) {
        setError('Full name is required')
        return
      }

      if (config.requireWitness && !witnessEmail.trim()) {
        setError('Witness email is required')
        return
      }

      // Submit NDA acceptance
      const response = await fetch(`/api/send/links/${linkId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'accept-nda-v2',
          email: acceptorEmail,
          name: acceptorName,
          ndaTemplateId: template.id,
          ndaContent: processedContent,
          signature: signature || undefined,
          witnessEmail: witnessEmail || undefined,
          userAgent: navigator.userAgent,
          fingerprint: await generateFingerprint()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept NDA')
      }

      toast.success('NDA accepted successfully!', {
        description: config.acceptanceMessage || 'You can now access the document'
      })

      onAccepted()

    } catch (err: any) {
      setError(err.message || 'Failed to accept NDA')
      toast.error('Failed to accept NDA', {
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const generateFingerprint = async (): Promise<string> => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('fingerprint', 10, 10)
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    return btoa(fingerprint).substring(0, 16)
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">Loading NDA...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {template.title}
            {isAutoApproved && (
              <Badge variant="secondary" className="ml-2">
                Pre-approved Domain
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Please review and accept the Non-Disclosure Agreement to access "{documentTitle}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* NDA Content */}
          <div className="bg-white border rounded-lg p-6 max-h-96 overflow-y-auto">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {processedContent}
              </pre>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="acceptor-email">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address *
              </Label>
              <Input
                id="acceptor-email"
                type="email"
                value={acceptorEmail}
                onChange={(e) => setAcceptorEmail(e.target.value)}
                placeholder="your.email@company.com"
                required
                disabled={loading}
              />
            </div>

            {(config.requireFullName || acceptorName) && (
              <div className="space-y-2">
                <Label htmlFor="acceptor-name">
                  <User className="w-4 h-4 inline mr-1" />
                  Full Name {config.requireFullName && '*'}
                </Label>
                <Input
                  id="acceptor-name"
                  value={acceptorName}
                  onChange={(e) => setAcceptorName(e.target.value)}
                  placeholder="John Doe"
                  required={config.requireFullName}
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Digital Signature */}
          {template.requiresSignature && (
            <div className="space-y-2">
              <Label htmlFor="signature">Digital Signature</Label>
              <Input
                id="signature"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name as your digital signature"
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                By typing your name above, you agree that this constitutes a legal signature
              </p>
            </div>
          )}

          {/* Witness Email */}
          {config.requireWitness && (
            <div className="space-y-2">
              <Label htmlFor="witness-email">Witness Email *</Label>
              <Input
                id="witness-email"
                type="email"
                value={witnessEmail}
                onChange={(e) => setWitnessEmail(e.target.value)}
                placeholder="witness@company.com"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                A copy of this agreement will be sent to the witness
              </p>
            </div>
          )}

          {/* Agreement Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={setAgreed}
              disabled={loading}
            />
            <Label htmlFor="agree" className="text-sm leading-relaxed">
              I have read, understood, and agree to be legally bound by the terms of this 
              Non-Disclosure Agreement. I understand that this agreement is legally binding 
              and enforceable.
            </Label>
          </div>

          {/* Auto-approval notice */}
          {isAutoApproved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <Check className="w-4 h-4" />
                <span className="font-medium">Pre-approved Domain</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your email domain is pre-approved. Acceptance will be processed immediately.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleAccept}
              disabled={!agreed || loading || !acceptorEmail}
              className="flex-1"
              size="lg"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  I Accept & Agree
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              disabled={loading}
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* Legal Notice */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t">
            <p>
              This is a legally binding agreement. By clicking "I Accept & Agree", you acknowledge 
              that you have read and understood the terms and agree to be bound by them.
            </p>
            <p className="mt-1">
              Your IP address and browser information will be recorded for legal purposes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

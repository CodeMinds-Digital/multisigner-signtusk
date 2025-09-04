'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react'

interface SignatureRequestProps {
  documentId?: string
  documentTitle?: string
  onRequestSent?: (requestId: string) => void
}

interface Signer {
  id: string
  name: string
  email: string
  status: 'pending' | 'sent' | 'signed' | 'declined'
  sentAt?: Date
  signedAt?: Date
}

export function SignatureRequest({ documentId, documentTitle = 'Document', onRequestSent }: SignatureRequestProps) {
  const [signers, setSigners] = useState<Signer[]>([
    { id: '1', name: '', email: '', status: 'pending' }
  ])
  const [message, setMessage] = useState('Please review and sign this document.')
  const [dueDate, setDueDate] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [requestSent, setRequestSent] = useState(false)

  const addSigner = () => {
    const newSigner: Signer = {
      id: Date.now().toString(),
      name: '',
      email: '',
      status: 'pending'
    }
    setSigners([...signers, newSigner])
  }

  const updateSigner = (id: string, field: keyof Signer, value: string) => {
    setSigners(signers.map(signer => 
      signer.id === id ? { ...signer, [field]: value } : signer
    ))
  }

  const removeSigner = (id: string) => {
    if (signers.length > 1) {
      setSigners(signers.filter(signer => signer.id !== id))
    }
  }

  const sendSignatureRequest = async () => {
    setIsSending(true)
    
    try {
      // Simulate API call to send signature requests
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Update signers status to 'sent'
      const updatedSigners = signers.map(signer => ({
        ...signer,
        status: 'sent' as const,
        sentAt: new Date()
      }))
      setSigners(updatedSigners)
      setRequestSent(true)
      
      // Generate a mock request ID
      const requestId = `req_${Date.now()}`
      
      console.log('Signature request sent:', {
        documentId,
        documentTitle,
        signers: updatedSigners,
        message,
        dueDate,
        requestId
      })
      
      if (onRequestSent) {
        onRequestSent(requestId)
      }
      
    } catch (error) {
      console.error('Failed to send signature request:', error)
    } finally {
      setIsSending(false)
    }
  }

  const getStatusIcon = (status: Signer['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />
      case 'sent':
        return <Mail className="w-4 h-4 text-blue-500" />
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'declined':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: Signer['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'sent':
        return 'Sent'
      case 'signed':
        return 'Signed'
      case 'declined':
        return 'Declined'
      default:
        return 'Unknown'
    }
  }

  const validSigners = signers.filter(s => s.name && s.email)
  const canSend = validSigners.length > 0 && !isSending && !requestSent

  if (requestSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            Signature Request Sent!
          </CardTitle>
          <CardDescription>
            Your signature request has been sent to all signers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                Signers will receive an email with a link to sign the document. 
                You'll be notified when each person signs or if they decline.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Signers Status</h4>
              <div className="space-y-2">
                {signers.map((signer) => (
                  <div key={signer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{signer.name}</p>
                      <p className="text-sm text-gray-600">{signer.email}</p>
                    </div>
                    <div className="flex items-center">
                      {getStatusIcon(signer.status)}
                      <span className="ml-2 text-sm text-gray-600">{getStatusText(signer.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Signatures</CardTitle>
        <CardDescription>
          Send "{documentTitle}" for digital signature
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-1">Document: {documentTitle}</h4>
          <p className="text-sm text-blue-700">
            {documentId ? `Document ID: ${documentId}` : 'Ready for signature requests'}
          </p>
        </div>

        {/* Signers */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium text-gray-900">Signers</h4>
            <Button variant="outline" size="sm" onClick={addSigner}>
              Add Signer
            </Button>
          </div>
          
          <div className="space-y-3">
            {signers.map((signer, index) => (
              <div key={signer.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <h5 className="font-medium text-gray-900">Signer {index + 1}</h5>
                  {signers.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSigner(signer.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="Full Name"
                    value={signer.name}
                    onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={signer.email}
                    onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to Signers
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message for the signers..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date (Optional)
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {/* Send Button */}
        <div className="flex justify-end">
          <Button 
            onClick={sendSignatureRequest}
            disabled={!canSend}
            className="flex items-center"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Sending...' : `Send to ${validSigners.length} Signer${validSigners.length !== 1 ? 's' : ''}`}
          </Button>
        </div>

        {validSigners.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              Please add at least one signer with a name and email address.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

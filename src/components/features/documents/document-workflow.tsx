'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DocumentUpload } from './document-upload'
import { DocumentEditor } from './document-editor'
import { Upload, FileText, Send, Users, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

type WorkflowStep = 'upload' | 'configure' | 'signers' | 'send'

interface DocumentWorkflowProps {
  onComplete?: (documentId: string) => void
}

export function DocumentWorkflow({ onComplete }: DocumentWorkflowProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload')
  const [documentId, setDocumentId] = useState<string>('')
  const [documentData, setDocumentData] = useState<any>(null)
  const { user } = useAuth()

  const steps = [
    { id: 'upload', title: 'Upload Document', icon: Upload, description: 'Upload your PDF document' },
    { id: 'configure', title: 'Configure', icon: Settings, description: 'Set document properties' },
    { id: 'signers', title: 'Add Signers', icon: Users, description: 'Add people who need to sign' },
    { id: 'send', title: 'Send for Signature', icon: Send, description: 'Send the document for signing' }
  ]

  const handleUploadComplete = (docId: string) => {
    setDocumentId(docId)
    setCurrentStep('configure')
  }

  const handleConfigureComplete = (data: any) => {
    setDocumentData(data)
    setCurrentStep('signers')
  }

  const handleSignersComplete = (signers: any[]) => {
    setDocumentData(prev => ({ ...prev, signers }))
    setCurrentStep('send')
  }

  const handleSendComplete = () => {
    if (onComplete) {
      onComplete(documentId)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <DocumentUpload
            onUploadComplete={handleUploadComplete}
          />
        )

      case 'configure':
        return (
          <DocumentConfigurationStep
            documentId={documentId}
            onComplete={handleConfigureComplete}
          />
        )

      case 'signers':
        return (
          <SignersStep
            documentData={documentData}
            onComplete={handleSignersComplete}
          />
        )

      case 'send':
        return (
          <SendStep
            documentData={documentData}
            onComplete={handleSendComplete}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Document Signature Workflow</CardTitle>
          <CardDescription>
            Follow these steps to prepare and send your document for signature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex(s => s.id === currentStep) > index

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${isActive
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                    }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {renderStepContent()}
    </div>
  )
}

// Document Configuration Step Component
function DocumentConfigurationStep({ documentId, onComplete }: { documentId: string, onComplete: (data: any) => void }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [dueDate, setDueDate] = useState('')

  const handleNext = () => {
    onComplete({
      documentId,
      title,
      message,
      dueDate
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configure Document</CardTitle>
        <CardDescription>
          Set up your document properties and signing requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter document title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date
          </label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to Signers
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a message for the signers..."
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleNext} disabled={!title}>
            Next: Add Signers
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Signers Step Component
function SignersStep({ documentData, onComplete }: { documentData: any, onComplete: (signers: any[]) => void }) {
  const [signers, setSigners] = useState([{ name: '', email: '', role: 'Signer' }])

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '', role: 'Signer' }])
  }

  const updateSigner = (index: number, field: string, value: string) => {
    const updated = [...signers]
    updated[index] = { ...updated[index], [field]: value }
    setSigners(updated)
  }

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const handleNext = () => {
    onComplete(signers.filter(s => s.name && s.email))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Signers</CardTitle>
        <CardDescription>
          Add people who need to sign this document
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {signers.map((signer, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-gray-900">Signer {index + 1}</h4>
              {signers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSigner(index)}
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Full Name"
                value={signer.name}
                onChange={(e) => updateSigner(index, 'name', e.target.value)}
              />
              <Input
                type="email"
                placeholder="Email Address"
                value={signer.email}
                onChange={(e) => updateSigner(index, 'email', e.target.value)}
              />
              <select
                value={signer.role}
                onChange={(e) => updateSigner(index, 'role', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="Signer">Signer</option>
                <option value="Approver">Approver</option>
                <option value="CC">CC</option>
              </select>
            </div>
          </div>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={addSigner}>
            Add Another Signer
          </Button>
          <Button onClick={handleNext} disabled={!signers.some(s => s.name && s.email)}>
            Next: Send Document
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Send Step Component
function SendStep({ documentData, onComplete }: { documentData: any, onComplete: () => void }) {
  const [isSending, setIsSending] = useState(false)
  const [emailResults, setEmailResults] = useState<any>(null)

  const handleSend = async () => {
    setIsSending(true)

    try {
      // Import email service dynamically to avoid SSR issues
      const { sendBulkSignatureRequests } = await import('@/lib/email-service')
      const { saveDocument, createDocumentRecord, markDocumentAsSent } = await import('@/lib/document-store')

      // Check user authentication
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Create document record with proper user data
      const documentRecord = createDocumentRecord(
        documentData.documentId,
        documentData.title,
        user.id,
        documentData.documentUrl || '', // Should come from upload step
        documentData.signers,
        {
          message: documentData.message,
          dueDate: documentData.dueDate
        }
      )

      // Save document
      await saveDocument(documentRecord)

      // Send emails with proper user context
      const emailResult = await sendBulkSignatureRequests(
        documentData.title,
        user.full_name || user.email,
        documentData.signers,
        {
          message: documentData.message,
          dueDate: documentData.dueDate,
          documentId: documentData.documentId
        }
      )

      setEmailResults(emailResult)

      // Mark as sent if any emails succeeded
      if (emailResult.success) {
        await markDocumentAsSent(documentData.documentId, user.id)
      }

      console.log('Document sent for signature:', {
        document: documentRecord,
        emailResults: emailResult
      })

    } catch (error) {
      console.error('Failed to send document:', error)
      setEmailResults({
        success: false,
        errors: ['Failed to send signature requests']
      })
    } finally {
      setIsSending(false)
    }

    onComplete()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send for Signature</CardTitle>
        <CardDescription>
          Review and send your document for signature
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Document Summary</h4>
          <p><strong>Title:</strong> {documentData?.title || 'Untitled Document'}</p>
          <p><strong>Due Date:</strong> {documentData?.dueDate || 'Not set'}</p>
          <p><strong>Signers:</strong> {documentData?.signers?.length || 0} people</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            Once sent, signers will receive an email with a link to sign the document.
            You'll be notified when each person signs.
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send for Signature'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

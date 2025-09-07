'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, FileText, Users, Send, Mail } from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { DriveService } from '@/lib/drive-service'
import { DocumentTemplate } from '@/types/drive'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface RequestSignatureModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: (requestId: string) => void
}

interface Signer {
    id: string
    name: string
    email: string
    status: 'pending' | 'sent' | 'signed' | 'declined'
}

type Step = 'document-selection' | 'signer-configuration'

export function RequestSignatureModal({ isOpen, onClose, onSuccess }: RequestSignatureModalProps) {
    const [currentStep, setCurrentStep] = useState<Step>('document-selection')
    const [selectedDocument, setSelectedDocument] = useState<DocumentTemplate | null>(null)
    const [readyDocuments, setReadyDocuments] = useState<DocumentTemplate[]>([])
    const [signers, setSigners] = useState<Signer[]>([])
    const [signingOrder, setSigningOrder] = useState<'sequential' | 'parallel'>('sequential')
    const [message, setMessage] = useState('Please review and sign this document.')
    const [dueDate, setDueDate] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [isSending, setIsSending] = useState(false)
    const { user } = useAuth()

    // Fetch ready documents when modal opens
    useEffect(() => {
        if (isOpen && user) {
            fetchReadyDocuments()
        }
    }, [isOpen, user])

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCurrentStep('document-selection')
            setSelectedDocument(null)
            setSigners([])
            setSigningOrder('sequential')
            setError('')
            setMessage('Please review and sign this document.')
            setDueDate('')
        }
    }, [isOpen])

    const fetchReadyDocuments = async () => {
        if (!user) return

        setLoading(true)
        setError('')

        try {
            const allDocuments = await DriveService.getDocumentTemplates(user.id)
            const ready = allDocuments.filter(doc => doc.status === 'ready')
            setReadyDocuments(ready)

            if (ready.length === 0) {
                setError('No documents are ready for signature. Please prepare documents in Drive first.')
            }
        } catch (err) {
            console.error('Error fetching ready documents:', err)
            setError('Failed to load documents. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleDocumentSelect = (document: DocumentTemplate) => {
        setSelectedDocument(document)

        // Configure signers based on document signature type
        if (document.signature_type === 'single') {
            setSigners([{ id: '1', name: '', email: '', status: 'pending' }])
            // No signing order needed for single signature
        } else if (document.signature_type === 'multi') {
            // For multi-signature, check if we can determine signer count from schemas
            const signatureFields = document.schemas?.filter(schema =>
                schema.type === 'signature' || (schema as any).properties?.type === 'signature'
            ) || []

            const signerCount = signatureFields.length > 0 ? signatureFields.length : 2
            const initialSigners = Array.from({ length: signerCount }, (_, index) => ({
                id: (index + 1).toString(),
                name: '',
                email: '',
                status: 'pending' as const
            }))
            setSigners(initialSigners)
            // Set default signing order for multi-signature
            setSigningOrder('sequential')
        } else {
            // No signature type defined, default to single signer
            setSigners([{ id: '1', name: '', email: '', status: 'pending' }])
        }
    }

    const handleNextStep = () => {
        if (currentStep === 'document-selection' && selectedDocument) {
            setCurrentStep('signer-configuration')
        }
    }

    const handleBackStep = () => {
        if (currentStep === 'signer-configuration') {
            setCurrentStep('document-selection')
        }
    }

    const updateSigner = (id: string, field: keyof Signer, value: string) => {
        setSigners(signers.map(signer =>
            signer.id === id ? { ...signer, [field]: value } : signer
        ))
    }

    const validateSigners = () => {
        return signers.every(signer => signer.email.trim() !== '' && signer.email.includes('@'))
    }

    const sendSignatureRequest = async () => {
        if (!selectedDocument || !validateSigners()) {
            setError('Please fill in all required fields with valid email addresses.')
            return
        }

        setIsSending(true)
        setError('')

        try {
            const requestData: any = {
                documentId: selectedDocument.id,
                documentTitle: selectedDocument.name,
                signers: signers.map(signer => ({
                    name: signer.name,
                    email: signer.email
                })),
                message,
                dueDate
            }

            // Only include signing order for multi-signature documents
            if (selectedDocument.signature_type === 'multi') {
                requestData.signingOrder = signingOrder
            }

            console.log('Sending signature request:', requestData)

            // Call the API to create signature request and send emails
            const response = await fetch('/api/signature-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send signature request')
            }

            console.log('Signature request created successfully:', result.data)

            // Update signers status to 'sent'
            const updatedSigners = signers.map(signer => ({
                ...signer,
                status: 'sent' as const
            }))
            setSigners(updatedSigners)

            if (onSuccess) {
                onSuccess(result.data.id)
            }

            onClose()

        } catch (error) {
            console.error('Failed to send signature request:', error)
            setError(error instanceof Error ? error.message : 'Failed to send signature request. Please try again.')
        } finally {
            setIsSending(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle>Request Signature</CardTitle>
                        <CardDescription>
                            {currentStep === 'document-selection'
                                ? 'Select a document from your Drive'
                                : 'Configure signers for your document'
                            }
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        disabled={isSending}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Document Selection */}
                    {currentStep === 'document-selection' && (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <FileText className="w-4 h-4" />
                                <span>Step 1: Select Document</span>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Loading documents...</span>
                                </div>
                            ) : readyDocuments.length === 0 ? (
                                <div className="text-center py-8">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-600">No documents ready for signature</p>
                                    <p className="text-sm text-gray-500">Prepare documents in Drive first</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {readyDocuments.map((document) => (
                                        <div
                                            key={document.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedDocument?.id === document.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            onClick={() => handleDocumentSelect(document)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{document.name}</h4>
                                                    <p className="text-sm text-gray-500">{document.type}</p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge variant={document.signature_type === 'single' ? 'default' : document.signature_type === 'multi' ? 'secondary' : 'outline'}>
                                                        {document.signature_type === 'single' ? 'Single Signature' :
                                                            document.signature_type === 'multi' ? 'Multi Signature' :
                                                                'No Signatures'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button
                                    onClick={handleNextStep}
                                    disabled={!selectedDocument}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Signer Configuration */}
                    {currentStep === 'signer-configuration' && selectedDocument && (
                        <div className="space-y-6">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Users className="w-4 h-4" />
                                <span>Step 2: Configure Signers</span>
                            </div>

                            {/* Document Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h4 className="font-medium text-blue-900 mb-1">Document: {selectedDocument.name}</h4>
                                <p className="text-sm text-blue-700">
                                    {selectedDocument.signature_type === 'single' ? 'Single signature required' :
                                        selectedDocument.signature_type === 'multi' ? 'Multiple signatures required' :
                                            'No signatures configured'}
                                </p>
                            </div>

                            {/* Signing Order Configuration - Only for multi-signature documents */}
                            {selectedDocument.signature_type === 'multi' && (
                                <div className="space-y-3">
                                    <h4 className="font-medium text-gray-900">Signing Order</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input
                                                type="radio"
                                                name="signingOrder"
                                                value="sequential"
                                                checked={signingOrder === 'sequential'}
                                                onChange={(e) => setSigningOrder(e.target.value as 'sequential')}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900">Signed by Order (Sequential)</div>
                                                <div className="text-sm text-gray-600">
                                                    Signers must sign in the specified order. Next signer can only sign after previous one completes.
                                                </div>
                                            </div>
                                        </label>
                                        <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                            <input
                                                type="radio"
                                                name="signingOrder"
                                                value="parallel"
                                                checked={signingOrder === 'parallel'}
                                                onChange={(e) => setSigningOrder(e.target.value as 'parallel')}
                                                className="mt-1"
                                            />
                                            <div>
                                                <div className="font-medium text-gray-900">Open to Any (Parallel)</div>
                                                <div className="text-sm text-gray-600">
                                                    Any signer can sign at any time. No specific order required.
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Signers */}
                            <div>
                                <div className="mb-4">
                                    <h4 className="font-medium text-gray-900">Signers</h4>
                                    {selectedDocument.signature_type === 'multi' && signingOrder === 'sequential' && signers.length > 1 && (
                                        <p className="text-sm text-blue-600 mt-1">
                                            Signers will be notified in order. Each must complete before the next can sign.
                                        </p>
                                    )}
                                    {selectedDocument.signature_type === 'multi' && signingOrder === 'parallel' && signers.length > 1 && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            All signers will be notified simultaneously and can sign in any order.
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {signers.map((signer, index) => (
                                        <div key={signer.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                                            <div className="flex-shrink-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedDocument.signature_type === 'multi' && signingOrder === 'sequential'
                                                    ? 'bg-blue-100 border-2 border-blue-300'
                                                    : 'bg-gray-100'
                                                    }`}>
                                                    <span className={`text-sm font-medium ${selectedDocument.signature_type === 'multi' && signingOrder === 'sequential'
                                                        ? 'text-blue-700'
                                                        : 'text-gray-600'
                                                        }`}>
                                                        {index + 1}
                                                    </span>
                                                </div>
                                                {selectedDocument.signature_type === 'multi' && signingOrder === 'sequential' && (
                                                    <div className="text-xs text-blue-600 mt-1 text-center">
                                                        Order
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <Input
                                                    placeholder="Signer name"
                                                    value={signer.name}
                                                    onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                                                />
                                                <Input
                                                    type="email"
                                                    placeholder="Email address"
                                                    value={signer.email}
                                                    onChange={(e) => updateSigner(signer.id, 'email', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message (Optional)
                                </label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    placeholder="Add a message for the signers..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
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
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {/* Loading indicator */}
                            {isSending && (
                                <div className="flex items-center justify-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">Sending signature request...</span>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex justify-between pt-4">
                                <Button
                                    variant="outline"
                                    onClick={handleBackStep}
                                    disabled={isSending}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-2" />
                                    Back
                                </Button>
                                <Button
                                    onClick={sendSignatureRequest}
                                    disabled={!validateSigners() || isSending}
                                >
                                    {isSending ? (
                                        <>
                                            <Send className="w-4 h-4 mr-2 animate-pulse" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4 mr-2" />
                                            Request Sign
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

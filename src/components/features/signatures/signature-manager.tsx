'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, Check } from 'lucide-react'
import SignaturePad from './signature-pad'
import { useAuth } from '@/components/providers/secure-auth-provider'

interface Signature {
    id: string
    name: string
    signature_data: string
    is_default: boolean
    created_at: string
}

export default function SignatureManager() {
    const { user } = useAuth()
    const [signatures, setSignatures] = useState<Signature[]>([])
    const [showSignaturePad, setShowSignaturePad] = useState(false)
    const [editingSignature, setEditingSignature] = useState<Signature | null>(null)
    const [loading, setLoading] = useState(true)

    const loadSignatures = useCallback(async () => {
        if (!user?.id) {
            console.log('No user found, skipping signature load')
            return
        }

        console.log('Loading signatures for user:', user.id)
        setLoading(true)

        try {
            const response = await fetch('/api/signatures', {
                method: 'GET',
                credentials: 'include',
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()

            if (result.success) {
                setSignatures(result.data || [])
            } else {
                throw new Error(result.error || 'Failed to load signatures')
            }
        } catch (error) {
            console.error('Failed to load signatures:', error)
            setSignatures([])
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        loadSignatures()
    }, [user, loadSignatures])

    const handleSaveSignature = async (signatureData: string) => {
        if (!user?.id) {
            alert('User not authenticated. Please log in and try again.')
            return
        }

        try {
            const signatureName = editingSignature
                ? editingSignature.name
                : `Signature ${signatures.length + 1}`

            if (editingSignature) {
                // Update existing signature
                const response = await fetch(`/api/signatures/${editingSignature.id}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ signature_data: signatureData })
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const result = await response.json()
                if (!result.success) {
                    throw new Error(result.error || 'Failed to update signature')
                }
            } else {
                // Create new signature
                const response = await fetch('/api/signatures', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: signatureName,
                        signature_data: signatureData,
                        is_default: signatures.length === 0 // First signature is default
                    })
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`)
                }

                const result = await response.json()
                if (!result.success) {
                    throw new Error(result.error || 'Failed to create signature')
                }
            }

            setShowSignaturePad(false)
            setEditingSignature(null)
            loadSignatures()
        } catch (error) {
            console.error('Failed to save signature:', error)
            alert('Failed to save signature. Please try again.')
        }
    }

    const handleDeleteSignature = async (signatureId: string) => {
        if (!confirm('Are you sure you want to delete this signature?')) return

        try {
            if (!user?.id) {
                alert('User not authenticated. Please log in and try again.')
                return
            }

            const response = await fetch(`/api/signatures/${signatureId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete signature')
            }

            loadSignatures()
        } catch (error) {
            console.error('Failed to delete signature:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            alert(`Failed to delete signature: ${errorMessage}. Please try again.`)
        }
    }

    const handleSetDefault = async (signatureId: string) => {
        try {
            if (!user?.id) {
                alert('User not authenticated. Please log in and try again.')
                return
            }

            console.log('Setting default signature:', { signatureId, userId: user.id })

            const response = await fetch(`/api/signatures/${signatureId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_default: true })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const result = await response.json()
            if (!result.success) {
                throw new Error(result.error || 'Failed to set default signature')
            }

            console.log('Successfully set default signature')
            loadSignatures()
        } catch (error) {
            console.error('Failed to set default signature:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            alert(`Failed to set default signature: ${errorMessage}. Please try again.`)
        }
    }

    const handleEditSignature = (signature: Signature) => {
        setEditingSignature(signature)
        setShowSignaturePad(true)
    }

    const handleCancel = () => {
        setShowSignaturePad(false)
        setEditingSignature(null)
    }

    if (showSignaturePad) {
        return (
            <div className="max-w-2xl mx-auto">
                <SignaturePad
                    onSave={handleSaveSignature}
                    onCancel={handleCancel}
                    existingSignature={editingSignature?.signature_data}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Signatures</h1>
                    <p className="text-gray-600">Manage your digital signatures</p>
                </div>
                <Button onClick={() => setShowSignaturePad(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Signature
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading signatures...</span>
                </div>
            ) : signatures.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {signatures.map((signature) => (
                        <Card key={signature.id} className={`relative ${signature.is_default ? 'ring-2 ring-blue-500' : ''}`}>
                            {signature.is_default && (
                                <div className="absolute -top-2 -right-2">
                                    <span className="bg-blue-500 text-white px-2 py-1 text-xs font-medium rounded-full">
                                        Default
                                    </span>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-lg">{signature.name}</CardTitle>
                                <CardDescription>
                                    Created {new Date(signature.created_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="relative bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200 h-20">
                                    <Image
                                        fill
                                        src={signature.signature_data}
                                        alt={signature.name}
                                        className="object-contain mx-auto"
                                        sizes="100vw"
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditSignature(signature)}
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>

                                    {!signature.is_default && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSetDefault(signature.id)}
                                        >
                                            <Check className="w-4 h-4 mr-1" />
                                            Set Default
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteSignature(signature.id)}
                                        className="text-red-600 hover:text-red-700"
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Plus className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No signatures yet</h3>
                        <p className="text-gray-500 mb-4">Create your first digital signature to get started</p>
                        <Button onClick={() => setShowSignaturePad(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Signature
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
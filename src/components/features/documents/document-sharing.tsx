'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Share2,
    Copy,
    Mail,
    Users,
    Clock,
    CheckCircle,
    X,
    Plus,
    Send
} from 'lucide-react'
import { useAuth } from '@/components/providers/secure-auth-provider'
import { supabase } from '@/lib/supabase'

interface DocumentSharingProps {
    documentId: string
    documentName: string
    onClose: () => void
}

interface Recipient {
    id: string
    email: string
    status: 'pending' | 'viewed' | 'signed'
    invited_at: string
    viewed_at?: string
    signed_at?: string
}

export default function DocumentSharing({
    documentId,
    documentName,
    onClose
}: DocumentSharingProps) {
    const { user } = useAuth()
    const [recipients, setRecipients] = useState<Recipient[]>([])
    const [newEmail, setNewEmail] = useState('')
    const [message, setMessage] = useState('')
    const [shareLink, setShareLink] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const generateShareLink = () => {
        const baseUrl = window.location.origin
        const link = `${baseUrl}/sign/${documentId}?token=${btoa(documentId + Date.now())}`
        setShareLink(link)
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareLink)
            alert('Link copied to clipboard!')
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const addRecipient = () => {
        if (!newEmail.trim()) return

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(newEmail)) {
            setError('Please enter a valid email address')
            return
        }

        if (recipients.some(r => r.email === newEmail)) {
            setError('This email is already added')
            return
        }

        const newRecipient: Recipient = {
            id: Date.now().toString(),
            email: newEmail,
            status: 'pending',
            invited_at: new Date().toISOString()
        }

        setRecipients([...recipients, newRecipient])
        setNewEmail('')
        setError('')
    }

    const removeRecipient = (id: string) => {
        setRecipients(recipients.filter(r => r.id !== id))
    }

    const sendInvitations = async () => {
        if (recipients.length === 0) {
            setError('Please add at least one recipient')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Generate share link if not already generated
            if (!shareLink) {
                generateShareLink()
            }

            // Save recipients to database
            const { error: dbError } = await supabase
                .from('document_recipients')
                .insert(
                    recipients.map(recipient => ({
                        document_id: documentId,
                        email: recipient.email,
                        status: 'pending',
                        invited_at: new Date().toISOString(),
                        invited_by: user?.id
                    }))
                )

            if (dbError) throw dbError

            // Send email invitations (mock implementation)
            for (const recipient of recipients) {
                console.log(`Sending invitation to ${recipient.email}`)
                // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
            }

            alert(`Invitations sent to ${recipients.length} recipient(s)!`)
            onClose()
        } catch (err) {
            console.error('Failed to send invitations:', err)
            setError('Failed to send invitations. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: Recipient['status']) => {
        const variants = {
            pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
            viewed: { variant: 'outline' as const, icon: CheckCircle, color: 'text-blue-600' },
            signed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' }
        }

        const config = variants[status]
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${config.color}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        )
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Share2 className="w-5 h-5" />
                                Share Document
                            </CardTitle>
                            <CardDescription>
                                Share &ldquo;{documentName}&rdquo; with others for signing
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Share Link Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Share Link</Label>
                        <div className="flex gap-2">
                            <Input
                                value={shareLink}
                                placeholder="Click 'Generate Link' to create a shareable link"
                                readOnly
                                className="flex-1"
                            />
                            {!shareLink ? (
                                <Button onClick={generateShareLink} variant="outline">
                                    Generate Link
                                </Button>
                            ) : (
                                <Button onClick={copyToClipboard} variant="outline">
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            Anyone with this link can view and sign the document
                        </p>
                    </div>

                    {/* Add Recipients Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Invite by Email</Label>
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter email address"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                                className="flex-1"
                            />
                            <Button onClick={addRecipient} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    </div>

                    {/* Recipients List */}
                    {recipients.length > 0 && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Recipients ({recipients.length})
                            </Label>
                            <div className="space-y-2">
                                {recipients.map((recipient) => (
                                    <div key={recipient.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                                {recipient.email.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{recipient.email}</p>
                                                <p className="text-xs text-gray-500">
                                                    Invited {new Date(recipient.invited_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(recipient.status)}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeRecipient(recipient.id)}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Message Section */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Message (Optional)</Label>
                        <textarea
                            className="w-full p-3 border rounded-md resize-none"
                            rows={3}
                            placeholder="Add a personal message to your invitation..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            onClick={sendInvitations}
                            disabled={loading || recipients.length === 0}
                            className="flex-1"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            Send Invitations
                        </Button>
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Share2, Settings } from 'lucide-react'
import { DocumentUpload } from '@/components/features/send/document-upload'
import { CreateLinkModal } from '@/components/features/send/create-link-modal'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function UploadPage() {
  const router = useRouter()
  const [uploadedDocument, setUploadedDocument] = useState<any>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const handleUploadComplete = (documentId: string, documentData: any) => {
    console.log('Upload complete:', documentId, documentData)
    setUploadedDocument({ id: documentId, ...documentData })
    // Automatically show link creation modal
    setShowLinkModal(true)
  }

  const handleLinkCreated = (linkData: any) => {
    console.log('Link created:', linkData)
    setShowLinkModal(false)
    // Redirect to analytics page
    router.push(`/send/analytics/${uploadedDocument.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <Breadcrumb
          items={[
            { label: 'Upload Document' }
          ]}
        />

        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
          <p className="text-gray-600 mt-1">
            Share documents securely and track engagement
          </p>
        </div>

        {/* Upload Section */}
        <DocumentUpload
          onUploadComplete={handleUploadComplete}
          maxFileSize={100}
          showHeader={false}
        />

        {/* Features Info */}
        {!uploadedDocument && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <Share2 className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle className="text-lg">Secure Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Generate secure, trackable links with password protection and expiration dates.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg">Real-time Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Track who views your documents, how long they spend, and which pages they engage with.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-lg">Access Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Control access with email verification, NDAs, and custom permissions.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Success State */}
        {uploadedDocument && !showLinkModal && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Upload Successful!</CardTitle>
              <CardDescription className="text-green-700">
                Your document has been uploaded. What would you like to do next?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => setShowLinkModal(true)}
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Create Share Link
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/send/analytics/${uploadedDocument.id}`)}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Document Details
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push('/send/documents')}
                className="w-full"
              >
                Go to Document Library
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Link Modal */}
      <Dialog open={showLinkModal && !!uploadedDocument} onOpenChange={(open) => {
        if (!open) setShowLinkModal(false)
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>
              Share Document: {uploadedDocument?.title || uploadedDocument?.file_name}
            </DialogTitle>
          </DialogHeader>
          {uploadedDocument && (
            <CreateLinkModal
              documentId={uploadedDocument.id}
              documentTitle={uploadedDocument.title || uploadedDocument.file_name}
              onClose={() => setShowLinkModal(false)}
              onLinkCreated={handleLinkCreated}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


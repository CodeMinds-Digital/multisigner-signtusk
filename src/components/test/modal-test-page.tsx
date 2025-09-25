'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Modal, ConfirmationModal, LoadingModal } from '@/components/ui/modal'
import { PDFSigningScreen } from '@/components/features/documents/pdf-signing-screen'
import { TOTPVerificationPopup } from '@/components/features/auth/totp-verification-popup'

export function ModalTestPage() {
  const [showPDFSigning, setShowPDFSigning] = useState(false)
  const [showTOTP, setShowTOTP] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [showNestedModal, setShowNestedModal] = useState(false)

  // Mock data for PDF signing
  const mockRequest = {
    id: 'test-request-123',
    title: 'Test Document for Signing',
    document_url: '/sample.pdf',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    signers: [
      {
        id: 'user1@example.com',
        name: 'John Doe',
        email: 'user1@example.com',
        status: 'pending',
        signing_order: 1
      },
      {
        id: 'user2@example.com',
        name: 'Jane Smith',
        email: 'user2@example.com',
        status: 'pending',
        signing_order: 2
      }
    ]
  }

  const handleSign = (signatureData: any) => {
    console.log('Signature data:', signatureData)
    alert('Document signed successfully!')
    setShowPDFSigning(false)
  }

  const handleDecline = (reason: string) => {
    console.log('Decline reason:', reason)
    alert(`Document declined: ${reason}`)
    setShowPDFSigning(false)
  }

  const handleTOTPVerified = () => {
    console.log('TOTP verified')
    alert('TOTP verification successful!')
    setShowTOTP(false)
  }

  const testLoadingModal = () => {
    setShowLoading(true)
    setTimeout(() => setShowLoading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modal System Test Page</h1>
          <p className="text-gray-600">Test all modal components and their interactions</p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>PDF Signing Modal</CardTitle>
              <CardDescription>Test the main PDF signing interface</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowPDFSigning(true)} className="w-full">
                Open PDF Signing
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>TOTP Verification</CardTitle>
              <CardDescription>Test TOTP popup overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowTOTP(true)} className="w-full">
                Open TOTP Popup
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confirmation Modal</CardTitle>
              <CardDescription>Test confirmation dialog</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowConfirmation(true)} className="w-full">
                Open Confirmation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loading Modal</CardTitle>
              <CardDescription>Test loading overlay (3 seconds)</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={testLoadingModal} className="w-full">
                Show Loading
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nested Modals</CardTitle>
              <CardDescription>Test modal stacking</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowNestedModal(true)} className="w-full">
                Open Nested Modal
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Combined Test</CardTitle>
              <CardDescription>Open PDF + TOTP together</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => {
                  setShowPDFSigning(true)
                  setTimeout(() => setShowTOTP(true), 1000)
                }} 
                className="w-full"
              >
                Test Combination
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">PDF Signing Modal Tests:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Verify Accept & Sign and Decline buttons are always visible</li>
                <li>Test scrolling in the sidebar on small screens</li>
                <li>Check responsive layout on mobile devices</li>
                <li>Ensure PDF iframe displays correctly</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Modal System Tests:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Test ESC key to close modals</li>
                <li>Verify backdrop click behavior</li>
                <li>Check z-index stacking with multiple modals</li>
                <li>Ensure body scroll is locked when modals are open</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        {showPDFSigning && (
          <PDFSigningScreen
            request={mockRequest}
            currentUserEmail="user1@example.com"
            onClose={() => setShowPDFSigning(false)}
            onSign={handleSign}
            onDecline={handleDecline}
          />
        )}

        <TOTPVerificationPopup
          isOpen={showTOTP}
          onClose={() => setShowTOTP(false)}
          onVerified={handleTOTPVerified}
          context="signing"
          requestId="test-request-123"
          title="Test TOTP Verification"
          description="Enter any 6-digit code for testing"
        />

        <ConfirmationModal
          id="test-confirmation"
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={() => alert('Confirmed!')}
          title="Test Confirmation"
          message="Are you sure you want to perform this action?"
          variant="destructive"
        />

        <LoadingModal
          id="test-loading"
          isOpen={showLoading}
          message="Processing your request..."
        />

        <Modal
          id="nested-modal"
          isOpen={showNestedModal}
          onClose={() => setShowNestedModal(false)}
          title="Nested Modal Test"
          size="lg"
        >
          <div className="p-6 space-y-4">
            <p>This is a nested modal test. You can open more modals from here.</p>
            <div className="space-y-2">
              <Button onClick={() => setShowTOTP(true)} className="w-full">
                Open TOTP from Nested Modal
              </Button>
              <Button onClick={() => setShowConfirmation(true)} className="w-full">
                Open Confirmation from Nested Modal
              </Button>
            </div>
            <div className="h-96 bg-gray-100 rounded p-4 overflow-y-auto">
              <h4 className="font-semibold mb-2">Scrollable Content</h4>
              {Array.from({ length: 50 }, (_, i) => (
                <p key={i} className="text-sm text-gray-600 mb-2">
                  This is line {i + 1} of scrollable content to test modal scrolling behavior.
                </p>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

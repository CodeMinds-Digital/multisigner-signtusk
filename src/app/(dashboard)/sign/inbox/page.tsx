'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnifiedSigningRequestsList } from '@/components/features/documents/unified-signing-requests-list'
import { RequestSignatureModal } from '@/components/features/documents/request-signature-modal'

export default function SignInboxPage() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRequestSuccess = (requestId: string) => {
    setRefreshKey(prev => prev + 1)
    setIsRequestModalOpen(false)
    console.log('Signature request sent successfully:', requestId)
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sign Inbox</h1>
          <p className="text-gray-600">Manage signature requests you&apos;ve sent and received</p>
        </div>
        <Button
          onClick={() => setIsRequestModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Upload className="w-4 h-4 mr-2" />
          Request Signature
        </Button>
      </div>

      <UnifiedSigningRequestsList key={refreshKey} onRefresh={handleRefresh} />

      <RequestSignatureModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  )
}

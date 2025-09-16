'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { SignatureRequest } from '@/components/features/signature/signature-request'

export default function RequestSignaturePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const documentId = searchParams.get('documentId')
  const documentTitle = searchParams.get('title') || 'Document'

  const handleRequestSent = (requestId: string) => {
    // Redirect to sign inbox page with success message
    router.push(`/sign-inbox?success=signature-request&requestId=${requestId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request Signature</h1>
        <p className="text-gray-600">Send your document for digital signature</p>
      </div>

      <SignatureRequest
        documentId={documentId || undefined}
        documentTitle={documentTitle}
        onRequestSent={handleRequestSent}
      />
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { DocumentWorkflow } from '@/components/features/documents/document-workflow'

export default function UploadPage() {
  const router = useRouter()

  const handleWorkflowComplete = (documentId: string) => {
    // Redirect to sign inbox page after successful workflow completion
    router.push(`/sign/inbox?success=true&documentId=${documentId}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Signature Workflow</h1>
        <p className="text-gray-600">Upload and prepare your document for digital signing</p>
      </div>

      <DocumentWorkflow
        onComplete={handleWorkflowComplete}
      />
    </div>
  )
}

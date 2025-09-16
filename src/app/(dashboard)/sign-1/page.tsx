'use client'

import { useState } from 'react'
import Image from 'next/image'
import { SignaturePadComponent } from '@/components/features/signature/signature-pad'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, Download } from 'lucide-react'

export default function SignaturePage() {
  const [signature, setSignature] = useState<string>('')
  const [savedSignatures, setSavedSignatures] = useState<string[]>([])

  const handleSignatureChange = (signatureData: string) => {
    setSignature(signatureData)
  }

  const saveSignature = () => {
    if (signature) {
      setSavedSignatures(prev => [...prev, signature])
      // Here you would typically save to the database
      console.log('Signature saved:', signature)
    }
  }

  const downloadSignature = () => {
    if (signature) {
      const link = document.createElement('a')
      link.download = 'signature.png'
      link.href = signature
      link.click()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Digital Signature</h1>
        <p className="text-gray-600">Create and manage your digital signatures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signature Creation */}
        <div className="space-y-4">
          <SignaturePadComponent
            onSignatureChange={handleSignatureChange}
            width={400}
            height={200}
          />

          <div className="flex gap-2">
            <Button
              onClick={saveSignature}
              disabled={!signature}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Signature
            </Button>
            <Button
              variant="outline"
              onClick={downloadSignature}
              disabled={!signature}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>

        {/* Saved Signatures */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Signatures</CardTitle>
            <CardDescription>
              Your previously saved signatures
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savedSignatures.length > 0 ? (
              <div className="space-y-4">
                {savedSignatures.map((sig, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <Image
                      src={sig}
                      alt={`Signature ${index + 1}`}
                      className="max-w-full h-16 object-contain"
                      width={300}
                      height={64}
                    />
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline">
                        Use This
                      </Button>
                      <Button size="sm" variant="outline">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No saved signatures yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
